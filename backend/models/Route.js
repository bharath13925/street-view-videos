// Route.js - Add pythonRouteId field to your schema
import mongoose from "mongoose";

const frameSchema = new mongoose.Schema({
  lat: Number,
  lon: Number,
  heading: Number,
  smoothedHeading: Number,
  filename: String,
  interpolated: { type: Boolean, default: false }
});

const videoStatsSchema = new mongoose.Schema({
  source_type: String, // 'original', 'smoothed', 'interpolated'
  file_size_mb: Number,
  fps: Number,
  quality: String,
  duration_seconds: Number,
  resolution: String,
  total_frames: Number,
  successful_frames: Number
});

const routeSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  start: { type: String, required: true },
  end: { type: String, required: true },
  pythonRouteId: { type: String, required: true }, // Stores Python's route_id
  framesData: [frameSchema],
  voHeadings: [Number],
  processed: { type: Boolean, default: false },
  interpolated: { type: Boolean, default: false },
  interpolationFactor: Number,
  processingStats: mongoose.Schema.Types.Mixed,
  processedAt: Date,
  interpolatedAt: Date,
  // Video-related fields
  videoGenerated: { type: Boolean, default: false },
  videoPath: String,
  videoFilename: String,
  videoStats: videoStatsSchema,
  videoGeneratedAt: Date
}, {
  timestamps: true
});

export default mongoose.model("Route", routeSchema);