import express from "express";
import User from "../models/User.js";

const router = express.Router();

// Save new user
router.post("/signup", async (req, res) => {
  try {
    const { uid, name, email, signupMethod } = req.body;

    // Validation
    if (!uid || !name || !email || !signupMethod) {
      return res.status(400).json({
        error: "Missing required fields",
      });
    }

    // Check if user already exists by UID or Email
    let existingUser = await User.findOne({
      $or: [{ uid }, { email }],
    });

    if (existingUser) {
      return res.status(200).json({
        message: "User already exists",
        user: existingUser,
      });
    }

    // Create new user
    const user = new User({
      uid,
      name,
      email,
      signupMethod,
    });

    // Save to MongoDB
    await user.save();

    res.status(201).json({
      message: "User saved successfully",
      user,
    });

  } catch (error) {
    console.error("Error saving user:", error);

    res.status(500).json({
      error: error.message || "Internal server error",
    });
  }
});

// Get single user by UID
router.get("/:uid", async (req, res) => {
  try {
    const user = await User.findOne({
      uid: req.params.uid,
    });

    if (!user) {
      return res.status(404).json({
        error: "User not found",
      });
    }

    res.status(200).json(user);

  } catch (error) {
    console.error("Error fetching user:", error);

    res.status(500).json({
      error: error.message || "Internal server error",
    });
  }
});

// Get all users
router.get("/", async (req, res) => {
  try {
    const users = await User.find();

    res.status(200).json(users);

  } catch (error) {
    console.error("Error fetching users:", error);

    res.status(500).json({
      error: error.message || "Internal server error",
    });
  }
});

export default router;