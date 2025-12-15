import axios from "axios";
import Route from "../models/Route.js";
import dotenv from "dotenv";
import { promises as fs } from 'fs';
import path from 'path';

dotenv.config();

const PYTHON_SERVICE = process.env.PYTHON_SERVICE;

// Helper function to match Python's safe_name function
function safeName(name) {
  return name.replace(/[^A-Za-z0-9_\-]/g, "_").substring(0, 50);
}

// Helper function to generate consistent route identifier
function generateRouteIdentifier(start, end) {
  return `${safeName(start)}_${safeName(end)}`;
}

// ----------------------
// Check for Existing Route and Video with Enhanced Alerts
// ----------------------
export const checkExistingRoute = async (req, res) => {
  try {
    const { start, end, interpolation_factor, video_fps, video_quality } = req.body;
    
    const routeIdentifier = generateRouteIdentifier(start, end);
    
    // Search for existing route with matching parameters
    const existingRoute = await Route.findOne({
      start: start.trim(),
      end: end.trim(),
      interpolated: true,
      videoGenerated: true,
      'videoStats.fps': video_fps,
      'videoStats.quality': video_quality 
    }).sort({ createdAt: -1 });
    
    if (existingRoute && existingRoute.videoFilename) {
      console.log("✅ Found existing route with video in database:", existingRoute._id);
      
      try {
        // Verify video file still exists in Python service
        const videoCheckResponse = await axios.get(
          `${PYTHON_SERVICE}/check_video/${existingRoute.pythonRouteId}/${existingRoute.videoFilename}`,
          { timeout: 5000 }
        );
        
        if (videoCheckResponse.data.exists) {
          console.log("✅ Video file confirmed, returning cached result");
          
          return res.json({
            cached: true,
            route: existingRoute,
            video_info: {
              filename: existingRoute.videoFilename,
              source_type: existingRoute.videoStats?.source_type || "interpolated",
              file_size_mb: existingRoute.videoStats?.file_size_mb,
              video_stats: existingRoute.videoStats,
              video_url: `${PYTHON_SERVICE}/videos/${existingRoute.pythonRouteId}/${existingRoute.videoFilename}`
            },
            navigation_stats: {
              total_turns: existingRoute.navigationMetadata?.totalTurns || 0,
              total_alerts: existingRoute.framesData?.filter(f => f.alert)?.length || 0,
              total_landmarks: existingRoute.navigationMetadata?.totalLandmarks || 0
            }
          });
        }
      } catch (videoCheckError) {
        console.log("⚠️ Video verification failed, will regenerate:", videoCheckError.message);
      }
    }
    
    // Check Python service for existing route
    try {
      const pythonCheckResponse = await axios.post(`${PYTHON_SERVICE}/check_existing_route`, {
        start,
        end,
        interpolation_factor,
        video_fps,
        video_quality
      });
      
      if (pythonCheckResponse.data.exists && pythonCheckResponse.data.video_available) {
        console.log("✅ Found existing route in Python service");
        
        const framesWithAlerts = pythonCheckResponse.data.frames || [];
        const alertCount = framesWithAlerts.filter(f => f.alert).length;
        const landmarkCount = framesWithAlerts.filter(f => f.alertType === 'landmark').length;
        
        const cachedRouteData = {
          start: start.trim(),
          end: end.trim(),
          pythonRouteId: pythonCheckResponse.data.route_id,
          framesData: framesWithAlerts,
          processed: true,
          interpolated: true,
          interpolationFactor: interpolation_factor,
          videoGenerated: true,
          videoPath: pythonCheckResponse.data.video_path,
          videoFilename: pythonCheckResponse.data.video_filename,
          videoStats: pythonCheckResponse.data.video_stats,
          processingStats: pythonCheckResponse.data.processing_stats,
          navigationMetadata: {
            totalTurns: pythonCheckResponse.data.processing_stats?.total_turns || 0,
            totalLandmarks: landmarkCount,
            alertedFrames: alertCount,
            routeDuration: 0,
            routeDistance: 0
          },
          alertsEnabled: true,
          processedAt: new Date(),
          videoGeneratedAt: new Date()
        };
        
        let savedRoute;
        if (existingRoute) {
          savedRoute = await Route.findByIdAndUpdate(
            existingRoute._id,
            { $set: cachedRouteData },
            { new: true, runValidators: true }
          );
        } else {
          const newRoute = new Route({
            userId: req.body.userId,
            ...cachedRouteData
          });
          savedRoute = await newRoute.save();
        }
        
        return res.json({
          cached: true,
          route: savedRoute,
          video_info: {
            filename: pythonCheckResponse.data.video_filename,
            source_type: pythonCheckResponse.data.video_stats?.source_type || "interpolated",
            file_size_mb: pythonCheckResponse.data.video_stats?.file_size_mb,
            video_stats: pythonCheckResponse.data.video_stats,
            video_url: `${PYTHON_SERVICE}/videos/${pythonCheckResponse.data.route_id}/${pythonCheckResponse.data.video_filename}`
          },
          navigation_stats: {
            total_turns: pythonCheckResponse.data.processing_stats?.total_turns || 0,
            total_alerts: alertCount,
            total_landmarks: landmarkCount
          }
        });
      }
    } catch (pythonCheckError) {
      console.log("⚠️ Python service cache check failed:", pythonCheckError.message);
    }
    
    return res.json({
      cached: false,
      message: "No existing route found, proceed with generation"
    });
    
  } catch (err) {
    console.error("❌ Error checking existing route:", err.message);
    res.status(500).json({ error: "Failed to check existing route" });
  }
};

