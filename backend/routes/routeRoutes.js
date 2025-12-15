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
// ✅ Check if route exists with complete pipeline and video
router.post("/check-existing", checkExistingRoute);

// ==========================================
// ROUTE GENERATION
// ==========================================
// ✅ Generate route with enhanced navigation alerts (120m turns, 200m landmarks)
router.post("/generate", generateRoute);

// ==========================================
// ROUTE PROCESSING
// ==========================================
// ✅ Smooth headings using LSTM
router.post("/:routeId/smooth", smoothRoute);

// ✅ Regenerate frames with smoothed headings (preserves alert metadata)
router.post("/:routeId/regenerate", regenerateFrames);

// ✅ Apply optical flow interpolation (preserves alert metadata, applies overlays to final frames)
router.post("/:routeId/interpolate", interpolateFrames);

// ==========================================
// COMPLETE PIPELINES
// ==========================================
// ✅ Complete pipeline: Generate → Smooth → Regenerate → Interpolate (with 120m/200m alerts)
router.post("/process-complete", processCompletePipeline);

// ✅ Complete pipeline + Dynamic Speed Video generation (with 120m/200m alerts)
router.post("/process-complete-with-video", processCompletePipelineWithVideo);

// ✅ Smart pipeline with caching + Dynamic Speed Video (120m/200m alerts, turn_index fix)
router.post("/process-complete-with-video-cached", processCompletePipelineWithVideoCached);

// ==========================================
// VIDEO GENERATION
// ==========================================
// ✅ Generate dynamic speed video from processed frames (with visual overlays)
router.post("/:routeId/generate-video", generateVideo);

// ==========================================
// ANALYTICS & NAVIGATION
// ==========================================
// ✅ Get route analytics (frames, headings, processing stats, alert counts)
router.get("/:routeId/analytics", getRouteAnalytics);

// ✅ Get navigation alerts (turns at 120m, landmarks at 200m with categories)
router.get("/:routeId/navigation-alerts", getRouteNavigationAlerts);

export default router;