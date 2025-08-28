import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Instagram, Twitter, Github, Linkedin, Mail, Phone, MapPinIcon } from 'lucide-react';

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
      // For page navigation
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
    <footer className="bg-gray-800 text-white">
      <div className="container mx-auto px-4 py-12">
        <div className="grid md:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center mb-4">
              <MapPin className="text-lime-500 text-3xl mr-2" />
              <span className="text-2xl font-bold">RouteVision</span>
            </div>
            <p className="text-gray-300 mb-6 max-w-md">
              Discover the world through immersive route visualization. Navigate with confidence using our Street View integration and real-time route planning powered by Google Maps API.
            </p>
            <div className="flex space-x-4">
              <button
                onClick={() => handleSocialClick('instagram')}
                className="bg-gray-700 p-3 rounded-full hover:bg-lime-500 transition duration-300"
                aria-label="Instagram"
              >
                <Instagram className="text-xl" />
              </button>
              <button
                onClick={() => handleSocialClick('twitter')}
                className="bg-gray-700 p-3 rounded-full hover:bg-lime-500 transition duration-300"
                aria-label="Twitter"
              >
                <Twitter className="text-xl" />
              </button>
              <button
                onClick={() => handleSocialClick('github')}
                className="bg-gray-700 p-3 rounded-full hover:bg-lime-500 transition duration-300"
                aria-label="GitHub"
              >
                <Github className="text-xl" />
              </button>
              <button
                onClick={() => handleSocialClick('linkedin')}
                className="bg-gray-700 p-3 rounded-full hover:bg-lime-500 transition duration-300"
                aria-label="LinkedIn"
              >
                <Linkedin className="text-xl" />
              </button>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-xl font-bold mb-4 text-lime-500">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <button
                  onClick={() => handleNavigation('/')}
                  className="text-gray-300 hover:text-lime-500 transition duration-300"
                >
                  Home
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleNavigation('#features')}
                  className="text-gray-300 hover:text-lime-500 transition duration-300"
                >
                  Features
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleNavigation('#blog')}
                  className="text-gray-300 hover:text-lime-500 transition duration-300"
                >
                  Blog
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleNavigation('#faq')}
                  className="text-gray-300 hover:text-lime-500 transition duration-300"
                >
                  FAQ's
                </button>
              </li>
              <li>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="text-xl font-bold mb-4 text-lime-500">Contact Us</h3>
            <div className="space-y-3">
              <div className="flex items-center">
                <Mail className="text-lime-500 mr-3" size={18} />
                <span className="text-gray-300">bharathbandi13925@gmail.com</span>
              </div>
              <div className="flex items-center">
                <Phone className="text-lime-500 mr-3" size={18} />
                <span className="text-gray-300">+91 7816082435</span>
              </div>
              <div className="flex items-center">
                <MapPinIcon className="text-lime-500 mr-3" size={18} />
                <span className="text-gray-300">Parvathipuram</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-t border-gray-700 mt-12 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="text-gray-300 mb-4 md:mb-0">
              <p>&copy; {new Date().getFullYear()} RouteVision. All rights reserved.</p>
            </div>
            <div className="flex space-x-6">
              <button
                onClick={() => handleNavigation('/privacy-policy')}
                className="text-gray-300 hover:text-lime-500 transition duration-300 text-sm"
              >
                Privacy Policy
              </button>
              <button
                onClick={() => handleNavigation('/terms-of-service')}
                className="text-gray-300 hover:text-lime-500 transition duration-300 text-sm"
              >
                Terms of Service
              </button>
              <button
                onClick={() => handleNavigation('/support')}
                className="text-gray-300 hover:text-lime-500 transition duration-300 text-sm"
              >
                Support
              </button>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;