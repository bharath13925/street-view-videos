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

// Middleware
app.use(express.json());

// CORS
app.use(
  cors({
    origin: [
      "http://localhost:5173", // Vite local frontend
      "http://localhost:3000", // React local frontend
      "https://street-view-videos.vercel.app", // deployed frontend
    ],
    credentials: true,
  })
);

// MongoDB Connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB Connected Successfully!");

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
  });

// Routes
app.use("/api/users", userRoutes);
app.use("/api/routes", routeRoutes);
app.use("/api/contact", emailRoutes);

// Test Route
app.get("/", (req, res) => {
  res.send("Hello World 🌍 Backend + MongoDB!");
});