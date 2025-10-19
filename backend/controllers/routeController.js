import axios from "axios";
import Route from "../models/Route.js";
import dotenv from "dotenv";

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
// Check for Existing Route and Video
// ----------------------
export const checkExistingRoute = async (req, res) => {
  try {
    const { start, end, interpolation_factor, video_fps, video_quality } = req.body;
    
    // Generate route identifier to match Python service
    const routeIdentifier = generateRouteIdentifier(start, end);
    
    // First check if route exists in MongoDB
    const existingRoute = await Route.findOne({
      start: start.trim(),
      end: end.trim(),
      interpolated: true, // Only consider fully processed routes
      videoGenerated: true,// Only routes with videos
      'videoStats.fps': video_fps,  // Match exact FPS
      'videoStats.quality': video_quality 
    }).sort({ createdAt: -1 }); // Get the most recent one
    
    if (existingRoute && existingRoute.videoFilename) {
      console.log("Found existing route with video in database:", existingRoute._id);
      
      // Verify the video file still exists in Python service
      try {
        const videoCheckResponse = await axios.get(
          `${PYTHON_SERVICE}/check_video/${existingRoute.pythonRouteId}/${existingRoute.videoFilename}`,
          { timeout: 5000 }
        );
        
        if (videoCheckResponse.data.exists) {
          console.log("Existing video file confirmed, returning cached result");
          
          return res.json({
            cached: true,
            route: existingRoute,
            video_info: {
              filename: existingRoute.videoFilename,
              source_type: existingRoute.videoStats?.source_type || "interpolated",
              file_size_mb: existingRoute.videoStats?.file_size_mb,
              video_stats: existingRoute.videoStats,
              video_url: `${PYTHON_SERVICE}/videos/${existingRoute.pythonRouteId}/${existingRoute.videoFilename}`
            }
          });
        }
      } catch (videoCheckError) {
        console.log("Video verification failed, will regenerate:", videoCheckError.message);
        // Continue to check Python service cache
      }
    }
    
    // Check Python service for cached route
    try {
      const pythonCheckResponse = await axios.post(`${PYTHON_SERVICE}/check_existing_route`, {
        start,
        end,
        interpolation_factor,
        video_fps,
        video_quality
      });
      
      if (pythonCheckResponse.data.exists && pythonCheckResponse.data.video_available) {
        console.log("Found existing route with video in Python service");
        
        // Create or update route in MongoDB with cached data
        const cachedRouteData = {
          start: start.trim(),
          end: end.trim(),
          pythonRouteId: pythonCheckResponse.data.route_id,
          framesData: pythonCheckResponse.data.frames || [],
          processed: true,
          interpolated: true,
          interpolationFactor: interpolation_factor,
          videoGenerated: true,
          videoPath: pythonCheckResponse.data.video_path,
          videoFilename: pythonCheckResponse.data.video_filename,
          videoStats: pythonCheckResponse.data.video_stats,
          processingStats: pythonCheckResponse.data.processing_stats,
          processedAt: new Date(),
          videoGeneratedAt: new Date()
        };
        
        let savedRoute;
        if (existingRoute) {
          // Update existing route
          savedRoute = await Route.findByIdAndUpdate(
            existingRoute._id,
            { $set: cachedRouteData },
            { new: true, runValidators: true }
          );
        } else {
          // Create new route record
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
          }
        });
      }
    } catch (pythonCheckError) {
      console.log("Python service cache check failed:", pythonCheckError.message);
      // Continue to normal processing
    }
    
    // No cached route found
    return res.json({
      cached: false,
      message: "No existing route found, proceed with generation"
    });
    
  } catch (err) {
    console.error("Error checking existing route:", err.message);
    res.status(500).json({ error: "Failed to check existing route" });
  }
};

