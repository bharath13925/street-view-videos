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
  ];

  return (
    <nav className="bg-white shadow-lg sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center py-4">
          {/* Logo */}
          <div 
            className="flex items-center cursor-pointer"
            onClick={() => handleNavigation('/')}
          >
            <MapPin className="text-lime-500 text-3xl mr-2" />
            <span className="text-2xl font-bold text-gray-800">RouteVision</span>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex space-x-8">
            {menuItems.map((item, index) => (
              <button
                key={index}
                onClick={() => handleNavigation(item.path)}
                className="text-gray-700 hover:text-lime-500 font-medium transition duration-300 relative group"
              >
                {item.name}
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-lime-500 group-hover:w-full transition-all duration-300"></span>
              </button>
            ))}
          </div>

          {/* Signup Button - Desktop */}
          <div className="hidden md:flex">
            <button
              onClick={() => handleNavigation('/user-signup')}
              className="bg-lime-500 text-white px-6 py-2 rounded-lg font-semibold hover:bg-lime-600 transition duration-300"
            >
              Signup
            </button>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-gray-700 hover:text-lime-500 transition duration-300"
            >
              {isMenuOpen ? <X className="text-2xl" /> : <Menu className="text-2xl" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-200">
            <div className="flex flex-col space-y-4">
              {menuItems.map((item, index) => (
                <button
                  key={index}
                  onClick={() => handleNavigation(item.path)}
                  className="text-gray-700 hover:text-lime-500 font-medium transition duration-300 text-left"
                >
                  {item.name}
                </button>
              ))}
              <button
                onClick={() => handleNavigation('/user-signup')}
                className="bg-lime-500 text-white px-6 py-2 rounded-lg font-semibold hover:bg-lime-600 transition duration-300 self-start"
              >
                Signup
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
