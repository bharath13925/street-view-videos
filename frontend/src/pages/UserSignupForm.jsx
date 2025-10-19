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
  const backendUrl = import.meta.env.VITE_BACKEND_URL;

  // Helper: save user in backend
  const saveUserToBackend = async (userData) => {
    try {
      await fetch(`${backendUrl}/api/users/signup`, {
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
        uid: userCredential.user.uid,
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
        uid: user.uid,         
        name: user.displayName,
        email: user.email,
        signupMethod: "google",
      });

      // Save user for dashboard (Note: Using state instead of localStorage for artifact compatibility)
      // In real app, you would use localStorage here
      navigate("/user-dashboard");
    } catch (error) {
      console.error(error.message);
      alert(error.message);
    }
  };

   return (
    <div className="flex items-center justify-center min-h-screen bg-black relative overflow-hidden">
      {/* Animated floating elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-10 left-10 w-24 h-24 bg-gradient-to-br from-lime-400/20 to-lime-500/30 rounded-full animate-bounce blur-sm"></div>
        <div className="absolute top-32 right-20 w-20 h-20 bg-gradient-to-br from-lime-300/20 to-lime-400/25 rounded-full animate-pulse"></div>
        <div className="absolute bottom-20 left-1/4 w-28 h-28 bg-gradient-to-br from-lime-400/15 to-lime-500/20 rounded-full animate-bounce blur-sm" style={{ animationDelay: '0.5s' }}></div>
        <div className="absolute bottom-32 right-10 w-16 h-16 bg-gradient-to-br from-lime-400/25 to-lime-500/30 rounded-full animate-pulse" style={{ animationDelay: '0.7s' }}></div>
        <div className="absolute top-1/2 left-5 w-18 h-18 bg-gradient-to-br from-lime-300/20 to-lime-400/25 rounded-full animate-bounce blur-sm" style={{ animationDelay: '1s' }}></div>
        
        {/* Geometric shapes */}
        <div className="absolute top-20 right-1/4 w-10 h-10 border-2 border-lime-400/30 transform rotate-45 animate-spin opacity-30" style={{ animationDuration: '8s' }}></div>
        <div className="absolute bottom-40 left-1/3 w-8 h-8 bg-gradient-to-r from-lime-400/25 to-lime-500/30 transform rotate-12 animate-pulse opacity-25"></div>
      </div>

      <div className="w-full max-w-md bg-gray-800/90 backdrop-blur-xl shadow-2xl rounded-2xl p-8 border border-gray-700 transform hover:scale-105 transition-all duration-500 relative group">
        {/* Gradient border glows */}
        <div className="absolute inset-0 bg-gradient-to-r from-lime-400 via-lime-500 to-lime-400 rounded-2xl opacity-0 group-hover:opacity-20 transition-opacity duration-500 blur-xl"></div>
        
        <div className="relative z-10">
          <h2 className="text-3xl font-bold text-center text-lime-400 mb-6 transform hover:scale-105 transition-transform duration-300 animate-fade-in">
            User Signup
          </h2>

          <form onSubmit={handleSignup} className="space-y-4">
            <input
              type="text"
              placeholder="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 bg-gray-700/70 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-lime-400 focus:border-transparent transform hover:scale-105 transition-all duration-300 hover:shadow-lg hover:shadow-lime-400/10 text-white placeholder-gray-400 backdrop-blur-sm animate-slide-up"
              style={{ animationDelay: '0.1s' }}
              required
            />
            <input
              type="email"
              placeholder="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-gray-700/70 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-lime-400 focus:border-transparent transform hover:scale-105 transition-all duration-300 hover:shadow-lg hover:shadow-lime-400/10 text-white placeholder-gray-400 backdrop-blur-sm animate-slide-up"
              style={{ animationDelay: '0.2s' }}
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-gray-700/70 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-lime-400 focus:border-transparent transform hover:scale-105 transition-all duration-300 hover:shadow-lg hover:shadow-lime-400/10 text-white placeholder-gray-400 backdrop-blur-sm animate-slide-up"
              style={{ animationDelay: '0.3s' }}
              required
            />
            <input
              type="password"
              placeholder="Re-enter Password"
              value={rePassword}
              onChange={(e) => setRePassword(e.target.value)}
              className="w-full px-4 py-3 bg-gray-700/70 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-lime-400 focus:border-transparent transform hover:scale-105 transition-all duration-300 hover:shadow-lg hover:shadow-lime-400/10 text-white placeholder-gray-400 backdrop-blur-sm animate-slide-up"
              style={{ animationDelay: '0.4s' }}
              required
            />

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-lime-400 to-lime-500 text-black py-3 rounded-lg font-semibold hover:from-lime-500 hover:to-lime-600 transition-all duration-300 transform hover:scale-105 active:scale-95 hover:shadow-xl hover:shadow-lime-400/30 relative overflow-hidden group/btn animate-slide-up"
              style={{ animationDelay: '0.5s' }}
            >
              <span className="relative z-10 group-hover/btn:animate-pulse">Sign Up</span>
              {/* Shimmer overlay effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/25 to-white/0 transform skew-x-12 -translate-x-full group-hover/btn:translate-x-full transition-transform duration-700"></div>
            </button>
          </form>

          <div className="mt-6 text-center animate-slide-up" style={{ animationDelay: '0.6s' }}>
            {/* Enhanced OR divider */}
            <div className="relative mb-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-600"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-gray-800 text-gray-400 rounded-full border border-gray-600 hover:border-lime-400 hover:text-lime-400 transition-all duration-300">
                  OR
                </span>
              </div>
            </div>

            <button
              onClick={handleGoogleSignup}
              className="w-full bg-gray-700/70 border border-gray-600 text-white py-3 rounded-lg flex items-center justify-center gap-3 hover:bg-gray-600/70 hover:border-gray-500 transform hover:scale-105 active:scale-95 hover:shadow-lg hover:shadow-lime-400/10 transition-all duration-300 relative overflow-hidden group/google animate-slide-up"
              style={{ animationDelay: '0.7s' }}
            >
              <img
                src="https://www.svgrepo.com/show/355037/google.svg"
                alt="Google"
                className="w-5 h-5 transform group-hover/google:rotate-12 transition-transform duration-300"
              />
              <span className="font-medium group-hover/google:text-lime-400 transition-colors duration-300">Continue with Google</span>
            </button>
          </div>

          <p className="text-center text-gray-400 mt-6 transform hover:scale-105 transition-transform duration-300 animate-slide-up" style={{ animationDelay: '0.8s' }}>
            Already have an account?{" "}
            <span
              onClick={() => navigate("/login")}
              className="text-lime-400 font-semibold cursor-pointer hover:text-lime-300 transition-colors duration-300 relative group/login"
            >
              Login
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-lime-400 to-lime-500 group-hover/login:w-full transition-all duration-300"></span>
              <span className="absolute inset-0 bg-lime-400/10 opacity-0 group-hover/login:opacity-100 rounded transition-opacity duration-300 -z-10"></span>
            </span>
          </p>
        </div>

        {/* Animated particles inside the form */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
          <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-lime-400 rounded-full opacity-30 animate-ping" style={{ animationDelay: '2s' }}></div>
          <div className="absolute top-3/4 right-1/4 w-1 h-1 bg-lime-500 rounded-full opacity-40 animate-ping" style={{ animationDelay: '3s' }}></div>
          <div className="absolute top-1/2 right-1/3 w-1.5 h-1.5 bg-lime-300 rounded-full opacity-25 animate-ping" style={{ animationDelay: '4s' }}></div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .animate-fade-in { animation: fade-in 0.8s ease-out; }
        .animate-slide-up { animation: slide-up 0.8s ease-out; }
      `}</style>
    </div>
  );
}

export default UserSignupForm;
