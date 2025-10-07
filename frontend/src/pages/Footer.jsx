import React from 'react';
import { MapPin, Instagram, Twitter, Github, Linkedin, Mail, Phone } from 'lucide-react';
import { useNavigate } from "react-router-dom";

const Footer = () => {
  const navigate = useNavigate();
  
  const handleNavigation = (path) => {
    if (path.startsWith('#')) {
      // For section navigation within the same page
      const sectionId = path.substring(1);
      const element = document.getElementById(sectionId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      // For page navigation - in a real app, you'd use React Router
      navigate(path);
    }
  };

  const handleSocialClick = (platform) => {
    // You can replace these with actual social media links
    const socialLinks = {
      instagram: 'https://www.instagram.com/stories/bharath_13925/',
      twitter: 'https://x.com/bharath13925',
      github: 'https://github.com/bharath13925',
      linkedin: 'https://www.linkedin.com/in/bandi-bharath-a3a97b2a3/'
    };
    
    window.open(socialLinks[platform], '_blank', 'noopener,noreferrer');
  };

  return (
    <footer className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white relative overflow-hidden">
      {/* Enhanced floating circles with bounce effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-10 left-10 w-32 h-32 bg-lime-500/10 rounded-full animate-pulse"></div>
        <div className="absolute top-20 right-20 w-24 h-24 bg-emerald-500/5 rounded-full animate-bounce" style={{ animationDelay: '1s' }}></div>
        <div className="absolute bottom-20 left-1/4 w-28 h-28 bg-lime-400/5 rounded-full animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute bottom-10 right-1/3 w-20 h-20 bg-emerald-400/10 rounded-full animate-bounce" style={{ animationDelay: '3s' }}></div>
        
        {/* Geometric shapes with transform combinations */}
        <div className="absolute top-1/4 left-1/5 w-8 h-8 border-2 border-lime-500/20 transform rotate-45 animate-spin" style={{ animationDuration: '12s' }}></div>
        <div className="absolute top-1/2 right-1/4 w-6 h-6 border border-emerald-500/30 rounded-full animate-ping" style={{ animationDelay: '4s' }}></div>
        <div className="absolute bottom-1/3 left-1/3 w-4 h-4 bg-lime-400/20 transform rotate-12 animate-pulse" style={{ animationDelay: '5s' }}></div>
      </div>

      {/* Gradient background pulse animation */}
      <div className="absolute inset-0 bg-gradient-to-t from-lime-500/5 via-transparent to-emerald-500/5 animate-pulse" style={{ animationDuration: '4s' }}></div>

      <div className="container mx-auto px-4 py-12 relative z-10">
        <div className="grid md:grid-cols-4 gap-8">
          {/* Company Info - Enhanced with logo spin animation */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center mb-4 group cursor-pointer" onClick={() => handleNavigation('/')}>
              <div className="relative">
                <MapPin className="text-lime-500 text-3xl mr-2 transform group-hover:rotate-12 group-hover:scale-110 transition-all duration-500" />
                {/* Glow effects on various elements */}
                <div className="absolute inset-0 text-lime-500 text-3xl mr-2 opacity-0 group-hover:opacity-40 blur-lg transition-all duration-500">
                  <MapPin />
                </div>
                {/* Multiple shadow levels */}
                <div className="absolute inset-0 border-2 border-lime-500 rounded-full opacity-0 group-hover:opacity-30 scale-0 group-hover:scale-150 transition-all duration-700"></div>
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-white via-lime-100 to-emerald-100 bg-clip-text text-transparent group-hover:from-lime-400 group-hover:via-lime-300 group-hover:to-emerald-300 transition-all duration-500">
                RouteVision
              </span>
            </div>
            
            <p className="text-gray-300 mb-6 max-w-md hover:text-gray-200 transition-colors duration-300 transform hover:scale-105">
              Discover the world through immersive route visualization. Navigate with confidence using our Street View integration and real-time route planning powered by Google Maps API.
            </p>
            <div className="flex space-x-4">
              <button
                onClick={() => handleSocialClick('instagram')}
                className="bg-gradient-to-r from-pink-500 to-purple-500 p-3 rounded-full hover:from-pink-600 hover:to-purple-600 transition-all duration-300 transform hover:scale-125 hover:rotate-12 active:scale-95 relative overflow-hidden group shadow-lg hover:shadow-xl"
                aria-label="Instagram"
              >
                <Instagram className="text-xl relative z-10 transform group-hover:scale-110 transition-transform duration-300" />
                <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/30 to-white/0 transform skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
              </button>
              <button
                onClick={() => handleSocialClick('twitter')}
                className="bg-gradient-to-r from-blue-400 to-blue-600 p-3 rounded-full hover:from-blue-500 hover:to-blue-700 transition-all duration-300 transform hover:scale-125 hover:rotate-12 active:scale-95 relative overflow-hidden group shadow-lg hover:shadow-xl"
                aria-label="Twitter"
              >
                <Twitter className="text-xl relative z-10 transform group-hover:scale-110 transition-transform duration-300" />
                <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/30 to-white/0 transform skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
              </button>
              <button
                onClick={() => handleSocialClick('github')}
                className="bg-gradient-to-r from-gray-700 to-gray-900 p-3 rounded-full hover:from-gray-800 hover:to-black transition-all duration-300 transform hover:scale-125 hover:rotate-12 active:scale-95 relative overflow-hidden group shadow-lg hover:shadow-xl"
                aria-label="GitHub"
              >
                <Github className="text-xl relative z-10 transform group-hover:scale-110 transition-transform duration-300" />
                <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/30 to-white/0 transform skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
              </button>
              <button
                onClick={() => handleSocialClick('linkedin')}
                className="bg-gradient-to-r from-blue-600 to-blue-800 p-3 rounded-full hover:from-blue-700 hover:to-blue-900 transition-all duration-300 transform hover:scale-125 hover:rotate-12 active:scale-95 relative overflow-hidden group shadow-lg hover:shadow-xl"
                aria-label="LinkedIn"
              >
                <Linkedin className="text-xl relative z-10 transform group-hover:scale-110 transition-transform duration-300" />
                <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/30 to-white/0 transform skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
              </button>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-xl font-bold mb-4 text-lime-500 transform hover:scale-105 transition-transform duration-300">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <button
                  onClick={() => handleNavigation('/')}
                  className="text-gray-300 hover:text-lime-500 transition-all duration-300 relative group block py-2 transform hover:translate-x-2 hover:scale-105"
                >
                  Home
                  <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-lime-400 to-emerald-400 group-hover:w-full transition-all duration-300"></span>
                  {/* Opacity fade effects */}
                  <div className="absolute inset-0 bg-lime-400/10 opacity-0 group-hover:opacity-100 rounded transition-opacity duration-300"></div>
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleNavigation('#features')}
                  className="text-gray-300 hover:text-lime-500 transition-all duration-300 relative group block py-2 transform hover:translate-x-2 hover:scale-105"
                >
                  Features
                  <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-lime-400 to-emerald-400 group-hover:w-full transition-all duration-300"></span>
                  <div className="absolute inset-0 bg-lime-400/10 opacity-0 group-hover:opacity-100 rounded transition-opacity duration-300"></div>
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleNavigation('#blog')}
                  className="text-gray-300 hover:text-lime-500 transition-all duration-300 relative group block py-2 transform hover:translate-x-2 hover:scale-105"
                >
                  Blog
                  <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-lime-400 to-emerald-400 group-hover:w-full transition-all duration-300"></span>
                  <div className="absolute inset-0 bg-lime-400/10 opacity-0 group-hover:opacity-100 rounded transition-opacity duration-300"></div>
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleNavigation('#faq')}
                  className="text-gray-300 hover:text-lime-500 transition-all duration-300 relative group block py-2 transform hover:translate-x-2 hover:scale-105"
                >
                  FAQ's
                  <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-lime-400 to-emerald-400 group-hover:w-full transition-all duration-300"></span>
                  <div className="absolute inset-0 bg-lime-400/10 opacity-0 group-hover:opacity-100 rounded transition-opacity duration-300"></div>
                </button>
              </li>
            </ul>
          </div>

          {/* Contact Info with icon animations on hover */}
          <div>
            <h3 className="text-xl font-bold mb-4 text-lime-500 transform hover:scale-105 transition-transform duration-300">Contact Us</h3>
            <div className="space-y-3">
              <div className="flex items-center group cursor-pointer transform hover:scale-105 transition-all duration-300 relative">
                <Mail className="text-lime-500 mr-3 transform group-hover:rotate-12 group-hover:scale-110 transition-all duration-300" size={18} />
                <span className="text-gray-300 group-hover:text-white transition-colors duration-300">bharathbandi13925@gmail.com</span>
                <div className="absolute inset-0 bg-gradient-to-r from-lime-500/0 to-emerald-500/0 group-hover:from-lime-500/10 group-hover:to-emerald-500/10 rounded transition-all duration-300"></div>
              </div>
              <div className="flex items-center group cursor-pointer transform hover:scale-105 transition-all duration-300 relative">
                <Phone className="text-lime-500 mr-3 transform group-hover:rotate-12 group-hover:scale-110 transition-all duration-300" size={18} />
                <span className="text-gray-300 group-hover:text-white transition-colors duration-300">+91 7816082435</span>
                <div className="absolute inset-0 bg-gradient-to-r from-lime-500/0 to-emerald-500/0 group-hover:from-lime-500/10 group-hover:to-emerald-500/10 rounded transition-all duration-300"></div>
              </div>
              <div className="flex items-center group cursor-pointer transform hover:scale-105 transition-all duration-300 relative">
                <MapPin className="text-lime-500 mr-3 transform group-hover:rotate-12 group-hover:scale-110 transition-all duration-300" size={18} />
                <span className="text-gray-300 group-hover:text-white transition-colors duration-300">Parvathipuram</span>
                <div className="absolute inset-0 bg-gradient-to-r from-lime-500/0 to-emerald-500/0 group-hover:from-lime-500/10 group-hover:to-emerald-500/10 rounded transition-all duration-300"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section with enhanced animations */}
        <div className="border-t border-gray-700 mt-12 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="text-gray-300 mb-4 md:mb-0 transform hover:scale-105 transition-transform duration-300">
              <p>&copy; {new Date().getFullYear()} RouteVision. All rights reserved.</p>
            </div>
            <div className="flex space-x-6">
              <button
                onClick={() => handleNavigation('/privacy-policy')}
                className="text-gray-300 hover:text-lime-500 transition-all duration-300 text-sm relative group transform hover:scale-105"
              >
                Privacy Policy
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-lime-400 to-emerald-400 group-hover:w-full transition-all duration-300"></span>
              </button>
              <button
                onClick={() => handleNavigation('/terms-of-service')}
                className="text-gray-300 hover:text-lime-500 transition-all duration-300 text-sm relative group transform hover:scale-105"
              >
                Terms of Service
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-lime-400 to-emerald-400 group-hover:w-full transition-all duration-300"></span>
              </button>
              <button
                onClick={() => handleNavigation('/support')}
                className="text-gray-300 hover:text-lime-500 transition-all duration-300 text-sm relative group transform hover:scale-105"
              >
                Support
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-lime-400 to-emerald-400 group-hover:w-full transition-all duration-300"></span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Floating particles with random positioning */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/3 left-1/5 w-1 h-1 bg-lime-400 rounded-full opacity-30 animate-ping" style={{ animationDelay: '1.5s' }}></div>
        <div className="absolute top-2/3 right-1/5 w-1.5 h-1.5 bg-emerald-400 rounded-full opacity-30 animate-ping" style={{ animationDelay: '3s' }}></div>
        <div className="absolute top-1/4 right-2/5 w-1 h-1 bg-lime-500 rounded-full opacity-50 animate-ping" style={{ animationDelay: '4s' }}></div>
        <div className="absolute bottom-1/4 left-2/5 w-0.5 h-0.5 bg-emerald-300 rounded-full opacity-40 animate-ping" style={{ animationDelay: '5s' }}></div>
      </div>
    </footer>
  );
};

export default Footer;