// ----------------------
// Enhanced Complete Pipeline with Caching
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
      video_quality
    } = req.body;

    // First check for existing route
    const cacheCheck = await new Promise((resolve) => {
      const mockRes = {
        json: (data) => resolve(data),
        status: () => mockRes
      };
      checkExistingRoute({ body: { start, end, interpolation_factor, video_fps, video_quality, userId } }, mockRes);
    });

    // If cached route exists, return it immediately
    if (cacheCheck.cached) {
      console.log("Returning cached route with video");
      return res.json({
        route: cacheCheck.route,
        pipeline_success: true,
        cached: true,
        statistics: cacheCheck.route.processingStats || {},
        video_info: cacheCheck.video_info
      });
    }

    console.log("No cached route found, starting complete processing pipeline");

    // Continue with original complete pipeline processing
    const pyResp = await axios.post(`${PYTHON_SERVICE}/process_complete_pipeline`, {
      start,
      end,
      interpolation_factor: interpolation_factor,
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

    // Save the fully processed route to MongoDB with pythonRouteId
    const newRoute = new Route({
      userId,
      start,
      end,
      pythonRouteId: pyResp.data.route_id,
      framesData: pyResp.data.final_frames,
      processed: true,
      interpolated: true,
      interpolationFactor: interpolation_factor,
      processingStats: pyResp.data.statistics,
      processedAt: new Date()
    });

    const savedRoute = await newRoute.save();
    console.log("Complete pipeline route saved with ID:", savedRoute._id);

    let videoResult = null;

    // Generate video if requested
    if (generate_video) {
      try {
        console.log("Generating video from processed frames...");
        
        const videoResp = await axios.post(`${PYTHON_SERVICE}/generate_video`, {
          route_id: pyResp.data.route_id,
          fps: video_fps,
          output_format: "mp4",
          quality: video_quality,
          include_interpolated: true,
        });

        if (videoResp.data.success) {
          // Update route with video information
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
            video_url: `${PYTHON_SERVICE}/videos/${pyResp.data.route_id}/${videoResp.data.video_filename}`
          };

          console.log("Video generated successfully!");
        } else {
          console.error("Video generation failed:", videoResp.data);
        }
      } catch (videoErr) {
        console.error("Video generation error (non-fatal):", videoErr.message);
      }
    }

    // Get the updated route
    const finalRoute = await Route.findById(savedRoute._id);

    res.json({
      route: finalRoute,
      pipeline_success: true,
      cached: false,
      statistics: pyResp.data.statistics,
      video_info: videoResult
    });

  } catch (err) {
    console.error("Error in complete pipeline with video:", err.message);
    res.status(500).json({ error: "Failed to process complete pipeline with video" });
  }
};

// ----------------------
// Original functions remain the same
// ----------------------
export const generateRoute = async (req, res) => {
  try {
    const { userId, start, end } = req.body;

    // Call Python microservice
    const pyResp = await axios.post(`${PYTHON_SERVICE}/generate_frames`, {
      start,
      end,
    });

    if (pyResp.data.error) {
      return res.status(400).json({
        error: pyResp.data.error,
        message: pyResp.data.message || "Error from Python service",
      });
    }

    // Save route in MongoDB with Python's route_id
    const newRoute = new Route({
      userId,
      start,
      end,
      pythonRouteId: pyResp.data.route_id,
      framesData: pyResp.data.frames,
      voHeadings: pyResp.data.vo_headings,
    });

    const savedRoute = await newRoute.save();
    console.log("Route saved with MongoDB ID:", savedRoute._id);
    console.log("Route saved with Python ID:", pyResp.data.route_id);

    res.json({ route: savedRoute })
  } catch (err) {
    console.error("Error generating route:", err.message);
    res.status(500).json({ error: "Failed to generate route" });
  }
};

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
    console.log("Successfully updated smoothed headings count:", smoothedHeadings.filter(h => h !== null && h !== undefined).length);
    
    res.json({ route: updatedRoute });
  } catch (err) {
    console.error("Error smoothing route:", err.message);
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

    console.log("Regenerating frames with smoothed headings...");

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

    console.log("Successfully regenerated frames with smoothed headings");
    
    res.json({ 
      route: updatedRoute,
      regenerated_count: pyResp.data.regenerated_count || 0
    });
  } catch (err) {
    console.error("Error regenerating frames:", err.message);
    res.status(500).json({ error: "Failed to regenerate frames" });
  }
};

