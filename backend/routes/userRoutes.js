import express from "express";
import User from "../models/User.js";

const router = express.Router();

// Save new user
router.post("/signup", async (req, res) => {
  try {
    const { uid, name, email, signupMethod } = req.body;

    if (!uid || !name || !email || !signupMethod) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    let user = await User.findOne({ uid });
    if (user) {
      return res.status(200).json({ message: "User already exists", user });
    }

    user = new User({ uid, name, email, signupMethod });
    await user.save();

    res.status(201).json({ message: "User saved successfully", user });
  } catch (error) {
    console.error("Error saving user:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:uid", async (req, res) => {
  try {
    const user = await User.findOne({ uid: req.params.uid });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json(user);
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get all users (admin/debug)
router.get("/", async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
