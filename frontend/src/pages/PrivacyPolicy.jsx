import React from 'react';
import { MapPin, Shield, Eye, Lock, Database, UserCheck, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PrivacyPolicy = () => {
  const navigate = useNavigate();

  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const sections = [
    { id: 'information-collection', title: 'Information We Collect', icon: <Database /> },
    { id: 'how-we-use', title: 'How We Use Information', icon: <UserCheck /> },
    { id: 'information-sharing', title: 'Information Sharing', icon: <Eye /> },
    { id: 'data-security', title: 'Data Security', icon: <Lock /> },
    { id: 'your-rights', title: 'Your Rights', icon: <CheckCircle /> },
    { id: 'contact-us', title: 'Contact Us', icon: <FileText /> }
  ];

  return (
    <div className="min-h-screen bg-black overflow-x-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 opacity-10">
        <div className="absolute top-10 left-10 w-32 h-32 bg-lime-400 opacity-20 rounded-full animate-bounce blur-sm"></div>
        <div className="absolute top-32 right-20 w-24 h-24 bg-lime-400 opacity-20 rounded-full animate-bounce delay-1000 blur-sm"></div>
        <div className="absolute bottom-20 left-32 w-16 h-16 bg-lime-400 opacity-20 rounded-full animate-bounce delay-500 blur-sm"></div>
        <div className="absolute bottom-10 right-40 w-20 h-20 bg-lime-400 opacity-15 rounded-full animate-pulse"></div>
      </div>

      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-gray-900 via-black to-gray-800 py-20 overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-10 left-10 w-20 h-20 bg-lime-400 opacity-20 rounded-full animate-bounce blur-sm"></div>
          <div className="absolute top-32 right-20 w-16 h-16 bg-lime-400 opacity-20 rounded-full animate-bounce delay-1000 blur-sm"></div>
          <div className="absolute bottom-20 left-32 w-12 h-12 bg-lime-400 opacity-20 rounded-full animate-bounce delay-500 blur-sm"></div>
        </div>
        
        <div className="container mx-auto px-4 text-center relative z-10">
          <div className="flex justify-center items-center mb-6 animate-fade-in">
            <Shield className="text-lime-400 text-6xl mr-4 animate-spin-slow drop-shadow-2xl" />
            <h1 className="text-5xl font-bold text-white animate-slide-up drop-shadow-2xl">Privacy Policy</h1>
          </div>
          <p className="text-xl text-gray-300 mb-8 animate-slide-up delay-300 max-w-3xl mx-auto drop-shadow-lg">
            Your privacy is important to us. Learn how RouteVision protects and handles your personal information.
          </p>
          <p className="text-sm text-gray-400 animate-slide-up delay-500">
            Last updated: {new Date().toLocaleDateString()}
          </p>
          <div className="flex justify-center gap-4 mt-8 animate-slide-up delay-700">
            <button
              onClick={() => navigate('/')}
              className="group border-2 border-lime-400 text-lime-400 px-6 py-2 rounded-lg font-semibold hover:bg-lime-400 hover:text-black transition-all duration-300 transform hover:scale-105 hover:shadow-xl hover:shadow-lime-400/20"
            >
              <span className="group-hover:animate-pulse">← Back to Home</span>
            </button>
          </div>
        </div>
      </section>

      {/* Table of Contents */}
      <section className="py-12 bg-gradient-to-b from-gray-900 to-black">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-8 text-white animate-fade-in">
            Table of Contents
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
            {sections.map((section, index) => (
              <button
                key={section.id}
                onClick={() => scrollToSection(section.id)}
                className="group bg-gray-800 border border-gray-700 p-4 rounded-xl hover:border-lime-400/50 transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-lime-400/10 animate-slide-up text-left"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex items-center">
                  <div className="text-lime-400 mr-3 transform group-hover:scale-110 transition-transform duration-300">
                    {section.icon}
                  </div>
                  <span className="text-white group-hover:text-lime-400 transition-colors duration-300 font-medium">
                    {section.title}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Privacy Policy Content */}
      <section className="py-16 bg-gradient-to-b from-black to-gray-900">
        <div className="container mx-auto px-4 max-w-4xl">
          
          {/* Information We Collect */}
          <div id="information-collection" className="mb-12 animate-slide-up">
            <div className="bg-gray-800 border border-gray-700 rounded-2xl p-8 hover:border-lime-400/30 transition-all duration-300 hover:shadow-lg hover:shadow-lime-400/10">
              <div className="flex items-center mb-6">
                <Database className="text-lime-400 text-3xl mr-4 animate-pulse" />
                <h2 className="text-3xl font-bold text-white">Information We Collect</h2>
              </div>
              
              <div className="space-y-6">
                <div className="bg-gray-900 p-6 rounded-xl border border-gray-600 hover:border-lime-400/20 transition-colors duration-300">
                  <h3 className="text-xl font-semibold text-lime-400 mb-3">Personal Information</h3>
                  <ul className="text-gray-300 space-y-2">
                    <li className="flex items-start">
                      <CheckCircle className="text-lime-400 mr-2 mt-1 flex-shrink-0" size={16} />
                      Name and email address when you create an account
                    </li>
                    <li className="flex items-start">
                      <CheckCircle className="text-lime-400 mr-2 mt-1 flex-shrink-0" size={16} />
                      Profile information you choose to provide
                    </li>
                    <li className="flex items-start">
                      <CheckCircle className="text-lime-400 mr-2 mt-1 flex-shrink-0" size={16} />
                      Contact information for customer support
                    </li>
                  </ul>
                </div>

                <div className="bg-gray-900 p-6 rounded-xl border border-gray-600 hover:border-lime-400/20 transition-colors duration-300">
                  <h3 className="text-xl font-semibold text-lime-400 mb-3">Usage Information</h3>
                  <ul className="text-gray-300 space-y-2">
                    <li className="flex items-start">
                      <CheckCircle className="text-lime-400 mr-2 mt-1 flex-shrink-0" size={16} />
                      Routes you search for and view
                    </li>
                    <li className="flex items-start">
                      <CheckCircle className="text-lime-400 mr-2 mt-1 flex-shrink-0" size={16} />
                      Features you use and interact with
                    </li>
                    <li className="flex items-start">
                      <CheckCircle className="text-lime-400 mr-2 mt-1 flex-shrink-0" size={16} />
                      Device and browser information
                    </li>
                  </ul>
                </div>

                <div className="bg-gray-900 p-6 rounded-xl border border-gray-600 hover:border-lime-400/20 transition-colors duration-300">
                  <h3 className="text-xl font-semibold text-lime-400 mb-3">Location Data</h3>
                  <p className="text-gray-300 mb-2">
                    We collect location information to provide route planning services:
                  </p>
                  <ul className="text-gray-300 space-y-2">
                    <li className="flex items-start">
                      <CheckCircle className="text-lime-400 mr-2 mt-1 flex-shrink-0" size={16} />
                      GPS coordinates when you permit location access
                    </li>
                    <li className="flex items-start">
                      <CheckCircle className="text-lime-400 mr-2 mt-1 flex-shrink-0" size={16} />
                      Addresses you search for or navigate to
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* How We Use Information */}
          <div id="how-we-use" className="mb-12 animate-slide-up delay-200">
            <div className="bg-gray-800 border border-gray-700 rounded-2xl p-8 hover:border-lime-400/30 transition-all duration-300 hover:shadow-lg hover:shadow-lime-400/10">
              <div className="flex items-center mb-6">
                <UserCheck className="text-lime-400 text-3xl mr-4 animate-pulse" />
                <h2 className="text-3xl font-bold text-white">How We Use Your Information</h2>
              </div>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-gray-900 p-6 rounded-xl border border-gray-600 hover:border-lime-400/20 transition-colors duration-300">
                  <h3 className="text-xl font-semibold text-lime-400 mb-4">Service Provision</h3>
                  <ul className="text-gray-300 space-y-2">
                    <li>• Provide route planning and navigation services</li>
                    <li>• Display Street View integration and route videos</li>
                    <li>• Customize your experience based on preferences</li>
                    <li>• Maintain and improve our services</li>
                  </ul>
                </div>

                <div className="bg-gray-900 p-6 rounded-xl border border-gray-600 hover:border-lime-400/20 transition-colors duration-300">
                  <h3 className="text-xl font-semibold text-lime-400 mb-4">Communication</h3>
                  <ul className="text-gray-300 space-y-2">
                    <li>• Send service updates and notifications</li>
                    <li>• Respond to your inquiries and support requests</li>
                    <li>• Share important policy changes</li>
                    <li>• Provide customer support</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Information Sharing */}
          <div id="information-sharing" className="mb-12 animate-slide-up delay-400">
            <div className="bg-gray-800 border border-gray-700 rounded-2xl p-8 hover:border-lime-400/30 transition-all duration-300 hover:shadow-lg hover:shadow-lime-400/10">
              <div className="flex items-center mb-6">
                <Eye className="text-lime-400 text-3xl mr-4 animate-pulse" />
                <h2 className="text-3xl font-bold text-white">Information Sharing</h2>
              </div>
              
              <div className="bg-gray-900 p-6 rounded-xl border border-gray-600">
                <div className="flex items-start mb-4">
                  <AlertCircle className="text-yellow-400 mr-3 mt-1 flex-shrink-0" size={20} />
                  <p className="text-gray-300 font-medium">
                    We do not sell, rent, or trade your personal information to third parties.
                  </p>
                </div>
                
                <h3 className="text-xl font-semibold text-lime-400 mb-4">Limited Sharing</h3>
                <p className="text-gray-300 mb-4">We may share information only in these circumstances:</p>
                <ul className="text-gray-300 space-y-3">
                  <li className="flex items-start">
                    <Shield className="text-lime-400 mr-2 mt-1 flex-shrink-0" size={16} />
                    <span><strong>Service Providers:</strong> Trusted partners who help operate our services (Google Maps API, hosting providers)</span>
                  </li>
                  <li className="flex items-start">
                    <Shield className="text-lime-400 mr-2 mt-1 flex-shrink-0" size={16} />
                    <span><strong>Legal Requirements:</strong> When required by law or to protect our rights and users' safety</span>
                  </li>
                  <li className="flex items-start">
                    <Shield className="text-lime-400 mr-2 mt-1 flex-shrink-0" size={16} />
                    <span><strong>Business Transfer:</strong> In the event of a merger or acquisition (with continued privacy protection)</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Data Security */}
          <div id="data-security" className="mb-12 animate-slide-up delay-600">
            <div className="bg-gray-800 border border-gray-700 rounded-2xl p-8 hover:border-lime-400/30 transition-all duration-300 hover:shadow-lg hover:shadow-lime-400/10">
              <div className="flex items-center mb-6">
                <Lock className="text-lime-400 text-3xl mr-4 animate-pulse" />
                <h2 className="text-3xl font-bold text-white">Data Security</h2>
              </div>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-gray-900 p-6 rounded-xl border border-gray-600">
                  <h3 className="text-xl font-semibold text-lime-400 mb-4">Technical Safeguards</h3>
                  <ul className="text-gray-300 space-y-2">
                    <li>• SSL/TLS encryption for data transmission</li>
                    <li>• Secure data storage with encryption</li>
                    <li>• Regular security audits and updates</li>
                    <li>• Access controls and authentication</li>
                  </ul>
                </div>

                <div className="bg-gray-900 p-6 rounded-xl border border-gray-600">
                  <h3 className="text-xl font-semibold text-lime-400 mb-4">Organizational Measures</h3>
                  <ul className="text-gray-300 space-y-2">
                    <li>• Employee training on data protection</li>
                    <li>• Limited access on need-to-know basis</li>
                    <li>• Regular backup and recovery procedures</li>
                    <li>• Incident response and monitoring</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Your Rights */}
          <div id="your-rights" className="mb-12 animate-slide-up delay-800">
            <div className="bg-gray-800 border border-gray-700 rounded-2xl p-8 hover:border-lime-400/30 transition-all duration-300 hover:shadow-lg hover:shadow-lime-400/10">
              <div className="flex items-center mb-6">
                <CheckCircle className="text-lime-400 text-3xl mr-4 animate-pulse" />
                <h2 className="text-3xl font-bold text-white">Your Rights and Choices</h2>
              </div>
              
              <div className="bg-gray-900 p-6 rounded-xl border border-gray-600">
                <p className="text-gray-300 mb-6">You have the following rights regarding your personal information:</p>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-semibold text-lime-400 mb-3">Access & Control</h3>
                    <ul className="text-gray-300 space-y-2">
                      <li>• View and download your data</li>
                      <li>• Update your account information</li>
                      <li>• Delete your account and data</li>
                      <li>• Opt-out of communications</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-lime-400 mb-3">Privacy Controls</h3>
                    <ul className="text-gray-300 space-y-2">
                      <li>• Manage location sharing preferences</li>
                      <li>• Control data collection settings</li>
                      <li>• Request data portability</li>
                      <li>• File privacy complaints</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Us */}
          <div id="contact-us" className="animate-slide-up delay-1000">
            <div className="bg-gray-800 border border-gray-700 rounded-2xl p-8 hover:border-lime-400/30 transition-all duration-300 hover:shadow-lg hover:shadow-lime-400/10">
              <div className="flex items-center mb-6">
                <FileText className="text-lime-400 text-3xl mr-4 animate-pulse" />
                <h2 className="text-3xl font-bold text-white">Contact Us About Privacy</h2>
              </div>
              
              <div className="bg-gray-900 p-6 rounded-xl border border-gray-600">
                <p className="text-gray-300 mb-6">
                  If you have questions about this Privacy Policy or want to exercise your rights, please contact us:
                </p>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-semibold text-lime-400 mb-3">Email</h3>
                    <p className="text-gray-300">bharathbandi13925@gmail.com</p>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-lime-400 mb-3">Response Time</h3>
                    <p className="text-gray-300">We'll respond within 30 days</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <style jsx>{`
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
        
        .animate-fade-in { animation: fade-in 0.8s ease-out; }
        .animate-slide-up { animation: slide-up 0.8s ease-out; }
        .animate-spin-slow { animation: spin-slow 3s linear infinite; }
        
        .delay-200 { animation-delay: 200ms; }
        .delay-300 { animation-delay: 300ms; }
        .delay-400 { animation-delay: 400ms; }
        .delay-500 { animation-delay: 500ms; }
        .delay-600 { animation-delay: 600ms; }
        .delay-700 { animation-delay: 700ms; }
        .delay-800 { animation-delay: 800ms; }
        .delay-1000 { animation-delay: 1000ms; }
      `}</style>
    </div>
  );
};

export default PrivacyPolicy;