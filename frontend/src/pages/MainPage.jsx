// MainPage.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, Shield, Zap, Globe } from "lucide-react";

import img1 from "../assets/streetview.jpeg";
import img2 from "../assets/video.jpeg";
import img3 from "../assets/routeplanning.jpeg";
import img4 from "../assets/explore.jpeg";
import blog1 from "../assets/blog1.png";
import blog2 from "../assets/blog2.png";
import blog3 from "../assets/blog3.png";

const MainPage = () => {
  const navigate = useNavigate();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // ✅ Carousel images
  const carouselImages = [
    { src: img1, alt: "Route Visualization with Street View", title: "Street View" },
    { src: img2, alt: "Immersive Video Experience", title: "Immersive Videos" },
    { src: img3, alt: "Navigation Features", title: "Smart Navigation" },
    { src: img4, alt: "City Routes", title: "Explore Routes" },
  ];

  // Auto-slide every 4s
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) =>
        prevIndex === carouselImages.length - 1 ? 0 : prevIndex + 1
      );
    }, 4000);
    return () => clearInterval(interval);
  }, [carouselImages.length]);

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

  return (
    <div className="min-h-screen bg-white">
      {/* Logo Section */}
      <section className="bg-gradient-to-r from-lime-400 to-lime-500 py-20">
        <div className="container mx-auto px-4 text-center">
          <div className="flex justify-center items-center mb-6">
            <MapPin className="text-white text-6xl mr-4" />
            <h1 className="text-5xl font-bold text-white">RouteVision</h1>
          </div>
          <p className="text-xl text-white mb-8">
            Discover routes with immersive video experiences and Street View integration
          </p>
          <div className="flex justify-center gap-4">
            <button
              onClick={() => scrollToSection("features")}
              className="border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-lime-500 transition duration-300"
            >
              Learn More
            </button>
          </div>
        </div>
      </section>

      {/* Image Carousel */}
            <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-12 text-gray-800">
            Experience Route Visualization
          </h2>
          <div className="relative max-w-4xl mx-auto">
            <div className="relative overflow-hidden rounded-2xl shadow-2xl h-96">
              {carouselImages.map((image, index) => (
                <div
                  key={index}
                  className={`absolute inset-0 transition-opacity duration-1000 ${
                    index === currentImageIndex ? "opacity-100" : "opacity-0"
                  }`}
                >
                  {/* ✅ Improved clarity with cover + overlay */}
                  <img
                    src={image.src}
                    alt={image.alt}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-black/20"></div>
                </div>
              ))}
            </div>

            {/* Carousel Indicators */}
            <div className="flex justify-center mt-6 space-x-2">
              {carouselImages.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentImageIndex(index)}
                  className={`w-3 h-3 rounded-full transition duration-300 ${
                    index === currentImageIndex ? "bg-lime-500" : "bg-gray-300"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Login/Signup Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold mb-8 text-gray-800">Join RouteVision</h2>
          <p className="text-xl text-gray-600 mb-12 max-w-2xl mx-auto">
            Create your account to access personalized routes, save favorites, and share your discoveries
          </p>
          <div className="bg-gray-50 rounded-xl p-8 max-w-md mx-auto shadow-lg">
            <h3 className="text-2xl font-bold mb-6 text-gray-800">Get Started</h3>
            <div className="space-y-4">
              <button
                onClick={handleSignup}
                className="w-full bg-lime-500 text-white py-3 rounded-lg font-semibold hover:bg-lime-600 transition duration-300"
              >
                Sign Up Now
              </button>
              <p className="text-gray-600">Already have an account?</p>
              <button
                onClick={handleLogin}
                className="w-full border-2 border-lime-500 text-lime-500 py-3 rounded-lg font-semibold hover:bg-lime-500 hover:text-white transition duration-300"
              >
                Log In
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-12 text-gray-800">
            Powerful Features
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-xl shadow-lg text-center hover:shadow-xl transition duration-300">
              <Globe className="text-5xl text-lime-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-4 text-gray-800">Street View Integration</h3>
              <p className="text-gray-600">
                Immersive 360-degree street views of your routes before you travel
              </p>
            </div>
            <div className="bg-white p-8 rounded-xl shadow-lg text-center hover:shadow-xl transition duration-300">
              <Zap className="text-5xl text-lime-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-4 text-gray-800">Real-time Updates</h3>
              <p className="text-gray-600">
                More realistic and user-friendly navigation previews.
              </p>
            </div>
            <div className="bg-white p-8 rounded-xl shadow-lg text-center hover:shadow-xl transition duration-300">
              <Shield className="text-5xl text-lime-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-4 text-gray-800">Safe & Secure</h3>
              <p className="text-gray-600">
                Enjoy smooth and secure route video experiences, optimized for travelers in Vijayawada and beyond.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Blogs Section */}
      <section id="blog" className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-12 text-gray-800">
            Latest From Our Blog
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[blog1, blog2, blog3].map((blogImg, idx) => (
              <article
                key={idx}
                className="bg-gray-50 rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition duration-300"
              >
                {/* ✅ Fixed blog thumbnails */}
                <img src={blogImg} alt="Blog post" className="w-full h-48 object-cover" />
                <div className="p-6">
                  <h3 className="text-xl font-bold mb-3 text-gray-800">
                    {idx === 0
                      ? "Best Routes for City Exploration"
                      : idx === 1
                      ? "Navigation Tips for Beginners"
                      : "Google Maps API Integration"}
                  </h3>
                  <p className="text-gray-600 mb-4">
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
                    className="text-lime-500 font-semibold hover:text-lime-600"
                  >
                    Read More →
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-12 text-gray-800">
            Frequently Asked Questions
          </h2>
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <h3 className="text-xl font-bold mb-3 text-gray-800">How does RouteVision work?</h3>
              <p className="text-gray-600">
                RouteVision combines Google Maps API with Street View integration to provide immersive route visualization. Simply enter your destination and explore routes with 360-degree video previews.
              </p>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <h3 className="text-xl font-bold mb-3 text-gray-800">Is RouteVision free to use?</h3>
              <p className="text-gray-600">
                We offer both free and premium plans. The free plan includes basic route finding, while premium features include unlimited route saving, offline maps, and advanced customization options.
              </p>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <h3 className="text-xl font-bold mb-3 text-gray-800">Can I use RouteVision offline?</h3>
              <p className="text-gray-600">
                With our premium plan, you can download maps and routes for offline use. Perfect for areas with limited internet connectivity.
              </p>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <h3 className="text-xl font-bold mb-3 text-gray-800">How accurate are the routes?</h3>
              <p className="text-gray-600">
                Our routes are powered by Google Maps API, ensuring high accuracy and real-time updates for traffic conditions, road closures, and optimal path calculation.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default MainPage;