// ----------------------
// Generate Route with Enhanced Alerts (120m turns, 200m landmarks)
// ----------------------
export const generateRoute = async (req, res) => {
  try {
    const { userId, start, end, enable_alerts = true } = req.body;

    console.log(`🚀 Generating route with enhanced alerts (120m turns, 200m landmarks): ${enable_alerts}`);

    const pyResp = await axios.post(`${PYTHON_SERVICE}/generate_frames`, {
      start,
      end,
      enable_alerts: enable_alerts
    });

    if (pyResp.data.error) {
      return res.status(400).json({
        error: pyResp.data.error,
        message: pyResp.data.message || "Error from Python service",
      });
    }

    const frames = pyResp.data.frames || [];
    const landmarkCount = frames.filter(f => f.alertType === 'landmark').length;

    const newRoute = new Route({
      userId,
      start,
      end,
      pythonRouteId: pyResp.data.route_id,
      framesData: frames,
      voHeadings: pyResp.data.vo_headings,
      directionsData: pyResp.data.directions_data,
      navigationMetadata: {
        totalTurns: pyResp.data.navigation_stats?.total_turns || 0,
        totalLandmarks: landmarkCount,
        alertedFrames: pyResp.data.navigation_stats?.total_alerts || 0,
        routeDuration: 0,
        routeDistance: 0
      },
      alertsEnabled: enable_alerts
    });

    const savedRoute = await newRoute.save();
    console.log(`✅ Route saved with ${pyResp.data.navigation_stats?.total_alerts || 0} alerts (${landmarkCount} landmarks)`);

    res.json({ 
      route: savedRoute,
      navigation_stats: {
        total_turns: pyResp.data.navigation_stats?.total_turns || 0,
        total_alerts: pyResp.data.navigation_stats?.total_alerts || 0,
        total_landmarks: landmarkCount
      }
    });
  } catch (err) {
    console.error("❌ Error generating route:", err.message);
    res.status(500).json({ error: "Failed to generate route" });
  }
};

