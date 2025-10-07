import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Menu, X } from 'lucide-react';

const Navbar = () => {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleNavigation = (path) => {
    if (path.startsWith('#')) {
      // For section navigation within the same page
      const sectionId = path.substring(1);
      const element = document.getElementById(sectionId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      // For page navigation
      navigate(path);
    }
    setIsMenuOpen(false); // Close mobile menu after navigation
  };

  const menuItems = [
    { name: 'Home', path: '/' },
    { name: 'Features', path: '#features' },
    { name: 'Blog', path: '#blog' },
    { name: "FAQ's", path: '#faq' },
    { name: "Contact", path: '/support'},
  ];

  return (
    <nav className="bg-gray-900/95 backdrop-blur-lg shadow-2xl sticky top-0 z-50 border-b border-gray-700">
      {/* Gradient top border animation */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-lime-400 via-lime-500 to-lime-600 transform scale-x-0 hover:scale-x-100 transition-transform duration-500"></div>
      
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center py-4">
          {/* Logo with enhanced animations */}
          <div 
            className="flex items-center cursor-pointer group transform hover:scale-105 transition-all duration-300"
            onClick={() => handleNavigation('/')}
          >
            {/* Logo spin animation */}
            <div className="relative">
              <MapPin className="text-lime-400 text-3xl mr-2 transform group-hover:rotate-12 group-hover:scale-110 transition-all duration-300" />
              {/* Enhanced glow effect */}
              <div className="absolute inset-0 text-lime-400 text-3xl mr-2 opacity-0 group-hover:opacity-50 blur-md transition-all duration-300">
                <MapPin />
              </div>
            </div>
            <span className="text-2xl font-bold text-white group-hover:bg-gradient-to-r group-hover:from-lime-400 group-hover:to-lime-500 group-hover:bg-clip-text group-hover:text-transparent transition-all duration-300">
              RouteVision
            </span>
          </div>

          {/* Desktop Menu with enhanced hover effects */}
          <div className="hidden md:flex space-x-8">
            {menuItems.map((item, index) => (
              <button
                key={index}
                onClick={() => handleNavigation(item.path)}
                className="text-gray-300 hover:text-lime-400 font-medium transition-all duration-300 relative group px-3 py-2 rounded-lg hover:bg-gray-800/50 transform hover:scale-105"
              >
                {item.name}
                {/* Enhanced indicators with glow */}
                <span className="absolute bottom-1 left-3 w-0 h-0.5 bg-gradient-to-r from-lime-400 to-lime-500 group-hover:w-[calc(100%-1.5rem)] transition-all duration-300 shadow-lg shadow-lime-400/50"></span>
                {/* Enhanced shimmer overlay effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-lime-400/20 to-transparent opacity-0 group-hover:opacity-50 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-all duration-700"></div>
              </button>
            ))}
          </div>

          {/* Signup Button with enhanced glow effects */}
          <div className="hidden md:flex">
            <button
              onClick={() => handleNavigation('/user-signup')}
              className="bg-gradient-to-r from-lime-400 to-lime-500 text-black px-6 py-2 rounded-lg font-semibold hover:from-lime-500 hover:to-lime-600 transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-lime-400/30 active:scale-95 relative overflow-hidden group"
            >
              <span className="relative z-10">Signup</span>
              {/* Enhanced button shimmer effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/30 to-white/0 transform skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
            </button>
          </div>

          {/* Mobile Menu Button with enhanced animations */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-gray-300 hover:text-lime-400 transition-all duration-300 p-2 rounded-lg hover:bg-gray-800/50 transform hover:scale-110 active:scale-95"
            >
              {isMenuOpen ? (
                <X className="text-2xl transform rotate-0 transition-transform duration-300" />
              ) : (
                <Menu className="text-2xl transform rotate-0 hover:rotate-180 transition-transform duration-300" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu with enhanced dark theme */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-700 animate-fade-in">
            <div className="flex flex-col space-y-4">
              {menuItems.map((item, index) => (
                <button
                  key={index}
                  onClick={() => handleNavigation(item.path)}
                  className="text-gray-300 hover:text-lime-400 font-medium transition-all duration-300 text-left px-4 py-3 rounded-lg hover:bg-gradient-to-r hover:from-gray-800/50 hover:to-gray-700/50 transform hover:translate-x-2 hover:scale-105 relative group animate-slide-up"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  {item.name}
                  <div className="absolute left-0 top-1/2 w-1 h-0 bg-lime-400 group-hover:h-full transform -translate-y-1/2 transition-all duration-300 rounded-r shadow-lg shadow-lime-400/50"></div>
                </button>
              ))}
              <button
                onClick={() => handleNavigation('/user-signup')}
                className="bg-gradient-to-r from-lime-400 to-lime-500 text-black px-6 py-2 rounded-lg font-semibold hover:from-lime-500 hover:to-lime-600 transition-all duration-300 self-start transform hover:scale-105 hover:shadow-lg hover:shadow-lime-400/30 active:scale-95 relative overflow-hidden group animate-slide-up"
                style={{ animationDelay: `${menuItems.length * 0.1}s` }}
              >
                <span className="relative z-10">Signup</span>
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/30 to-white/0 transform skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Enhanced floating particles with glow */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
        <div className="absolute top-2 left-1/4 w-1 h-1 bg-lime-400 rounded-full opacity-30 animate-ping shadow-lg shadow-lime-400/50" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-3 right-1/3 w-0.5 h-0.5 bg-lime-500 rounded-full opacity-40 animate-ping shadow-lg shadow-lime-500/50" style={{ animationDelay: '4s' }}></div>
        <div className="absolute bottom-4 left-1/2 w-0.5 h-0.5 bg-lime-400 rounded-full opacity-20 animate-ping shadow-lg shadow-lime-400/50" style={{ animationDelay: '6s' }}></div>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
        
        .animate-slide-up {
          animation: slide-up 0.5s ease-out;
        }

        /* Enhanced backdrop blur for better dark theme integration */
        .backdrop-blur-lg {
          backdrop-filter: blur(16px);
        }
      `}</style>
    </nav>
  );
};

export default Navbar;