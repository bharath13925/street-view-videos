import React, { useState ,useEffect} from "react";
import { auth } from "../firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useNavigate } from "react-router-dom";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
}, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate("/user-dashboard");
      console.log("Login logic here");
    } catch (error) {
      alert(error.message);
    }
  };

  const handleSignupClick = () => {
    navigate("/user-signup");
    console.log("Navigate to signup");
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-black relative overflow-hidden">
      {/* Floating circles with dark theme */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-10 left-10 w-20 h-20 bg-lime-400/20 rounded-full animate-bounce blur-sm"></div>
        <div className="absolute top-32 right-20 w-16 h-16 bg-lime-400/25 rounded-full animate-pulse"></div>
        <div className="absolute bottom-20 left-1/4 w-24 h-24 bg-lime-400/15 rounded-full animate-bounce blur-sm" style={{ animationDelay: '0.5s' }}></div>
        <div className="absolute bottom-32 right-10 w-12 h-12 bg-lime-400/30 rounded-full animate-pulse" style={{ animationDelay: '0.7s' }}></div>
        <div className="absolute top-1/2 left-10 w-14 h-14 bg-lime-400/20 rounded-full animate-bounce blur-sm" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-3/4 right-1/3 w-18 h-18 bg-lime-400/25 rounded-full animate-pulse" style={{ animationDelay: '1.2s' }}></div>
        
        {/* Additional geometric shapes */}
        <div className="absolute top-1/4 right-1/4 w-8 h-8 border-2 border-lime-400/30 transform rotate-45 animate-spin opacity-30" style={{ animationDuration: '6s' }}></div>
        <div className="absolute bottom-1/3 left-1/4 w-6 h-6 bg-lime-400/20 transform rotate-12 animate-pulse"></div>
      </div>

      <div className="w-full max-w-md bg-gray-800/90 backdrop-blur-xl shadow-2xl rounded-2xl p-8 border border-gray-700 transform hover:scale-105 transition-all duration-500 hover:shadow-3xl hover:shadow-lime-400/10 relative group">
        {/* Gradient border glow */}
        <div className="absolute inset-0 bg-gradient-to-r from-lime-400 to-lime-500 rounded-2xl opacity-0 group-hover:opacity-20 transition-all duration-500 blur-xl"></div>
        
        <div className="relative z-10">
          <h2 className="text-3xl font-bold text-center text-lime-400 mb-6 transform hover:scale-105 transition-transform duration-300 animate-fade-in">
            User Login
          </h2>

          <form onSubmit={handleLogin} className="space-y-4">
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

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-lime-400 to-lime-500 text-black py-3 rounded-lg font-semibold hover:from-lime-500 hover:to-lime-600 transition-all duration-300 transform hover:scale-105 active:scale-95 hover:shadow-xl hover:shadow-lime-400/30 relative overflow-hidden group/btn animate-slide-up"
              style={{ animationDelay: '0.4s' }}
            >
              <span className="relative z-10 group-hover/btn:animate-pulse">Login</span>
              {/* Shimmer overlay effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 transform skew-x-12 -translate-x-full group-hover/btn:translate-x-full transition-transform duration-700"></div>
            </button>
          </form>

          <p className="text-center text-gray-400 mt-6 transform hover:scale-105 transition-transform duration-300 animate-slide-up" style={{ animationDelay: '0.5s' }}>
            Don't have an account?{" "}
            <span
              onClick={handleSignupClick}
              className="text-lime-400 font-semibold cursor-pointer hover:text-lime-300 transition-colors duration-300 relative group/signup"
            >
              Sign Up
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-lime-400 to-lime-500 group-hover/signup:w-full transition-all duration-300"></span>
              <span className="absolute inset-0 bg-lime-400/10 opacity-0 group-hover/signup:opacity-100 rounded transition-opacity duration-300 -z-10"></span>
            </span>
          </p>

          {/* Additional features section */}
          <div className="mt-8 pt-6 border-t border-gray-600 animate-slide-up" style={{ animationDelay: '0.6s' }}>
            <div className="text-center">
              <p className="text-gray-500 text-sm mb-4">Secure login with advanced encryption</p>
              <div className="flex justify-center space-x-4">
                <div className="w-2 h-2 bg-lime-400 rounded-full animate-pulse"></div>
                <div className="w-2 h-2 bg-lime-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-2 h-2 bg-lime-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
              </div>
            </div>
          </div>
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
        
        .hover\\:shadow-3xl:hover { 
          box-shadow: 0 35px 60px -12px rgba(0, 0, 0, 0.25); 
        }

        /* Custom scrollbar for consistency */
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

export default Login;