// routes/routeRoutes.js - Complete routes with caching
import express from "express";
import { 
  generateRoute, 
  smoothRoute,
  regenerateFrames,
  interpolateFrames,
  processCompletePipeline,
  processCompletePipelineWithVideo,
  processCompletePipelineWithVideoCached, // New cached version
  generateVideo,
  checkExistingRoute, // New endpoint
  getRouteAnalytics 
} from "../controllers/routeController.js";

const router = express.Router();

// NEW: Check for existing route endpoint
router.post("/check-existing", checkExistingRoute);

// Existing routes
router.post("/generate", generateRoute);
router.post("/:routeId/smooth", smoothRoute);
router.post("/:routeId/regenerate", regenerateFrames);
router.post("/:routeId/interpolate", interpolateFrames);

// Complete processing routes
router.post("/process-complete", processCompletePipeline);
router.post("/process-complete-with-video", processCompletePipelineWithVideo);

// NEW: Cached complete pipeline with video
router.post("/process-complete-with-video-cached", processCompletePipelineWithVideoCached);

// Video generation routes
router.post("/:routeId/generate-video", generateVideo);

// Analytics route
router.get("/:routeId/analytics", getRouteAnalytics);

export default router;