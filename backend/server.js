// backend/server.js
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import userRoutes from "./routes/userRoutes.js";
import routeRoutes from "./routes/routeRoutes.js";
import emailRoutes from "./routes/emailRoutes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ==========================================
// CORS Configuration - MUST BE FIRST!
// ==========================================
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      "https://street-view-videos.vercel.app",
      "http://localhost:5173",
      "http://localhost:3000",
    ];
    
    // Allow requests with no origin (like mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log("Blocked origin:", origin);
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: [
    "Content-Type", 
    "Authorization", 
    "X-Requested-With",
    "Accept",
    "Origin"
  ],
  credentials: true,
  optionsSuccessStatus: 200,
  maxAge: 86400, // 24 hours
};

// Apply CORS middleware
app.use(cors(corsOptions));

// Handle preflight requests for ALL routes
app.options("*", cors(corsOptions));

// ==========================================
// Body Parser Middleware
// ==========================================
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// ==========================================
// Request Logging Middleware
// ==========================================
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  
  // Log request origin for debugging CORS issues
  if (req.headers.origin) {
    console.log(`  Origin: ${req.headers.origin}`);
  }
  
  next();
});

// ==========================================
// Timeout Handling
// ==========================================
app.use((req, res, next) => {
  // Set timeout to 5 minutes for long-running operations
  req.setTimeout(300000); // 5 minutes
  res.setTimeout(300000);
  next();
});

// ==========================================
// Health Check Endpoint (before routes)
// ==========================================
app.get("/health", (req, res) => {
  res.status(200).json({ 
    status: "OK", 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    mongodb: mongoose.connection.readyState === 1 ? "connected" : "disconnected"
  });
});

// ==========================================
// MongoDB Connection
// ==========================================
mongoose
  .connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 10000, // 10 seconds
    socketTimeoutMS: 45000, // 45 seconds
  })
  .then(() => {
    console.log("✅ MongoDB Connected Successfully!");
    
    // Start server only after DB connection
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 Python Service: ${process.env.PYTHON_SERVICE || 'Not configured'}`);
    });
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1); // Exit if DB connection fails
  });

// ==========================================
// API Routes
// ==========================================
app.use("/api/users", userRoutes);
app.use("/api/routes", routeRoutes);
app.use("/api/contact", emailRoutes);

// ==========================================
// Root Route
// ==========================================
app.get("/", (req, res) => {
  res.json({
    message: "Street View Video Generation API",
    version: "1.0.0",
    endpoints: {
      health: "/health",
      users: "/api/users",
      routes: "/api/routes",
      contact: "/api/contact"
    }
  });
});

// ==========================================
// 404 Handler (must be after all routes)
// ==========================================
app.use((req, res) => {
  res.status(404).json({ 
    error: "Route not found",
    path: req.path,
    method: req.method
  });
});

// ==========================================
// Global Error Handler (must be last)
// ==========================================
app.use((err, req, res, next) => {
  console.error("❌ Global Error Handler:");
  console.error("Error:", err.message);
  console.error("Stack:", err.stack);
  
  // Handle CORS errors specifically
  if (err.message === "Not allowed by CORS") {
    return res.status(403).json({
      error: "CORS Error",
      message: "Origin not allowed",
      origin: req.headers.origin
    });
  }
  
  // Handle timeout errors
  if (err.code === 'ETIMEDOUT' || err.message.includes('timeout')) {
    return res.status(504).json({
      error: "Request Timeout",
      message: "The operation took too long to complete"
    });
  }
  
  // Generic error response
  res.status(err.status || 500).json({
    error: err.message || "Internal Server Error",
    timestamp: new Date().toISOString(),
    path: req.path,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// ==========================================
// Graceful Shutdown
// ==========================================
process.on("SIGTERM", () => {
  console.log("SIGTERM signal received: closing HTTP server");
  mongoose.connection.close(false, () => {
    console.log("MongoDB connection closed");
    process.exit(0);
  });
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  process.exit(1);
});
