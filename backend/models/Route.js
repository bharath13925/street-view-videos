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
  resolution: String, //textual resolution like 1920x1080
  total_frames: Number,
  successful_frames: Number
});

const routeSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  start: { type: String, required: true },
  end: { type: String, required: true },
  pythonRouteId: { type: String, required: true }, // Stores Python's route_id
  framesData: [frameSchema], //An array of frameSchema subdocuments — this is the sequence of frame objects (lat, lon, filenames, headings, interpolated flag
  voHeadings: [Number],
  processed: { type: Boolean, default: false },
  interpolated: { type: Boolean, default: false },
  interpolationFactor: Number,
  processingStats: mongoose.Schema.Types.Mixed, // Mixed is a flexible type that allows arbitrary data (object, array, primitive). Use it for ad-hoc diagnostics/stats whose shape may vary
  processedAt: Date,
  interpolatedAt: Date,
  // Video-related fields
  videoGenerated: { type: Boolean, default: false },
  videoPath: String, // path for video file
  videoFilename: String, // filename of generated video
  videoStats: videoStatsSchema, // meta data about the generated video
  videoGeneratedAt: Date
}, {
  timestamps: true
});

export default mongoose.model("Route", routeSchema);
