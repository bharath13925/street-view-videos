import React, { useState } from "react";
import { auth, googleProvider } from "../firebase";
import {
  createUserWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
} from "firebase/auth";
import { useNavigate } from "react-router-dom";

function UserSignupForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rePassword, setRePassword] = useState("");
  const navigate = useNavigate();

  // Helper: save user in backend
  const saveUserToBackend = async (userData) => {
    try {
      await fetch("http://localhost:5000/api/users/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userData),
      });
    } catch (err) {
      console.error("Error saving to backend:", err);
    }
  };

  // Normal Signup
  const handleSignup = async (e) => {
    e.preventDefault();
    if (password !== rePassword) {
      alert("Passwords do not match");
      return;
    }
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      await updateProfile(userCredential.user, { displayName: name });

      // Save to backend with Firebase UID
      await saveUserToBackend({
        uid: userCredential.user.uid,   // ✅ Save uid
        name,
        email,
        signupMethod: "email",
      });

      alert("Signup successful! Please login.");
      navigate("/login");
    } catch (error) {
      console.error(error.message);
      alert(error.message);
    }
  };

  // Google Signup
  const handleGoogleSignup = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      // Save to backend with Firebase UID
      await saveUserToBackend({
        uid: user.uid,                  // ✅ Save uid
        name: user.displayName,
        email: user.email,
        signupMethod: "google",
      });

      // Save user in localStorage for dashboard
      localStorage.setItem(
        "user",
        JSON.stringify({
          uid: user.uid,
          name: user.displayName,
          email: user.email,
        })
      );

      navigate("/user-dashboard");
    } catch (error) {
      console.error(error.message);
      alert(error.message);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-white">
      <div className="w-full max-w-md bg-white shadow-lg rounded-2xl p-8 border border-gray-200">
        <h2 className="text-2xl font-bold text-center text-lime-600 mb-6">
          User Signup
        </h2>

        <form onSubmit={handleSignup} className="space-y-4">
          <input
            type="text"
            placeholder="Full Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-lime-500"
            required
          />
          <input
            type="email"
            placeholder="Email Address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-lime-500"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-lime-500"
            required
          />
          <input
            type="password"
            placeholder="Re-enter Password"
            value={rePassword}
            onChange={(e) => setRePassword(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-lime-500"
            required
          />

          <button
            type="submit"
            className="w-full bg-lime-600 text-white py-2 rounded-lg hover:bg-lime-700 transition"
          >
            Sign Up
          </button>
        </form>

        <div className="mt-4 text-center">
          <p className="text-gray-500">OR</p>
          <button
            onClick={handleGoogleSignup}
            className="w-full bg-white border py-2 rounded-lg flex items-center justify-center gap-2 mt-2 hover:bg-gray-100"
          >
            <img
              src="https://www.svgrepo.com/show/355037/google.svg"
              alt="Google"
              className="w-5 h-5"
            />
            Continue with Google
          </button>
        </div>

        <p className="text-center text-gray-600 mt-6">
          Already have an account?{" "}
          <span
            onClick={() => navigate("/login")}
            className="text-lime-600 font-semibold cursor-pointer"
          >
            Login
          </span>
        </p>
      </div>
    </div>
  );
}

export default UserSignupForm;
