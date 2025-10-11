// backend/routes/routeRoutes.js
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
  getRouteAnalytics 
} from "../controllers/routeController.js";

const router = express.Router();

// ==========================================
// IMPORTANT: Order matters! 
// More specific routes MUST come BEFORE parameterized routes
// ==========================================

// 1. Static path routes first (check-existing, process-complete, etc.)
router.post("/check-existing", checkExistingRoute);
router.post("/process-complete", processCompletePipeline);
router.post("/process-complete-with-video", processCompletePipelineWithVideo);
router.post("/process-complete-with-video-cached", processCompletePipelineWithVideoCached);

// 2. Generation route
router.post("/generate", generateRoute);

// 3. Routes with :routeId parameter (these must come after static routes)
router.post("/:routeId/smooth", smoothRoute);
router.post("/:routeId/regenerate", regenerateFrames);
router.post("/:routeId/interpolate", interpolateFrames);
router.post("/:routeId/generate-video", generateVideo);
router.get("/:routeId/analytics", getRouteAnalytics);

// Optional: Add a test endpoint to verify routes are working
router.get("/test", (req, res) => {
  res.json({ 
    message: "Route routes are working!",
    timestamp: new Date().toISOString() 
  });
});

export default router;
