import React, { useState, useEffect } from "react";
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const backendUrl = import.meta.env.VITE_BACKEND_URL;

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Helper: save user in backend
  const saveUserToBackend = async (userData) => {
    try {
      const response = await fetch(`${backendUrl}/api/users/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to save user to backend");
      }
      
      return await response.json();
    } catch (err) {
      console.error("Error saving to backend:", err);
      throw err;
    }
  };

  // Normal Signup
  const handleSignup = async (e) => {
    e.preventDefault();
    setError("");
    
    // Validation
    if (!name.trim()) {
      setError("Please enter your full name");
      return;
    }
    
    if (password.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }
    
    if (password !== rePassword) {
      setError("Passwords do not match");
      return;
    }
    
    setLoading(true);
    
    try {
      // Create Firebase user
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      
      // Update Firebase profile with display name
      await updateProfile(userCredential.user, { displayName: name });

      // Save to backend with Firebase UID
      await saveUserToBackend({
        uid: userCredential.user.uid,
        name: name.trim(),
        email: email.toLowerCase(),
        signupMethod: "email",
      });

      alert("Signup successful! Please login.");
      navigate("/login");
    } catch (error) {
      console.error("Signup error:", error);
      
      // Handle specific Firebase errors
      if (error.code === "auth/email-already-in-use") {
        setError("This email is already registered. Please login instead.");
      } else if (error.code === "auth/invalid-email") {
        setError("Please enter a valid email address.");
      } else if (error.code === "auth/weak-password") {
        setError("Password is too weak. Please use a stronger password.");
      } else {
        setError(error.message || "Signup failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Google Signup
  const handleGoogleSignup = async () => {
    setError("");
    setLoading(true);
    
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      console.log("Google Sign-In successful:", user);

      // Save to backend with Firebase UID
      await saveUserToBackend({
        uid: user.uid,         
        name: user.displayName || "Google User",
        email: user.email,
        signupMethod: "google",
        photoURL: user.photoURL || null,
      });

      // Navigate to dashboard
      navigate("/user-dashboard");
    } catch (error) {
      console.error("Google signup error:", error);
      
      // Handle specific errors
      if (error.code === "auth/popup-closed-by-user") {
        setError("Sign-in cancelled. Please try again.");
      } else if (error.code === "auth/popup-blocked") {
        setError("Popup was blocked. Please allow popups for this site.");
      } else if (error.code === "auth/account-exists-with-different-credential") {
        setError("An account already exists with this email using a different sign-in method.");
      } else {
        setError(error.message || "Google sign-in failed. Please try again.");
      }
    } finally {
      setLoading(false);
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

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-300 text-sm animate-slide-down">
              {error}
            </div>
          )}

          <form onSubmit={handleSignup} className="space-y-4">
            <input
              type="text"
              placeholder="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
              className="w-full px-4 py-3 bg-gray-700/70 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-lime-400 focus:border-transparent transform hover:scale-105 transition-all duration-300 hover:shadow-lg hover:shadow-lime-400/10 text-white placeholder-gray-400 backdrop-blur-sm animate-slide-up disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ animationDelay: '0.1s' }}
              required
            />
            <input
              type="email"
              placeholder="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              className="w-full px-4 py-3 bg-gray-700/70 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-lime-400 focus:border-transparent transform hover:scale-105 transition-all duration-300 hover:shadow-lg hover:shadow-lime-400/10 text-white placeholder-gray-400 backdrop-blur-sm animate-slide-up disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ animationDelay: '0.2s' }}
              required
            />
            <input
              type="password"
              placeholder="Password (min 6 characters)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              className="w-full px-4 py-3 bg-gray-700/70 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-lime-400 focus:border-transparent transform hover:scale-105 transition-all duration-300 hover:shadow-lg hover:shadow-lime-400/10 text-white placeholder-gray-400 backdrop-blur-sm animate-slide-up disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ animationDelay: '0.3s' }}
              required
              minLength={6}
            />
            <input
              type="password"
              placeholder="Re-enter Password"
              value={rePassword}
              onChange={(e) => setRePassword(e.target.value)}
              disabled={loading}
              className="w-full px-4 py-3 bg-gray-700/70 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-lime-400 focus:border-transparent transform hover:scale-105 transition-all duration-300 hover:shadow-lg hover:shadow-lime-400/10 text-white placeholder-gray-400 backdrop-blur-sm animate-slide-up disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ animationDelay: '0.4s' }}
              required
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-lime-400 to-lime-500 text-black py-3 rounded-lg font-semibold hover:from-lime-500 hover:to-lime-600 transition-all duration-300 transform hover:scale-105 active:scale-95 hover:shadow-xl hover:shadow-lime-400/30 relative overflow-hidden group/btn animate-slide-up disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ animationDelay: '0.5s' }}
            >
              <span className="relative z-10 group-hover/btn:animate-pulse">
                {loading ? "Signing up..." : "Sign Up"}
              </span>
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
              disabled={loading}
              className="w-full bg-white text-gray-800 py-3 rounded-lg flex items-center justify-center gap-3 hover:bg-gray-100 transform hover:scale-105 active:scale-95 hover:shadow-lg transition-all duration-300 relative overflow-hidden group/google animate-slide-up disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
              style={{ animationDelay: '0.7s' }}
            >
              <svg className="w-5 h-5 transform group-hover/google:rotate-12 transition-transform duration-300" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span className="group-hover/google:text-gray-900 transition-colors duration-300">
                {loading ? "Signing up..." : "Continue with Google"}
              </span>
            </button>
          </div>

          <p className="text-center text-gray-400 mt-6 transform hover:scale-105 transition-transform duration-300 animate-slide-up" style={{ animationDelay: '0.8s' }}>
            Already have an account?{" "}
            <span
              onClick={() => !loading && navigate("/login")}
              className={`text-lime-400 font-semibold ${loading ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:text-lime-300'} transition-colors duration-300 relative group/login`}
            >
              Login
              {!loading && (
                <>
                  <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-lime-400 to-lime-500 group-hover/login:w-full transition-all duration-300"></span>
                  <span className="absolute inset-0 bg-lime-400/10 opacity-0 group-hover/login:opacity-100 rounded transition-opacity duration-300 -z-10"></span>
                </>
              )}
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
        
        @keyframes slide-down {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .animate-fade-in { animation: fade-in 0.8s ease-out; }
        .animate-slide-up { animation: slide-up 0.8s ease-out; }
        .animate-slide-down { animation: slide-down 0.4s ease-out; }

        /* Custom scrollbar */
        ::-webkit-scrollbar {
          width: 8px;
        }
        
        ::-webkit-scrollbar-track {
          background: #1f2937;
        }
        
        ::-webkit-scrollbar-thumb {
          background: #84cc16;
          border-radius: 4px;
        }
        
        ::-webkit-scrollbar-thumb:hover {
          background: #65a30d;
        }
      `}</style>
    </div>
  );
}

export default UserSignupForm;