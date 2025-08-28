// improved-migration.js - Enhanced migration with path fixing
import mongoose from "mongoose";
import Route from "./models/Route.js";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

// Helper function to match Python's safe_name function
function safeName(name) {
  return name.replace(/[^A-Za-z0-9_\-]/g, "_").substring(0, 50);
}

// Function to find actual directory name by fuzzy matching
async function findActualDirectory(expectedRouteId, framesBasePath) {
  try {
    const framesDirs = fs.readdirSync(framesBasePath, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);
    
    // Direct match first
    if (framesDirs.includes(expectedRouteId)) {
      return expectedRouteId;
    }
    
    // Fuzzy matching
    const expectedParts = expectedRouteId.toLowerCase().replace(/_/g, ' ').split(' ');
    let bestMatch = null;
    let bestScore = 0;
    
    for (const dirName of framesDirs) {
      const dirParts = dirName.toLowerCase().replace(/_/g, ' ');
      let score = 0;
      
      for (const part of expectedParts) {
        if (part.length > 2 && dirParts.includes(part)) {
          score++;
        }
      }
      
      // Calculate match percentage
      const matchPercentage = score / expectedParts.length;
      
      if (matchPercentage > bestScore && matchPercentage >= 0.7) {
        bestScore = matchPercentage;
        bestMatch = dirName;
      }
    }
    
    return bestMatch;
  } catch (error) {
    console.error("Error reading frames directory:", error);
    return null;
  }
}

async function migrateAndFixPaths() {
  try {
    await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/route-db");
    console.log("Connected to MongoDB");

    const framesBasePath = process.env.FRAMES_DIR || "./frames";
    
    if (!fs.existsSync(framesBasePath)) {
      console.error(`Frames directory not found: ${framesBasePath}`);
      return;
    }

    // Find all routes that need migration or path fixing
    const allRoutes = await Route.find({
      start: { $exists: true },
      end: { $exists: true }
    });

    console.log(`Found ${allRoutes.length} routes to check`);

    let migratedCount = 0;
    let pathsFixedCount = 0;
    let errorCount = 0;

    for (let route of allRoutes) {
      try {
        // Generate expected pythonRouteId
        const expectedPythonRouteId = `${safeName(route.start)}_${safeName(route.end)}`;
        let needsUpdate = false;
        let updateData = {};

        // Check if pythonRouteId needs to be set or updated
        if (!route.pythonRouteId || route.pythonRouteId !== expectedPythonRouteId) {
          // Try to find actual directory
          const actualDirName = await findActualDirectory(expectedPythonRouteId, framesBasePath);
          
          if (actualDirName) {
            updateData.pythonRouteId = actualDirName;
            needsUpdate = true;
            console.log(`📁 Route ${route._id}: Using actual directory name "${actualDirName}"`);
          } else {
            updateData.pythonRouteId = expectedPythonRouteId;
            needsUpdate = true;
            console.log(`⚠️  Route ${route._id}: Directory not found, using expected name "${expectedPythonRouteId}"`);
          }
        }

        // Check if frame paths need fixing
        if (route.framesData && route.framesData.length > 0) {
          let framesUpdated = false;
          const actualPythonRouteId = updateData.pythonRouteId || route.pythonRouteId;
          
          const updatedFrames = route.framesData.map((frame, index) => {
            if (frame.filename) {
              // Convert Windows paths to cross-platform paths
              let normalizedPath = frame.filename.replace(/\\/g, '/');
              
              // Check if path contains old route ID pattern and update it
              const pathParts = normalizedPath.split('/');
              const framesDirIndex = pathParts.findIndex(part => part === 'frames');
              
              if (framesDirIndex >= 0 && pathParts[framesDirIndex + 1] !== actualPythonRouteId) {
                pathParts[framesDirIndex + 1] = actualPythonRouteId;
                const newPath = pathParts.join('/');
                
                // Convert back to Windows path if original was Windows
                const finalPath = process.platform === 'win32' ? newPath.replace(/\//g, '\\') : newPath;
                
                if (finalPath !== frame.filename) {
                  framesUpdated = true;
                  return { ...frame, filename: finalPath };
                }
              }
            }
            return frame;
          });

          if (framesUpdated) {
            updateData.framesData = updatedFrames;
            needsUpdate = true;
            pathsFixedCount++;
          }
        }

        // Apply updates if needed
        if (needsUpdate) {
          await Route.findByIdAndUpdate(route._id, updateData);
          migratedCount++;
          console.log(`✅ Updated route ${route._id}: "${route.start}" -> "${route.end}"`);
        }

      } catch (updateError) {
        console.error(`❌ Error updating route ${route._id}:`, updateError.message);
        errorCount++;
      }
    }

    console.log(`\nMigration Summary:`);
    console.log(`- Total routes checked: ${allRoutes.length}`);
    console.log(`- Routes updated: ${migratedCount}`);
    console.log(`- Routes with paths fixed: ${pathsFixedCount}`);
    console.log(`- Errors: ${errorCount}`);

    // Verify migration
    const routesWithPythonId = await Route.countDocuments({ pythonRouteId: { $exists: true } });
    
    console.log(`\nVerification:`);
    console.log(`- Routes with pythonRouteId: ${routesWithPythonId}`);
    console.log(`- Total routes in database: ${allRoutes.length}`);

  } catch (error) {
    console.error("Migration failed:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  }
}

// Function to validate all frame paths
async function validateFramePaths() {
  try {
    await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/route-db");
    console.log("Connected to MongoDB for path validation");

    const routes = await Route.find({ framesData: { $exists: true, $not: { $size: 0 } } });
    
    console.log(`Validating frame paths for ${routes.length} routes...`);

    let totalFrames = 0;
    let validPaths = 0;
    let invalidPaths = 0;

    for (const route of routes) {
      for (const frame of route.framesData) {
        if (frame.filename) {
          totalFrames++;
          
          // Convert path separators for current platform
          const normalizedPath = frame.filename.replace(/[\\\/]/g, path.sep);
          
          if (fs.existsSync(normalizedPath)) {
            validPaths++;
          } else {
            invalidPaths++;
            console.log(`❌ Missing file: ${frame.filename}`);
          }
        }
      }
    }

    console.log(`\nPath Validation Summary:`);
    console.log(`- Total frame paths: ${totalFrames}`);
    console.log(`- Valid paths: ${validPaths}`);
    console.log(`- Invalid paths: ${invalidPaths}`);
    console.log(`- Success rate: ${((validPaths / totalFrames) * 100).toFixed(1)}%`);

  } catch (error) {
    console.error("Path validation failed:", error);
  } finally {
    await mongoose.disconnect();
  }
}

// Export functions
export { migrateAndFixPaths, validateFramePaths };

// Command line interface
if (process.argv[1] && process.argv[1].endsWith("migration.js")) {
  const command = process.argv[2] || "migrate";

  switch (command) {
    case "migrate":
      migrateAndFixPaths();
      break;
    case "validate":
      validateFramePaths();
      break;
    case "both":
      (async () => {
        await migrateAndFixPaths();
        await validateFramePaths();
      })();
      break;
    default:
      console.log("Usage:");
      console.log("  node improved-migration.js migrate   - Fix pythonRouteId and frame paths");
      console.log("  node improved-migration.js validate  - Validate all frame paths exist");
      console.log("  node improved-migration.js both      - Run migration then validation");
  }
}