// ----------------------
// Enhanced Complete Pipeline with Caching and Early Alerts
// ----------------------
export const processCompletePipelineWithVideoCached = async (req, res) => {
  try {
    const { 
      userId, 
      start, 
      end, 
      interpolation_factor,
      generate_video = true,
      video_fps,
      video_quality,
      enable_alerts = true
    } = req.body;

    console.log("🚀 Smart pipeline with dynamic speed alerts starting...");

    // ✅ STEP 1: Check cache first
    const cacheCheck = await new Promise((resolve) => {
      const mockRes = {
        json: (data) => resolve(data),
        status: () => mockRes
      };
      checkExistingRoute({ 
        body: { start, end, interpolation_factor, video_fps, video_quality, userId } 
      }, mockRes);
    });

    if (cacheCheck.cached) {
      console.log("✅ Cache HIT - Returning cached route with video");
      return res.json({
        route: cacheCheck.route,
        pipeline_success: true,
        cached: true,
        statistics: cacheCheck.route.processingStats || {},
        video_info: cacheCheck.video_info,
        navigation_stats: cacheCheck.navigation_stats
      });
    }

    console.log("🔨 Cache MISS - Processing new route with dynamic speed alerts...");

    // ✅ STEP 2: Generate frames with alert metadata
    const generateResp = await axios.post(`${PYTHON_SERVICE}/generate_frames`, {
      start,
      end,
      enable_alerts: enable_alerts
    });

    if (generateResp.data.error) {
      return res.status(400).json({
        error: generateResp.data.error,
        message: "Failed to generate frames"
      });
    }

    // ✅ STEP 3: Process complete pipeline (smooth + regenerate + interpolate)
    const pyResp = await axios.post(`${PYTHON_SERVICE}/process_complete_pipeline`, {
      start,
      end,
      interpolation_factor: interpolation_factor,
      enable_alerts: enable_alerts
    });

    if (pyResp.data.error || !pyResp.data.pipeline_success) {
      return res.status(400).json({
        error: pyResp.data.error || "Pipeline failed",
        details: pyResp.data,
      });
    }

    // ✅ STEP 4: Merge alert metadata from generate_frames into final frames
    const framesWithAlerts = pyResp.data.final_frames.map((frame, idx) => {
      const originalFrame = generateResp.data.frames[idx];
      if (originalFrame && originalFrame.alert) {
        return {
          ...frame,
          alert: originalFrame.alert,
          alertType: originalFrame.alertType,
          alertDistance: originalFrame.alertDistance,
          alertIcon: originalFrame.alertIcon,
          category: originalFrame.category
        };
      }
      return frame;
    });

    const alertCount = framesWithAlerts.filter(f => f.alert).length;
    const landmarkCount = framesWithAlerts.filter(f => f.alertType === 'landmark').length;

    // ✅ STEP 5: Save route to MongoDB
    const newRoute = new Route({
      userId,
      start,
      end,
      pythonRouteId: pyResp.data.route_id,
      framesData: framesWithAlerts,
      voHeadings: pyResp.data.vo_headings || [],
      directionsData: generateResp.data.directions_data,
      processed: true,
      interpolated: true,
      interpolationFactor: interpolation_factor,
      processingStats: pyResp.data.statistics,
      navigationMetadata: {
        totalTurns: generateResp.data.navigation_stats?.total_turns || 0,
        totalLandmarks: landmarkCount,
        alertedFrames: alertCount,
        routeDuration: 0,
        routeDistance: 0
      },
      alertsEnabled: enable_alerts,
      processedAt: new Date()
    });

    const savedRoute = await newRoute.save();
    
    // ✅ STEP 6: Save frames data to JSON file for video generation
    try {
      const framesDir = path.join(process.cwd(), '..', 'python-service', 'frames', pyResp.data.route_id, 'smoothed', 'interpolated');
      await fs.mkdir(framesDir, { recursive: true });
      const framesDataPath = path.join(framesDir, 'frames_data.json');
      await fs.writeFile(framesDataPath, JSON.stringify(framesWithAlerts, null, 2));
      console.log(`✅ Saved frames data with alerts to ${framesDataPath}`);
    } catch (fileErr) {
      console.warn(`⚠️ Could not save frames data: ${fileErr.message}`);
    }

    console.log(`✅ Route saved: ${alertCount} alerts (${landmarkCount} landmarks)`);

    let videoResult = null;

    // ✅ STEP 7: Generate video with dynamic speed
    if (generate_video) {
      try {
        console.log("🎬 Generating DYNAMIC SPEED video...");
        
        const videoResp = await axios.post(`${PYTHON_SERVICE}/generate_video`, {
          route_id: pyResp.data.route_id,
          fps: video_fps,
          output_format: "mp4",
          quality: video_quality,
          include_interpolated: true,
        });

        if (videoResp.data.success) {
          // ✅ Update route with video info
          await Route.findByIdAndUpdate(
            savedRoute._id,
            { 
              $set: { 
                videoGenerated: true,
                videoPath: videoResp.data.video_path,
                videoFilename: videoResp.data.video_filename,
                videoStats: {
                  source_type: videoResp.data.video_stats?.source_type || "interpolated",
                  file_size_mb: videoResp.data.video_stats?.file_size_mb,
                  fps: video_fps,
                  quality: video_quality,
                  speed_type: "dynamic",
                  ...videoResp.data.video_stats
                },
                videoGeneratedAt: new Date()
              } 
            }
          );

          videoResult = {
            filename: videoResp.data.video_filename,
            video_stats: videoResp.data.video_stats,
            video_url: `${PYTHON_SERVICE}/videos/${pyResp.data.route_id}/${videoResp.data.video_filename}`
          };

          console.log("✅ Dynamic speed video generated!");
        }
      } catch (videoErr) {
        console.error("❌ Video generation error:", videoErr.message);
      }
    }

    const finalRoute = await Route.findById(savedRoute._id);

    res.json({
      route: finalRoute,
      pipeline_success: true,
      cached: false,
      statistics: pyResp.data.statistics,
      video_info: videoResult,
      navigation_stats: {
        total_turns: generateResp.data.navigation_stats?.total_turns || 0,
        total_alerts: alertCount,
        total_landmarks: landmarkCount
      }
    });

  } catch (err) {
    console.error("❌ Error in smart pipeline:", err.message);
    res.status(500).json({ error: "Failed to process pipeline" });
  }
};

