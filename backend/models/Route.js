import mongoose from "mongoose";

// ✅ FIXED: Frame schema with ALL alert fields for persistence
const frameSchema = new mongoose.Schema({
  lat: Number,
  lon: Number,
  heading: Number,
  smoothedHeading: Number,
  filename: String,
  interpolated: { type: Boolean, default: false },
  
  // ✅ CRITICAL: Alert metadata fields (were missing before)
  alert: String,              // "Turn Left in 35m" or "SCHOOL: ABC High School in 85m"
  alertType: String,          // "turn" or "landmark"
  alertDistance: Number,      // Distance in meters
  alertIcon: String,          // Icon identifier: "turn-left", "map-pin", etc.
  category: String            // For landmarks: "🏫 School", "🚌 Bus Station", etc.
});

const videoStatsSchema = new mongoose.Schema({
  source_type: String,        // "interpolated", "smoothed", "original"
  file_size_mb: Number,
  fps: Number,
  quality: String,
  duration_seconds: Number,
  resolution: String,
  total_frames: Number,
  successful_frames: Number,
  speed_type: String,         // "dynamic", "constant"
  slowdown_multiplier: String, // "333% near alerts"
  total_source_frames: Number,
  total_written_frames: Number
});

// Enhanced navigation metadata
const navigationMetadataSchema = new mongoose.Schema({
  totalTurns: Number,
  totalLandmarks: Number,
  alertedFrames: Number,
  routeDuration: Number,      // seconds
  routeDistance: Number       // meters
});

const routeSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  start: { type: String, required: true },
  end: { type: String, required: true },
  pythonRouteId: { type: String, required: true },
  framesData: [frameSchema],  // ✅ Now stores alerts properly
  voHeadings: [Number],
  processed: { type: Boolean, default: false },
  interpolated: { type: Boolean, default: false },
  interpolationFactor: Number,
  processingStats: mongoose.Schema.Types.Mixed,
  processedAt: Date,
  interpolatedAt: Date,
  
  // Video-related fields with dynamic speed support
  videoGenerated: { type: Boolean, default: false },
  videoPath: String,
  videoFilename: String,
  videoStats: videoStatsSchema,
  videoGeneratedAt: Date,
  
  // Enhanced navigation metadata
  navigationMetadata: navigationMetadataSchema,
  directionsData: mongoose.Schema.Types.Mixed, // Full Google Directions response
  alertsEnabled: { type: Boolean, default: true }
}, {
  timestamps: true
});

// Index for faster queries
routeSchema.index({ userId: 1, createdAt: -1 });
routeSchema.index({ pythonRouteId: 1 });
routeSchema.index({ start: 1, end: 1 });

export default mongoose.model("Route", routeSchema);