export const interpolateFrames = async (req, res) => {
  try {
    const { routeId } = req.params;
    const { interpolation_factor = 2 } = req.body;

    console.log(`DEBUG: Interpolation request for route ${routeId} with factor ${interpolation_factor}`);

    const route = await Route.findById(routeId);
    if (!route) {
      return res.status(404).json({ error: "Route not found" });
    }

    console.log(`DEBUG: Route found - Start: ${route.start}, End: ${route.end}`);
    console.log(`DEBUG: Route pythonRouteId: ${route.pythonRouteId}`);
    console.log(`DEBUG: Total frames in route: ${route.framesData?.length || 0}`);

    if (!route.pythonRouteId) {
      return res.status(400).json({ 
        error: "Route missing pythonRouteId. Please run database migration or regenerate route.",
        suggestion: "Run the migration script to update existing routes with pythonRouteId field"
      });
    }

    const validFrames = route.framesData.filter(frame => 
      frame.filename && frame.filename.length > 0
    );

    console.log(`DEBUG: Valid frames with filenames: ${validFrames.length}`);
    
    if (validFrames.length > 0) {
      console.log(`DEBUG: Sample frame paths:`);
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

    console.log(`Starting optical flow interpolation with factor ${interpolation_factor}...`);

    const pythonRouteId = route.pythonRouteId

    console.log(`DEBUG: Calling Python service with route_id: ${pythonRouteId}`);

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

    console.log(`DEBUG: Python service response status: ${pyResp.status}`);
    console.log(`DEBUG: Python service response:`, JSON.stringify(pyResp.data, null, 2));

    if (pyResp.data.error) {
      console.error(`ERROR from Python service: ${pyResp.data.error}`);
      return res.status(400).json({
        error: pyResp.data.error,
        message: pyResp.data.message || "Error during optical flow interpolation",
        details: pyResp.data.details || pyResp.data,
        python_route_id: pythonRouteId
      });
    }

    if (!pyResp.data.success) {
      console.error(`Python service returned success=false:`, pyResp.data);
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

    console.log("Successfully applied optical flow interpolation");
    console.log(`Original frames: ${pyResp.data.original_count}`);
    console.log(`Interpolated frames: ${pyResp.data.interpolated_count}`);
    console.log(`Total frames: ${pyResp.data.total_count}`);
    console.log(`Average motion consistency: ${pyResp.data.average_consistency?.toFixed(3)}`);
    
    res.json({ 
      route: updatedRoute,
      interpolation_stats: {
        original_count: pyResp.data.original_count,
        interpolated_count: pyResp.data.interpolated_count,
        total_count: pyResp.data.total_count,
        interpolation_factor: interpolation_factor,
        average_consistency: pyResp.data.average_consistency,
        consistency_scores: pyResp.data.consistency_scores
      }
    });
  } catch (err) {
    console.error("Error interpolating frames - Full error:", err);
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
    const { userId, start, end, interpolation_factor = 2 } = req.body;

    console.log("Starting complete processing pipeline");

    const pyResp = await axios.post(`${PYTHON_SERVICE}/process_complete_pipeline`, {
      start,
      end,
      interpolation_factor: interpolation_factor,
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

    const newRoute = new Route({
      userId,
      start,
      end,
      pythonRouteId: pyResp.data.route_id,
      framesData: pyResp.data.final_frames,
      processed: true,
      interpolated: true,
      interpolationFactor: interpolation_factor,
      processingStats: pyResp.data.statistics,
      processedAt: new Date()
    });

    const savedRoute = await newRoute.save();
    console.log("Complete pipeline route saved with ID:", savedRoute._id);

    res.json({
      route: savedRoute,
      pipeline_success: true,
      statistics: pyResp.data.statistics
    });

  } catch (err) {
    console.error("Error in complete pipeline:", err.message);
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
      has_vo_data: route.voHeadings && route.voHeadings.length > 0,
      is_interpolated: route.interpolated || false,
      interpolation_factor: route.interpolationFactor || null,
      processing_stats: route.processingStats || null,
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
    console.error("Error getting route analytics:", err.message);
    res.status(500).json({ error: "Failed to get route analytics" });
  }
};

export const generateVideo = async (req, res) => {
  try {
    const { routeId } = req.params;
    const { 
      fps, 
      output_format = "mp4", 
      quality , 
      include_interpolated = true 
    } = req.body;

    console.log(`Starting video generation for route ${routeId}`);

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

    console.log(`Generating video for Python route: ${route.pythonRouteId}`);

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

    console.log(`Python service response status: ${pyResp.status}`);

    if (pyResp.data.error) {
      console.error(`ERROR from Python service: ${pyResp.data.error}`);
      return res.status(400).json({
        error: pyResp.data.error,
        message: pyResp.data.message || "Error during video generation",
        details: pyResp.data.details || pyResp.data,
        python_route_id: route.pythonRouteId
      });
    }

    if (!pyResp.data.success) {
      console.error(`Python service returned success=false:`, pyResp.data);
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

    console.log("Video generation successful");
    console.log(`Video file: ${pyResp.data.video_filename}`);
    console.log(`File size: ${pyResp.data.file_size_mb} MB`);
    console.log(`Duration: ${pyResp.data.video_stats.duration_seconds} seconds`);
    
    res.json({ 
      route: updatedRoute,
      video_info: {
        filename: pyResp.data.video_filename,
        source_type: pyResp.data.source_type,
        file_size_mb: pyResp.data.file_size_mb,
        video_stats: pyResp.data.video_stats,
        video_url: `${PYTHON_SERVICE}/videos/${route.pythonRouteId}/${pyResp.data.video_filename}`
      }
    });

  } catch (err) {
    console.error("Error generating video - Full error:", err);
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

// Keep the original function as well
export const processCompletePipelineWithVideo = async (req, res) => {
  try {
    const { 
      userId, 
      start, 
      end, 
      interpolation_factor,
      generate_video = true,
      video_fps,
      video_quality
    } = req.body;

    console.log("Starting complete processing pipeline with video generation");

    const pyResp = await axios.post(`${PYTHON_SERVICE}/process_complete_pipeline`, {
      start,
      end,
      interpolation_factor: interpolation_factor,
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

    // Extract vo_headings from Python response
    const voHeadings = pyResp.data.vo_headings || [];
    console.log(`📊 Received ${voHeadings.length} VO headings from pipeline`);

    const newRoute = new Route({
      userId,
      start,
      end,
      pythonRouteId: pyResp.data.route_id,
      framesData: pyResp.data.final_frames,
      voHeadings: voHeadings,
      processed: true,
      interpolated: true,
      interpolationFactor: interpolation_factor,
      processingStats: pyResp.data.statistics,
      processedAt: new Date()
    });

    const savedRoute = await newRoute.save();
    console.log("Complete pipeline route saved with ID:", savedRoute._id);

    let videoResult = null;

    if (generate_video) {
      try {
        console.log("Generating video from processed frames...");
        
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
            video_url: `${PYTHON_SERVICE}/videos/${pyResp.data.route_id}/${videoResp.data.video_filename}`
          };

          console.log("Video generated successfully!");
        } else {
          console.error("Video generation failed:", videoResp.data);
        }
      } catch (videoErr) {
        console.error("Video generation error (non-fatal):", videoErr.message);
      }
    }

    const finalRoute = await Route.findById(savedRoute._id);

    res.json({
      route: finalRoute,
      pipeline_success: true,
      statistics: pyResp.data.statistics,
      video_info: videoResult
    });

  } catch (err) {
    console.error("Error in complete pipeline with video:", err.message);
    res.status(500).json({ error: "Failed to process complete pipeline with video" });
  }
};