// ----------------------
// Get Enhanced Navigation Alerts for Route
// ----------------------
export const getRouteNavigationAlerts = async (req, res) => {
  try {
    const { routeId } = req.params;

    const route = await Route.findById(routeId);
    if (!route) {
      return res.status(404).json({ error: "Route not found" });
    }

    const alerts = route.framesData
      .filter(frame => frame.alert)
      .map((frame, idx) => ({
        frameIndex: idx,
        alert: frame.alert,
        alertType: frame.alertType,
        alertDistance: frame.alertDistance,
        alertIcon: frame.alertIcon,
        category: frame.category || null,
        location: { lat: frame.lat, lon: frame.lon }
      }));

    const alertsByType = alerts.reduce((acc, alert) => {
      const type = alert.alertType || 'other';
      if (!acc[type]) acc[type] = [];
      acc[type].push(alert);
      return acc;
    }, {});

    const turnAlerts = alerts.filter(a => a.alertType === 'turn');
    const landmarkAlerts = alerts.filter(a => a.alertType === 'landmark');

    res.json({
      route_id: routeId,
      total_alerts: alerts.length,
      turn_alerts: turnAlerts.length,
      landmark_alerts: landmarkAlerts.length,
      alerts_by_type: alertsByType,
      all_alerts: alerts,
      navigation_metadata: {
        ...route.navigationMetadata,
        alert_detection_ranges: {
          turns: "120 meters",
          landmarks: "200 meters"
        }
      }
    });

  } catch (err) {
    console.error("❌ Error getting navigation alerts:", err.message);
    res.status(500).json({ error: "Failed to get navigation alerts" });
  }
};

// ----------------------
// Original functions remain the same
// ----------------------
export const smoothRoute = async (req, res) => {
  try {
    const { routeId } = req.params;

    const route = await Route.findById(routeId);
    if (!route) {
      return res.status(404).json({ error: "Route not found" });
    }

    const pythonRouteId = route.pythonRouteId;

    const pyResp = await axios.post(`${PYTHON_SERVICE}/smooth`, {
      route_id: pythonRouteId,
      frames: route.framesData,
    });

    if (!pyResp.data.smoothed) {
      return res
        .status(400)
        .json({ error: "Smoothing failed or no frames returned" });
    }

    const updateOperations = {};
    pyResp.data.frames.forEach((frame, idx) => {
      if (route.framesData[idx]) {
        updateOperations[`framesData.${idx}.smoothedHeading`] = frame.smoothedHeading;
      }
    });

    const updatedRoute = await Route.findByIdAndUpdate(
      routeId,
      { $set: updateOperations },
      { new: true, runValidators: true }
    );

    if (!updatedRoute) {
      return res.status(404).json({ error: "Route not found after update" });
    }

    const smoothedHeadings = updatedRoute.framesData.map(f => f.smoothedHeading);
    console.log("✅ Successfully updated smoothed headings count:", smoothedHeadings.filter(h => h !== null && h !== undefined).length);
    
    res.json({ route: updatedRoute });
  } catch (err) {
    console.error("❌ Error smoothing route:", err.message);
    console.error("Full error:", err);
    res.status(500).json({ error: "Failed to smooth route" });
  }
};

export const regenerateFrames = async (req, res) => {
  try {
    const { routeId } = req.params;

    const route = await Route.findById(routeId);
    if (!route) {
      return res.status(404).json({ error: "Route not found" });
    }

    const hasSmoothedHeadings = route.framesData.some(frame => 
      frame.smoothedHeading !== null && frame.smoothedHeading !== undefined
    );

    if (!hasSmoothedHeadings) {
      return res.status(400).json({ 
        error: "No smoothed headings found. Please smooth the route first." 
      });
    }

    console.log("🔄 Regenerating frames with smoothed headings (preserving alerts)...");

    const pythonRouteId = route.pythonRouteId;

    const pyResp = await axios.post(`${PYTHON_SERVICE}/regenerate_frames`, {
      route_id: pythonRouteId,
      frames: route.framesData,
    });

    if (pyResp.data.error) {
      return res.status(400).json({
        error: pyResp.data.error,
        message: pyResp.data.message || "Error regenerating frames",
      });
    }

    const updateOperations = {};
    pyResp.data.frames.forEach((frame, idx) => {
      if (route.framesData[idx] && frame.filename) {
        updateOperations[`framesData.${idx}.filename`] = frame.filename;
      }
    });

    const updatedRoute = await Route.findByIdAndUpdate(
      routeId,
      { $set: updateOperations },
      { new: true, runValidators: true }
    );

    if (!updatedRoute) {
      return res.status(404).json({ error: "Route not found after update" });
    }

    const alertCount = updatedRoute.framesData.filter(f => f.alert).length;
    console.log(`✅ Successfully regenerated frames with smoothed headings (${alertCount} alerts preserved)`);
    
    res.json({ 
      route: updatedRoute,
      regenerated_count: pyResp.data.regenerated_count || 0,
      alerts_preserved: alertCount
    });
  } catch (err) {
    console.error("❌ Error regenerating frames:", err.message);
    res.status(500).json({ error: "Failed to regenerate frames" });
  }
};

