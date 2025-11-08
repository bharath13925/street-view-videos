import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, Shield, Globe, Navigation, Brain, Film, Waves, Activity, Laptop, Camera, Map } from "lucide-react";
import { auth } from "../firebase";
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";

import streetview from "../assets/streetview.jpeg";
import routeplanning from "../assets/routeplanning.jpeg";
import blog1 from "../assets/blog1.png";
import blog2 from "../assets/blog2.png";
import blog3 from "../assets/blog3.png";
import MapsBackgroundImage from "../assets/MapsBackgroundImage.jpeg";
import FAQ from "./Faq";

const MainPage = () => {
  const navigate = useNavigate();
  const [currentImage, setCurrentImage] = useState(0);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // Carousel images
  const images = [
    routeplanning,
    streetview,
    "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&h=450&fit=crop",
    "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=800&h=450&fit=crop"
  ];

  // Auto-slide every 4s
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImage((prevIndex) =>
        prevIndex === images.length - 1 ? 0 : prevIndex + 1
      );
    }, 4000);
    return () => clearInterval(interval);
  }, [images.length]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleGoogleSignIn = async () => {
    setIsAuthenticating(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      
      // Get the user info
      const user = result.user;
      console.log("Google Sign-In successful:", user);
      
      // Navigate to user dashboard
      navigate("/user-dashboard");
    } catch (error) {
      console.error("Google Sign-In error:", error);
      alert(`Google Sign-In failed: ${error.message}`);
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleLogin = () => {
    navigate("/login");
  };

  const handleSignup = () => {
    navigate("/user-signup");
  };

  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  const features = [
    {
      icon: <Map className="text-5xl text-lime-400 mx-auto mb-4 transition-all duration-300 group-hover:scale-110 group-hover:text-lime-300" />,
      title: "Smart Route Mapping",
      description: "Generates optimal routes between start and end points using Google Directions API."
    },
    {
      icon: <Globe className="text-5xl text-lime-400 mx-auto mb-4 transition-all duration-300 group-hover:scale-110 group-hover:text-lime-300" />,
      title: "Street View Integration",
      description: "Displays realistic 360° Street View imagery for a real-world route preview."
    },
    {
      icon: <Camera className="text-5xl text-lime-400 mx-auto mb-4 transition-all duration-300 group-hover:scale-110 group-hover:text-lime-300" />,
      title: "Visual Odometry Refinement",
      description: "Enhances orientation accuracy using ORB feature detection and affine transformation."
    },
    {
      icon: <Brain className="text-5xl text-lime-400 mx-auto mb-4 transition-all duration-300 group-hover:scale-110 group-hover:text-lime-300" />,
      title: "LSTM-Based Smoothing",
      description: "Applies deep learning to remove GPS noise and generate smooth, continuous route motion."
    },
    {
      icon: <Film className="text-5xl text-lime-400 mx-auto mb-4 transition-all duration-300 group-hover:scale-110 group-hover:text-lime-300" />,
      title: "Video Generation",
      description: "Creates a seamless and realistic route visualization video using interpolated Street View frames."
    },
    {
      icon: <Waves className="text-5xl text-lime-400 mx-auto mb-4 transition-all duration-300 group-hover:scale-110 group-hover:text-lime-300" />,
      title: "Optical Flow Interpolation",
      description: "Generates intermediate frames with Farneback and RAFT algorithms for smoother playback."
    },
    {
      icon: <Activity className="text-5xl text-lime-400 mx-auto mb-4 transition-all duration-300 group-hover:scale-110 group-hover:text-lime-300" />,
      title: "Performance Metrics",
      description: "Analyzes heading smoothness, frame success rate, and total processing time for route visualization."
    },
    {
      icon: <Navigation className="text-5xl text-lime-400 mx-auto mb-4 transition-all duration-300 group-hover:scale-110 group-hover:text-lime-300" />,
      title: "Static Map Display",
      description: "Generates a Google Static Map highlighting start and end points with the complete route overlay."
    },
    {
      icon: <Laptop className="text-5xl text-lime-400 mx-auto mb-4 transition-all duration-300 group-hover:scale-110 group-hover:text-lime-300" />,
      title: "Interactive Dashboard",
      description: "Provides a GUI for user input, progress tracking, and viewing of map and video outputs."
    },
    {
      icon: <Shield className="text-5xl text-lime-400 mx-auto mb-4 transition-all duration-300 group-hover:scale-110 group-hover:text-lime-300" />,
      title: "Fallback Mechanism",
      description: "Ensures robust performance by reverting to GPS headings when visual odometry fails."
    }
  ];

  return (
    <div className="min-h-screen bg-black overflow-x-hidden">
      {/* Hero Section with Map Background */}
      <section className="relative bg-black py-20 overflow-hidden">
        {/* Animated Indian Map Background */}
        <div className="absolute inset-0 opacity-40">
          <div 
            className="indian-map-background"
            style={{
              backgroundImage: `url(${MapsBackgroundImage})`,
            }}
          ></div>
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-black/60"></div>
        </div>
        
        {/* Glowing animated elements */}
        <div className="absolute inset-0">
          <div className="absolute top-10 left-10 w-20 h-20 bg-lime-400 opacity-20 rounded-full animate-bounce blur-sm"></div>
          <div className="absolute top-32 right-20 w-16 h-16 bg-lime-400 opacity-20 rounded-full animate-bounce delay-1000 blur-sm"></div>
          <div className="absolute bottom-20 left-32 w-12 h-12 bg-lime-400 opacity-20 rounded-full animate-bounce delay-500 blur-sm"></div>
        </div>
        
        <div className="container mx-auto px-4 text-center relative z-10">
          <div className="flex justify-center items-center mb-6 animate-fade-in">
            <MapPin className="text-lime-400 text-6xl mr-4 animate-spin-slow drop-shadow-2xl" />
            <h1 className="text-5xl font-bold text-white animate-slide-up drop-shadow-2xl">RouteVision</h1>
          </div>
          <p className="text-xl text-gray-300 mb-8 animate-slide-up delay-300 max-w-3xl mx-auto drop-shadow-lg">
            Discover routes with immersive video experiences and Street View integration
          </p>
          <div className="flex justify-center gap-4 animate-slide-up delay-500">
            <button
              onClick={() => scrollToSection("features")}
              className="group border-2 border-lime-400 text-lime-400 px-8 py-3 rounded-lg font-semibold hover:bg-lime-400 hover:text-black transition-all duration-300 transform hover:scale-105 hover:shadow-xl hover:shadow-lime-400/20 cursor-pointer"
            >
              <span className="group-hover:animate-pulse">Learn More</span>
            </button>
          </div>
        </div>
      </section>

      {/* Carousel Section */}
      <section className="py-16 bg-gradient-to-b from-gray-900 to-black">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-12 text-white animate-fade-in">
            Experience Route Visualization
          </h2>
          <div className="relative max-w-5xl mx-auto group">
            <div className="relative overflow-hidden rounded-2xl shadow-2xl aspect-[16/9] transform transition-all duration-500 group-hover:scale-105 group-hover:shadow-3xl border border-gray-700">
              {images.map((image, index) => (
                <div
                  key={index}
                  className={`absolute inset-0 transition-all duration-1000 ${
                    index === currentImage ? "opacity-100 scale-100" : "opacity-0 scale-110"
                  }`}
                >
                  <img
                    src={image}
                    alt={`Slide ${index + 1}`}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "contain",
                      transition: "opacity 0.5s ease, transform 1s ease",
                      opacity: index === currentImage ? 1 : 0,
                    }}
                    className="transition-transform duration-1000"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                </div>
              ))}
              
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-lime-400/10 to-transparent -translate-x-full animate-shimmer"></div>
            </div>

            <div className="flex justify-center mt-6 space-x-2">
              {images.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentImage(index)}
                  className={`w-3 h-3 rounded-full transition-all duration-300 transform hover:scale-125 cursor-pointer ${
                    index === currentImage ? "bg-lime-400 scale-125 animate-pulse shadow-lg shadow-lime-400/50" : "bg-gray-600 hover:bg-gray-500"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Login/Signup Section with Google Sign-In */}
      <section className="py-16 bg-gradient-to-r from-gray-900 to-black">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold mb-8 text-white animate-fade-in">Join RouteVision</h2>
          <p className="text-xl text-gray-300 mb-12 max-w-2xl mx-auto animate-fade-in delay-200">
            Create your account to access personalized routes, save favorites, and share your discoveries
          </p>
          <div className="bg-gray-800 border border-gray-700 rounded-2xl p-8 max-w-md mx-auto shadow-2xl transform transition-all duration-500 hover:scale-105 hover:shadow-3xl hover:shadow-lime-400/10 animate-slide-up delay-400">
            <div className="mb-6">
              <div className="w-16 h-16 bg-gradient-to-r from-lime-400 to-lime-500 rounded-full mx-auto mb-4 flex items-center justify-center animate-bounce shadow-lg shadow-lime-400/30">
                <MapPin className="text-black text-2xl" />
              </div>
              <h3 className="text-2xl font-bold text-white">Get Started</h3>
            </div>
            <div className="space-y-4">
              <button
                onClick={handleSignup}
                disabled={isAuthenticating}
                className="group w-full bg-gradient-to-r from-lime-400 to-lime-500 text-black py-3 rounded-lg font-semibold transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-lime-400/30 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="group-hover:animate-pulse">Sign Up Now</span>
              </button>
              
              {/* Divider */}
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-600"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-gray-800 text-gray-400">Or</span>
                </div>
              </div>
              
              {/* Google Sign In Button */}
              <button
                onClick={handleGoogleSignIn}
                disabled={isAuthenticating}
                className="w-full bg-white text-gray-800 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-all duration-300 transform hover:scale-105 hover:shadow-xl flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <span>{isAuthenticating ? "Signing in..." : "Continue with Google"}</span>
              </button>
              
              <p className="text-gray-400 animate-fade-in mt-6">Already have an account?</p>
              <button
                onClick={handleLogin}
                disabled={isAuthenticating}
                className="group w-full border-2 border-lime-400 text-lime-400 py-3 rounded-lg font-semibold hover:bg-lime-400 hover:text-black transition-all duration-300 transform hover:scale-105 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="group-hover:animate-pulse">Log In</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-16 bg-gradient-to-b from-black to-gray-900">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-12 text-white animate-fade-in">
            Powerful Features
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <div
                key={index}
                className="group relative bg-gray-800 border border-gray-700 p-6 rounded-2xl shadow-lg text-center transition-all duration-500 transform hover:scale-110 hover:shadow-2xl hover:shadow-lime-400/20 hover:-translate-y-2 cursor-pointer animate-slide-up hover:border-lime-400/50"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="mb-4 transform transition-transform duration-300 group-hover:rotate-12">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-bold mb-3 text-white group-hover:text-lime-400 transition-colors duration-300">
                  {feature.title}
                </h3>
                <p className="text-gray-400 text-sm group-hover:text-gray-300 transition-colors duration-300">
                  {feature.description}
                </p>
                
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-lime-400 to-lime-500 opacity-0 group-hover:opacity-10 transition-opacity duration-300 -z-10 blur-sm"></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Blog Section */}
      <section id="blog" className="py-16 bg-gray-900">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-12 text-white animate-fade-in">
            Latest From Our Blog
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[blog1, blog2, blog3].map((blogImg, idx) => (
              <article
                key={idx}
                className="group bg-gray-800 border border-gray-700 rounded-2xl overflow-hidden shadow-lg transition-all duration-500 transform hover:scale-105 hover:shadow-2xl hover:shadow-lime-400/10 hover:-translate-y-2 cursor-pointer animate-slide-up hover:border-lime-400/50"
                style={{ animationDelay: `${idx * 200}ms` }}
              >
                <div className="relative overflow-hidden">
                  <img 
                    src={blogImg} 
                    alt="Blog post" 
                    className="w-full h-48 object-cover transition-transform duration-500 group-hover:scale-110" 
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-bold mb-3 text-white group-hover:text-lime-400 transition-colors duration-300">
                    {idx === 0
                      ? "Best Routes for City Exploration"
                      : idx === 1
                      ? "Navigation Tips for Beginners"
                      : "Google Maps API Integration"}
                  </h3>
                  <p className="text-gray-400 mb-4 group-hover:text-gray-300 transition-colors duration-300">
                    {idx === 0
                      ? "Discover hidden gems in urban landscapes with our curated route recommendations..."
                      : idx === 1
                      ? "Master the art of navigation with these essential tips and tricks..."
                      : "Learn how we leverage Google Maps API to provide superior route planning..."}
                  </p>
                  <button
                    onClick={() =>
                      navigate(
                        idx === 0
                          ? "/blog/city-exploration"
                          : idx === 1
                          ? "/blog/navigation-tips"
                          : "/blog/maps-api"
                      )
                    }
                    className="group/btn flex items-center text-lime-400 font-semibold hover:text-lime-300 transition-colors duration-300"
                  >
                    <span className="group-hover/btn:translate-x-2 transition-transform duration-300">Read More</span>
                    <span className="ml-2 group-hover/btn:translate-x-2 transition-transform duration-300">→</span>
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <FAQ/>

      <style jsx>{`
        .indian-map-background {
          position: absolute;
          top: -20%;
          left: -20%;
          width: 140%;
          height: 140%;
          background-size: cover;
          background-position: center;
          background-repeat: no-repeat;
          animation: mapAnimation 25s ease-in-out infinite;
          filter: brightness(1.3) contrast(1.2) saturate(1.1);
        }

        @keyframes mapAnimation {
          0% { 
            transform: scale(1) rotate(0deg) translateX(0) translateY(0);
          }
          20% { 
            transform: scale(1.1) rotate(2deg) translateX(-30px) translateY(-20px);
          }
          40% { 
            transform: scale(0.95) rotate(-1deg) translateX(25px) translateY(15px);
          }
          60% { 
            transform: scale(1.05) rotate(1.5deg) translateX(-15px) translateY(-30px);
          }
          80% { 
            transform: scale(0.98) rotate(-0.5deg) translateX(20px) translateY(10px);
          }
          100% { 
            transform: scale(1) rotate(0deg) translateX(0) translateY(0);
          }
        }
        
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        
        .animate-fade-in { animation: fade-in 0.8s ease-out; }
        .animate-slide-up { animation: slide-up 0.8s ease-out; }
        .animate-spin-slow { animation: spin-slow 3s linear infinite; }
        .animate-shimmer { animation: shimmer 2s infinite; }
        
        .delay-200 { animation-delay: 200ms; }
        .delay-300 { animation-delay: 300ms; }
        .delay-400 { animation-delay: 400ms; }
        .delay-500 { animation-delay: 500ms; }
        .delay-1000 { animation-delay: 1000ms; }
        
        .hover\\:shadow-3xl:hover { box-shadow: 0 35px 60px -12px rgba(0, 0, 0, 0.25); }

        @media (max-width: 768px) {
          .indian-map-background {
            animation-duration: 30s;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .indian-map-background {
            animation: none;
            transform: scale(1.05);
          }
        }

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
};

export default MainPage;