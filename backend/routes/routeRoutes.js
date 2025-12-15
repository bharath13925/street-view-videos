import express from "express";
import { 
  generateRoute, 
  smoothRoute,
  regenerateFrames,
  interpolateFrames,
  processCompletePipeline,
  processCompletePipelineWithVideo,
  processCompletePipelineWithVideoCached,
  generateVideo,
  checkExistingRoute,
  getRouteAnalytics,
  getRouteNavigationAlerts
} from "../controllers/routeController.js";

const router = express.Router();

// ==========================================
// CACHE CHECKING
// ==========================================
// Check if route exists with complete pipeline and video
router.post("/check-existing", checkExistingRoute);

// ==========================================
// ROUTE GENERATION
// ==========================================
// Generate route with visual overlays (50m turns, 100m landmarks)
router.post("/generate", generateRoute);

// ==========================================
// ROUTE PROCESSING
// ==========================================
// Smooth headings using LSTM
router.post("/:routeId/smooth", smoothRoute);

// Regenerate frames with smoothed headings (preserves overlays)
router.post("/:routeId/regenerate", regenerateFrames);

// Apply optical flow interpolation (preserves overlays)
router.post("/:routeId/interpolate", interpolateFrames);

// ==========================================
// COMPLETE PIPELINES
// ==========================================
// Complete pipeline: Generate → Smooth → Regenerate → Interpolate
router.post("/process-complete", processCompletePipeline);

// Complete pipeline + Video generation
router.post("/process-complete-with-video", processCompletePipelineWithVideo);

// Smart pipeline with caching + Dynamic Speed Video
router.post("/process-complete-with-video-cached", processCompletePipelineWithVideoCached);

// ==========================================
// VIDEO GENERATION
// ==========================================
// Generate dynamic speed video from processed frames
router.post("/:routeId/generate-video", generateVideo);

// ==========================================
// ANALYTICS & NAVIGATION
// ==========================================
// Get route analytics (frames, headings, processing stats)
router.get("/:routeId/analytics", getRouteAnalytics);

// Get navigation alerts (turns at 50m, landmarks at 100m)
router.get("/:routeId/navigation-alerts", getRouteNavigationAlerts);

export default router;