export const interpolateFrames = async (req, res) => {
  try {
    const { routeId } = req.params;
    const { interpolation_factor = 2 } = req.body;

    console.log(`🔄 Interpolation request for route ${routeId} with factor ${interpolation_factor}`);

    const route = await Route.findById(routeId);
    if (!route) {
      return res.status(404).json({ error: "Route not found" });
    }

    console.log(`📊 Route found - Start: ${route.start}, End: ${route.end}`);
    console.log(`📊 Route pythonRouteId: ${route.pythonRouteId}`);
    console.log(`📊 Total frames in route: ${route.framesData?.length || 0}`);

    if (!route.pythonRouteId) {
      return res.status(400).json({ 
        error: "Route missing pythonRouteId. Please run database migration or regenerate route.",
        suggestion: "Run the migration script to update existing routes with pythonRouteId field"
      });
    }

    const validFrames = route.framesData.filter(frame => 
      frame.filename && frame.filename.length > 0
    );

    console.log(`📊 Valid frames with filenames: ${validFrames.length}`);
    
    if (validFrames.length > 0) {
      console.log(`📊 Sample frame paths:`);
      validFrames.slice(0, 3).forEach((frame, idx) => {
        console.log(`  Frame ${idx + 1}: ${frame.filename}`);
      });
    }

    if (validFrames.length < 2) {
      return res.status(400).json({ 
        error: "Need at least 2 frames with valid filenames for interpolation",
        details: {
          total_frames: route.framesData?.length || 0,
          frames_with_filenames: validFrames.length,
          python_route_id: route.pythonRouteId
        }
      });
    }

    console.log(`🚀 Starting optical flow interpolation with factor ${interpolation_factor} (preserving alerts)...`);

    const pythonRouteId = route.pythonRouteId;

    console.log(`🔗 Calling Python service with route_id: ${pythonRouteId}`);

    const pyResp = await axios.post(`${PYTHON_SERVICE}/interpolate_frames`, {
      route_id: pythonRouteId,
      frames: route.framesData,
      interpolation_factor: interpolation_factor,
    }, {
      timeout: 300000,
      validateStatus: function (status) {
        return status < 500;
      }
    });

    console.log(`📡 Python service response status: ${pyResp.status}`);

    if (pyResp.data.error) {
      console.error(`❌ ERROR from Python service: ${pyResp.data.error}`);
      return res.status(400).json({
        error: pyResp.data.error,
        message: pyResp.data.message || "Error during optical flow interpolation",
        details: pyResp.data.details || pyResp.data,
        python_route_id: pythonRouteId
      });
    }

    if (!pyResp.data.success) {
      console.error(`❌ Python service returned success=false:`, pyResp.data);
      return res.status(400).json({
        error: "Optical flow interpolation failed",
        details: pyResp.data,
        python_route_id: pythonRouteId
      });
    }

    const updatedRoute = await Route.findByIdAndUpdate(
      routeId,
      { 
        $set: { 
          framesData: pyResp.data.frames,
          interpolated: true,
          interpolationFactor: interpolation_factor,
          interpolatedAt: new Date()
        } 
      },
      { new: true, runValidators: true }
    );

    if (!updatedRoute) {
      return res.status(404).json({ error: "Route not found after update" });
    }

    const alertCount = updatedRoute.framesData.filter(f => f.alert).length;
    console.log("✅ Successfully applied optical flow interpolation");
    console.log(`📊 Original frames: ${pyResp.data.original_count}`);
    console.log(`📊 Interpolated frames: ${pyResp.data.interpolated_count}`);
    console.log(`📊 Total frames: ${pyResp.data.total_count}`);
    console.log(`📊 Average motion consistency: ${pyResp.data.average_consistency?.toFixed(3)}`);
    console.log(`📊 Alerts preserved: ${alertCount}`);
    
    res.json({ 
      route: updatedRoute,
      interpolation_stats: {
        original_count: pyResp.data.original_count,
        interpolated_count: pyResp.data.interpolated_count,
        total_count: pyResp.data.total_count,
        interpolation_factor: interpolation_factor,
        average_consistency: pyResp.data.average_consistency,
        consistency_scores: pyResp.data.consistency_scores,
        alerts_preserved: alertCount
      }
    });
  } catch (err) {
    console.error("❌ Error interpolating frames - Full error:", err);
    console.error("Error message:", err.message);
    console.error("Error response:", err.response?.data);
    
    let errorMessage = "Failed to interpolate frames";
    let errorDetails = {};
    
    if (err.code === 'ECONNREFUSED') {
      errorMessage = "Cannot connect to Python service";
      errorDetails.suggestion = "Make sure Python service is running on http://localhost:8000";
    } else if (err.code === 'ETIMEDOUT') {
      errorMessage = "Python service timeout";
      errorDetails.suggestion = "Processing is taking too long, try with fewer frames or lower interpolation factor";
    } else if (err.response) {
      errorMessage = `Python service error: ${err.response.status}`;
      errorDetails.python_response = err.response.data;
    }
    
    res.status(500).json({ 
      error: errorMessage,
      details: errorDetails,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
};

export const processCompletePipeline = async (req, res) => {
  try {
    const { userId, start, end, interpolation_factor = 2, enable_alerts = true } = req.body;

    console.log("🚀 Starting complete processing pipeline with enhanced alerts");

    const pyResp = await axios.post(`${PYTHON_SERVICE}/process_complete_pipeline`, {
      start,
      end,
      interpolation_factor: interpolation_factor,
      enable_alerts: enable_alerts
    });

    if (pyResp.data.error) {
      return res.status(400).json({
        error: pyResp.data.error,
        message: pyResp.data.details || "Error in pipeline processing",
      });
    }

    if (!pyResp.data.pipeline_success) {
      return res.status(400).json({
        error: "Pipeline processing failed",
        details: pyResp.data,
      });
    }

    const frames = pyResp.data.final_frames || [];
    const alertCount = frames.filter(f => f.alert).length;
    const landmarkCount = frames.filter(f => f.alertType === 'landmark').length;

    const newRoute = new Route({
      userId,
      start,
      end,
      pythonRouteId: pyResp.data.route_id,
      framesData: frames,
      processed: true,
      interpolated: true,
      interpolationFactor: interpolation_factor,
      processingStats: pyResp.data.statistics,
      navigationMetadata: {
        totalTurns: pyResp.data.navigation_stats?.total_turns || 0,
        totalLandmarks: landmarkCount,
        alertedFrames: alertCount,
        routeDuration: 0,
        routeDistance: 0
      },
      alertsEnabled: enable_alerts,
      processedAt: new Date()
    });

    const savedRoute = await newRoute.save();
    console.log("✅ Complete pipeline route saved with ID:", savedRoute._id);

    res.json({
      route: savedRoute,
      pipeline_success: true,
      statistics: pyResp.data.statistics,
      navigation_stats: {
        total_turns: pyResp.data.navigation_stats?.total_turns || 0,
        total_alerts: alertCount,
        total_landmarks: landmarkCount
      }
    });

  } catch (err) {
    console.error("❌ Error in complete pipeline:", err.message);
    res.status(500).json({ error: "Failed to process complete pipeline" });
  }
};

export const getRouteAnalytics = async (req, res) => {
  try {
    const { routeId } = req.params;

    const route = await Route.findById(routeId);
    if (!route) {
      return res.status(404).json({ error: "Route not found" });
    }

    const analytics = {
      total_frames: route.framesData.length,
      original_frames: route.framesData.filter(f => !f.interpolated).length,
      interpolated_frames: route.framesData.filter(f => f.interpolated).length,
      smoothed_frames: route.framesData.filter(f => f.smoothedHeading !== null && f.smoothedHeading !== undefined).length,
      frames_with_alerts: route.framesData.filter(f => f.alert).length,
      turn_alerts: route.framesData.filter(f => f.alertType === 'turn').length,
      landmark_alerts: route.framesData.filter(f => f.alertType === 'landmark').length,
      has_vo_data: route.voHeadings && route.voHeadings.length > 0,
      is_interpolated: route.interpolated || false,
      interpolation_factor: route.interpolationFactor || null,
      processing_stats: route.processingStats || null,
      navigation_metadata: route.navigationMetadata || null,
      processed_at: route.processedAt || null,
      interpolated_at: route.interpolatedAt || null,
      python_route_id: route.pythonRouteId
    };

    if (route.framesData.length > 0) {
      const headings = route.framesData.map(f => f.heading).filter(h => h !== null);
      const smoothedHeadings = route.framesData.map(f => f.smoothedHeading).filter(h => h !== null && h !== undefined);
      
      if (headings.length > 0) {
        analytics.heading_stats = {
          mean_heading: headings.reduce((a, b) => a + b, 0) / headings.length,
          heading_variance: headings.reduce((sum, h) => sum + Math.pow(h - analytics.heading_stats?.mean_heading || 0, 2), 0) / headings.length
        };
      }

      if (smoothedHeadings.length > 0) {
        analytics.smoothed_heading_stats = {
          mean_smoothed_heading: smoothedHeadings.reduce((a, b) => a + b, 0) / smoothedHeadings.length,
          smoothing_effect: headings.length > 0 && smoothedHeadings.length > 0 ? 
            Math.abs(analytics.heading_stats.mean_heading - (smoothedHeadings.reduce((a, b) => a + b, 0) / smoothedHeadings.length)) : 0
        };
      }
    }

    res.json({
      route_id: routeId,
      analytics: analytics
    });

  } catch (err) {
    console.error("❌ Error getting route analytics:", err.message);
    res.status(500).json({ error: "Failed to get route analytics" });
  }
};

export const generateVideo = async (req, res) => {
  try {
    const { routeId } = req.params;
    const { 
      fps, 
      output_format = "mp4", 
      quality, 
      include_interpolated = true 
    } = req.body;

    console.log(`🎬 Starting video generation for route ${routeId} (with alerts)`);

    const route = await Route.findById(routeId);
    if (!route) {
      return res.status(404).json({ error: "Route not found" });
    }

    if (!route.pythonRouteId) {
      return res.status(400).json({ 
        error: "Route missing pythonRouteId. Cannot generate video.",
        suggestion: "Run database migration or regenerate route"
      });
    }

    const alertCount = route.framesData.filter(f => f.alert).length;
    console.log(`🎬 Generating video for Python route: ${route.pythonRouteId} (${alertCount} alerts)`);

    const pyResp = await axios.post(`${PYTHON_SERVICE}/generate_video`, {
      route_id: route.pythonRouteId,
      fps: fps,
      output_format: output_format,
      quality: quality,
      include_interpolated: include_interpolated,
    }, {
      timeout: 300000,
      validateStatus: function (status) {
        return status < 500;
      }
    });

    console.log(`📡 Python service response status: ${pyResp.status}`);

    if (pyResp.data.error) {
      console.error(`❌ ERROR from Python service: ${pyResp.data.error}`);
      return res.status(400).json({
        error: pyResp.data.error,
        message: pyResp.data.message || "Error during video generation",
        details: pyResp.data.details || pyResp.data,
        python_route_id: route.pythonRouteId
      });
    }

    if (!pyResp.data.success) {
      console.error(`❌ Python service returned success=false:`, pyResp.data);
      return res.status(400).json({
        error: "Video generation failed",
        details: pyResp.data,
        python_route_id: route.pythonRouteId
      });
    }

    const updatedRoute = await Route.findByIdAndUpdate(
      routeId,
      { 
        $set: { 
          videoGenerated: true,
          videoPath: pyResp.data.video_path,
          videoFilename: pyResp.data.video_filename,
          videoStats: {
            source_type: pyResp.data.source_type,
            file_size_mb: pyResp.data.file_size_mb,
            fps: fps,
            quality: quality,
            ...pyResp.data.video_stats
          },
          videoGeneratedAt: new Date()
        } 
      },
      { new: true, runValidators: true }
    );

    if (!updatedRoute) {
      return res.status(404).json({ error: "Route not found after update" });
    }

    console.log("✅ Video generation successful with alerts");
    console.log(`📄 Video file: ${pyResp.data.video_filename}`);
    console.log(`📊 File size: ${pyResp.data.file_size_mb} MB`);
    console.log(`⏱️ Duration: ${pyResp.data.video_stats.duration_seconds} seconds`);
    console.log(`🔔 Alerts in video: ${alertCount}`);
    
    res.json({ 
      route: updatedRoute,
      video_info: {
        filename: pyResp.data.video_filename,
        source_type: pyResp.data.source_type,
        file_size_mb: pyResp.data.file_size_mb,
        video_stats: pyResp.data.video_stats,
        video_url: `${PYTHON_SERVICE}/videos/${route.pythonRouteId}/${pyResp.data.video_filename}`,
        alerts_included: alertCount
      }
    });

  } catch (err) {
    console.error("❌ Error generating video - Full error:", err);
    console.error("Error message:", err.message);
    console.error("Error response:", err.response?.data);
    
    let errorMessage = "Failed to generate video";
    let errorDetails = {};
    
    if (err.code === 'ECONNREFUSED') {
      errorMessage = "Cannot connect to Python service";
      errorDetails.suggestion = "Make sure Python service is running on http://localhost:8000";
    } else if (err.code === 'ETIMEDOUT') {
      errorMessage = "Python service timeout during video generation";
      errorDetails.suggestion = "Video generation is taking too long, try with lower quality or fewer frames";
    } else if (err.response) {
      errorMessage = `Python service error: ${err.response.status}`;
      errorDetails.python_response = err.response.data;
    }
    
    res.status(500).json({ 
      error: errorMessage,
      details: errorDetails,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
};

export const processCompletePipelineWithVideo = async (req, res) => {
  try {
    const { 
      userId, 
      start, 
      end, 
      interpolation_factor,
      generate_video = true,
      video_fps,
      video_quality,
      enable_alerts = true
    } = req.body;

    console.log("🚀 Starting complete processing pipeline with video generation and enhanced alerts");

    const pyResp = await axios.post(`${PYTHON_SERVICE}/process_complete_pipeline`, {
      start,
      end,
      interpolation_factor: interpolation_factor,
      enable_alerts: enable_alerts
    });

    if (pyResp.data.error) {
      return res.status(400).json({
        error: pyResp.data.error,
        message: pyResp.data.details || "Error in pipeline processing",
      });
    }

    if (!pyResp.data.pipeline_success) {
      return res.status(400).json({
        error: "Pipeline processing failed",
        details: pyResp.data,
      });
    }

    const voHeadings = pyResp.data.vo_headings || [];
    const frames = pyResp.data.final_frames || [];
    const alertCount = frames.filter(f => f.alert).length;
    const landmarkCount = frames.filter(f => f.alertType === 'landmark').length;
    
    console.log(`📊 Received ${voHeadings.length} VO headings from pipeline`);
    console.log(`🔔 Received ${alertCount} alerts (${landmarkCount} landmarks)`);

    const newRoute = new Route({
      userId,
      start,
      end,
      pythonRouteId: pyResp.data.route_id,
      framesData: frames,
      voHeadings: voHeadings,
      processed: true,
      interpolated: true,
      interpolationFactor: interpolation_factor,
      processingStats: pyResp.data.statistics,
      navigationMetadata: {
        totalTurns: pyResp.data.navigation_stats?.total_turns || 0,
        totalLandmarks: landmarkCount,
        alertedFrames: alertCount,
        routeDuration: 0,
        routeDistance: 0
      },
      alertsEnabled: enable_alerts,
      processedAt: new Date()
    });

    const savedRoute = await newRoute.save();
    console.log("✅ Complete pipeline route saved with ID:", savedRoute._id);

    // ✅ Save frames data to JSON file for video generation
    try {
      const framesDir = path.join(process.cwd(), '..', 'python-service', 'frames', pyResp.data.route_id, 'smoothed', 'interpolated');
      await fs.mkdir(framesDir, { recursive: true });
      const framesDataPath = path.join(framesDir, 'frames_data.json');
      await fs.writeFile(framesDataPath, JSON.stringify(frames, null, 2));
      console.log(`✅ Saved frames data with alerts to ${framesDataPath}`);
    } catch (fileErr) {
      console.warn(`⚠️ Could not save frames data: ${fileErr.message}`);
    }

    let videoResult = null;

    if (generate_video) {
      try {
        console.log("🎬 Generating video from processed frames with alerts...");
        
        const videoResp = await axios.post(`${PYTHON_SERVICE}/generate_video`, {
          route_id: pyResp.data.route_id,
          fps: video_fps,
          output_format: "mp4",
          quality: video_quality,
          include_interpolated: true,
        });

        if (videoResp.data.success) {
          await Route.findByIdAndUpdate(
            savedRoute._id,
            { 
              $set: { 
                videoGenerated: true,
                videoPath: videoResp.data.video_path,
                videoFilename: videoResp.data.video_filename,
                videoStats: {
                  source_type: videoResp.data.source_type,
                  file_size_mb: videoResp.data.file_size_mb,
                  fps: video_fps,
                  quality: video_quality,
                  ...videoResp.data.video_stats
                },
                videoGeneratedAt: new Date()
              } 
            }
          );

          videoResult = {
            filename: videoResp.data.video_filename,
            source_type: videoResp.data.source_type,
            file_size_mb: videoResp.data.file_size_mb,
            video_stats: videoResp.data.video_stats,
            video_url: `${PYTHON_SERVICE}/videos/${pyResp.data.route_id}/${videoResp.data.video_filename}`,
            alerts_included: alertCount
          };

          console.log("✅ Video with alerts generated successfully!");
        } else {
          console.error("❌ Video generation failed:", videoResp.data);
        }
      } catch (videoErr) {
        console.error("❌ Video generation error (non-fatal):", videoErr.message);
      }
    }

    const finalRoute = await Route.findById(savedRoute._id);

    res.json({
      route: finalRoute,
      pipeline_success: true,
      statistics: pyResp.data.statistics,
      video_info: videoResult,
      navigation_stats: {
        total_turns: pyResp.data.navigation_stats?.total_turns || 0,
        total_alerts: alertCount,
        total_landmarks: landmarkCount
      }
    });

  } catch (err) {
    console.error("❌ Error in complete pipeline with video:", err.message);
    res.status(500).json({ error: "Failed to process complete pipeline with video" });
  }
};