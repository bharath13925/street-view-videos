import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  uid: { type: String, required: true, unique: true }, // Firebase UID
  name: { type: String, required: true },
  email: { type: String, unique: true, required: true },
  signupMethod: { type: String, enum: ["email", "google"], required: true }
});

export default mongoose.model("User", userSchema);
