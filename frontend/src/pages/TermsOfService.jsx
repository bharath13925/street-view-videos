import React from 'react';
import { MapPin, FileText, Users, AlertTriangle, Scale, Gavel, Clock, Shield, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const TermsOfService = () => {
  const navigate = useNavigate();

  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const sections = [
    { id: 'acceptance', title: 'Acceptance of Terms', icon: <CheckCircle /> },
    { id: 'service-description', title: 'Service Description', icon: <MapPin /> },
    { id: 'user-accounts', title: 'User Accounts', icon: <Users /> },
    { id: 'acceptable-use', title: 'Acceptable Use Policy', icon: <Shield /> },
    { id: 'intellectual-property', title: 'Intellectual Property', icon: <Scale /> },
    { id: 'disclaimers', title: 'Disclaimers & Limitations', icon: <AlertTriangle /> },
    { id: 'termination', title: 'Termination', icon: <Clock /> },
    { id: 'governing-law', title: 'Governing Law', icon: <Gavel /> }
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
            <FileText className="text-lime-400 text-6xl mr-4 animate-spin-slow drop-shadow-2xl" />
            <h1 className="text-5xl font-bold text-white animate-slide-up drop-shadow-2xl">Terms of Service</h1>
          </div>
          <p className="text-xl text-gray-300 mb-8 animate-slide-up delay-300 max-w-3xl mx-auto drop-shadow-lg">
            Please read these terms carefully before using RouteVision. By using our service, you agree to these terms.
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
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 max-w-6xl mx-auto">
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
                  <span className="text-white group-hover:text-lime-400 transition-colors duration-300 font-medium text-sm">
                    {section.title}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Terms Content */}
      <section className="py-16 bg-gradient-to-b from-black to-gray-900">
        <div className="container mx-auto px-4 max-w-4xl">
          
          {/* Acceptance of Terms */}
          <div id="acceptance" className="mb-12 animate-slide-up">
            <div className="bg-gray-800 border border-gray-700 rounded-2xl p-8 hover:border-lime-400/30 transition-all duration-300 hover:shadow-lg hover:shadow-lime-400/10">
              <div className="flex items-center mb-6">
                <CheckCircle className="text-lime-400 text-3xl mr-4 animate-pulse" />
                <h2 className="text-3xl font-bold text-white">Acceptance of Terms</h2>
              </div>
              
              <div className="bg-gray-900 p-6 rounded-xl border border-gray-600">
                <p className="text-gray-300 mb-4 leading-relaxed">
                  Welcome to RouteVision! These Terms of Service ("Terms") govern your use of our route planning and navigation services. 
                  By accessing or using RouteVision, you agree to be bound by these Terms and our Privacy Policy.
                </p>
                <div className="bg-lime-400/10 border border-lime-400/30 p-4 rounded-lg">
                  <div className="flex items-start">
                    <AlertTriangle className="text-yellow-400 mr-3 mt-1 flex-shrink-0" size={20} />
                    <div>
                      <p className="text-lime-100 font-medium mb-2">Important Notice</p>
                      <p className="text-gray-300 text-sm">
                        If you do not agree to these Terms, please do not use our services. 
                        We may update these Terms from time to time, and continued use constitutes acceptance of any changes.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Service Description */}
          <div id="service-description" className="mb-12 animate-slide-up delay-200">
            <div className="bg-gray-800 border border-gray-700 rounded-2xl p-8 hover:border-lime-400/30 transition-all duration-300 hover:shadow-lg hover:shadow-lime-400/10">
              <div className="flex items-center mb-6">
                <MapPin className="text-lime-400 text-3xl mr-4 animate-pulse" />
                <h2 className="text-3xl font-bold text-white">Service Description</h2>
              </div>
              
              <div className="space-y-6">
                <div className="bg-gray-900 p-6 rounded-xl border border-gray-600">
                  <h3 className="text-xl font-semibold text-lime-400 mb-4">What We Provide</h3>
                  <ul className="text-gray-300 space-y-3">
                    <li className="flex items-start">
                      <CheckCircle className="text-lime-400 mr-3 mt-1 flex-shrink-0" size={16} />
                      <span>Route planning and navigation services with Street View integration</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle className="text-lime-400 mr-3 mt-1 flex-shrink-0" size={16} />
                      <span>Immersive video experiences of routes before you travel</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle className="text-lime-400 mr-3 mt-1 flex-shrink-0" size={16} />
                      <span>Real-time traffic information and route optimization</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle className="text-lime-400 mr-3 mt-1 flex-shrink-0" size={16} />
                      <span>Social features for route sharing and community interaction</span>
                    </li>
                  </ul>
                </div>

                <div className="bg-gray-900 p-6 rounded-xl border border-gray-600">
                  <h3 className="text-xl font-semibold text-lime-400 mb-4">Service Availability</h3>
                  <p className="text-gray-300 mb-3">
                    RouteVision is provided "as is" and we strive for continuous availability. However, we do not guarantee:
                  </p>
                  <ul className="text-gray-300 space-y-2">
                    <li>• Uninterrupted access to our services</li>
                    <li>• Complete accuracy of route information</li>
                    <li>• Availability in all geographic regions</li>
                    <li>• Compatibility with all devices and browsers</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* User Accounts */}
          <div id="user-accounts" className="mb-12 animate-slide-up delay-400">
            <div className="bg-gray-800 border border-gray-700 rounded-2xl p-8 hover:border-lime-400/30 transition-all duration-300 hover:shadow-lg hover:shadow-lime-400/10">
              <div className="flex items-center mb-6">
                <Users className="text-lime-400 text-3xl mr-4 animate-pulse" />
                <h2 className="text-3xl font-bold text-white">User Accounts</h2>
              </div>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-gray-900 p-6 rounded-xl border border-gray-600">
                  <h3 className="text-xl font-semibold text-lime-400 mb-4">Account Requirements</h3>
                  <ul className="text-gray-300 space-y-2">
                    <li>• Must be 18+ years old or have parental consent</li>
                    <li>• Provide accurate and complete information</li>
                    <li>• Maintain security of your login credentials</li>
                    <li>• Use only one account per person</li>
                    <li>• Update information when it changes</li>
                  </ul>
                </div>

                <div className="bg-gray-900 p-6 rounded-xl border border-gray-600">
                  <h3 className="text-xl font-semibold text-lime-400 mb-4">Account Responsibilities</h3>
                  <ul className="text-gray-300 space-y-2">
                    <li>• You are responsible for all account activity</li>
                    <li>• Report unauthorized access immediately</li>
                    <li>• Keep your password secure and confidential</li>
                    <li>• Comply with all applicable laws and regulations</li>
                    <li>• Respect other users and community guidelines</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Acceptable Use Policy */}
          <div id="acceptable-use" className="mb-12 animate-slide-up delay-600">
            <div className="bg-gray-800 border border-gray-700 rounded-2xl p-8 hover:border-lime-400/30 transition-all duration-300 hover:shadow-lg hover:shadow-lime-400/10">
              <div className="flex items-center mb-6">
                <Shield className="text-lime-400 text-3xl mr-4 animate-pulse" />
                <h2 className="text-3xl font-bold text-white">Acceptable Use Policy</h2>
              </div>
              
              <div className="space-y-6">
                <div className="bg-gray-900 p-6 rounded-xl border border-gray-600">
                  <h3 className="text-xl font-semibold text-lime-400 mb-4">Permitted Uses</h3>
                  <p className="text-gray-300 mb-3">You may use RouteVision for:</p>
                  <ul className="text-gray-300 space-y-2">
                    <li>• Personal route planning and navigation</li>
                    <li>• Sharing routes with friends and family</li>
                    <li>• Educational and research purposes</li>
                    <li>• Commercial use in accordance with our commercial license</li>
                  </ul>
                </div>

                <div className="bg-red-900/20 border border-red-500/30 p-6 rounded-xl">
                  <h3 className="text-xl font-semibold text-red-400 mb-4">Prohibited Activities</h3>
                  <p className="text-gray-300 mb-3">You agree NOT to:</p>
                  <ul className="text-gray-300 space-y-2">
                    <li>• Use the service for illegal activities</li>
                    <li>• Attempt to hack, disrupt, or compromise our systems</li>
                    <li>• Upload malicious content or spam</li>
                    <li>• Violate intellectual property rights</li>
                    <li>• Harass or abuse other users</li>
                    <li>• Create fake accounts or impersonate others</li>
                    <li>• Scrape or automatically collect data</li>
                    <li>• Reverse engineer our software</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Intellectual Property */}
          <div id="intellectual-property" className="mb-12 animate-slide-up delay-800">
            <div className="bg-gray-800 border border-gray-700 rounded-2xl p-8 hover:border-lime-400/30 transition-all duration-300 hover:shadow-lg hover:shadow-lime-400/10">
              <div className="flex items-center mb-6">
                <Scale className="text-lime-400 text-3xl mr-4 animate-pulse" />
                <h2 className="text-3xl font-bold text-white">Intellectual Property</h2>
              </div>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-gray-900 p-6 rounded-xl border border-gray-600">
                  <h3 className="text-xl font-semibold text-lime-400 mb-4">Our Rights</h3>
                  <p className="text-gray-300 mb-3">RouteVision and its content are protected by:</p>
                  <ul className="text-gray-300 space-y-2">
                    <li>• Copyrights and trademarks</li>
                    <li>• Patents and trade secrets</li>
                    <li>• Database rights</li>
                    <li>• Other intellectual property laws</li>
                  </ul>
                  <p className="text-gray-300 mt-4 text-sm">
                    You may not copy, modify, distribute, or create derivative works without permission.
                  </p>
                </div>

                <div className="bg-gray-900 p-6 rounded-xl border border-gray-600">
                  <h3 className="text-xl font-semibold text-lime-400 mb-4">Your Content</h3>
                  <p className="text-gray-300 mb-3">When you submit content, you grant us:</p>
                  <ul className="text-gray-300 space-y-2">
                    <li>• License to use, display, and distribute</li>
                    <li>• Right to modify for technical requirements</li>
                    <li>• Permission to include in our services</li>
                    <li>• Right to remove inappropriate content</li>
                  </ul>
                  <p className="text-gray-300 mt-4 text-sm">
                    You retain ownership of your original content.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Disclaimers */}
          <div id="disclaimers" className="mb-12 animate-slide-up delay-1000">
            <div className="bg-gray-800 border border-gray-700 rounded-2xl p-8 hover:border-lime-400/30 transition-all duration-300 hover:shadow-lg hover:shadow-lime-400/10">
              <div className="flex items-center mb-6">
                <AlertTriangle className="text-lime-400 text-3xl mr-4 animate-pulse" />
                <h2 className="text-3xl font-bold text-white">Disclaimers & Limitations</h2>
              </div>
              
              <div className="bg-yellow-900/20 border border-yellow-500/30 p-6 rounded-xl mb-6">
                <div className="flex items-start">
                  <AlertTriangle className="text-yellow-400 mr-3 mt-1 flex-shrink-0" size={20} />
                  <div>
                    <h3 className="text-yellow-100 font-semibold mb-2">Important Safety Notice</h3>
                    <p className="text-gray-300 text-sm">
                      RouteVision is a navigation aid only. Always use common sense, obey traffic laws, 
                      and pay attention to road conditions. We are not responsible for accidents or 
                      damages resulting from following our directions.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-gray-900 p-6 rounded-xl border border-gray-600">
                  <h3 className="text-xl font-semibold text-lime-400 mb-4">Service Disclaimers</h3>
                  <ul className="text-gray-300 space-y-2 text-sm">
                    <li>• Services provided "as is" without warranties</li>
                    <li>• No guarantee of accuracy or completeness</li>
                    <li>• May contain errors or be temporarily unavailable</li>
                    <li>• Third-party data may be inaccurate</li>
                    <li>• Maps and routes may be outdated</li>
                  </ul>
                </div>

                <div className="bg-gray-900 p-6 rounded-xl border border-gray-600">
                  <h3 className="text-xl font-semibold text-lime-400 mb-4">Limitation of Liability</h3>
                  <ul className="text-gray-300 space-y-2 text-sm">
                    <li>• Limited to the amount you paid us</li>
                    <li>• No liability for indirect or consequential damages</li>
                    <li>• Not responsible for third-party actions</li>
                    <li>• Some jurisdictions may not allow these limitations</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Termination */}
          <div id="termination" className="mb-12 animate-slide-up delay-1200">
            <div className="bg-gray-800 border border-gray-700 rounded-2xl p-8 hover:border-lime-400/30 transition-all duration-300 hover:shadow-lg hover:shadow-lime-400/10">
              <div className="flex items-center mb-6">
                <Clock className="text-lime-400 text-3xl mr-4 animate-pulse" />
                <h2 className="text-3xl font-bold text-white">Termination</h2>
              </div>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-gray-900 p-6 rounded-xl border border-gray-600">
                  <h3 className="text-xl font-semibold text-lime-400 mb-4">Your Rights</h3>
                  <p className="text-gray-300 mb-3">You may terminate your account:</p>
                  <ul className="text-gray-300 space-y-2">
                    <li>• At any time for any reason</li>
                    <li>• By deleting your account in settings</li>
                    <li>• By contacting our support team</li>
                  </ul>
                  <p className="text-gray-300 mt-4 text-sm">
                    Some data may be retained for legal or operational purposes.
                  </p>
                </div>

                <div className="bg-gray-900 p-6 rounded-xl border border-gray-600">
                  <h3 className="text-xl font-semibold text-lime-400 mb-4">Our Rights</h3>
                  <p className="text-gray-300 mb-3">We may suspend or terminate accounts for:</p>
                  <ul className="text-gray-300 space-y-2">
                    <li>• Violation of these Terms</li>
                    <li>• Suspected fraudulent activity</li>
                    <li>• Extended inactivity</li>
                    <li>• Legal or regulatory requirements</li>
                  </ul>
                  <p className="text-gray-300 mt-4 text-sm">
                    We'll provide notice when reasonably possible.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Governing Law */}
          <div id="governing-law" className="animate-slide-up delay-1400">
            <div className="bg-gray-800 border border-gray-700 rounded-2xl p-8 hover:border-lime-400/30 transition-all duration-300 hover:shadow-lg hover:shadow-lime-400/10">
              <div className="flex items-center mb-6">
                <Gavel className="text-lime-400 text-3xl mr-4 animate-pulse" />
                <h2 className="text-3xl font-bold text-white">Governing Law & Disputes</h2>
              </div>
              
              <div className="space-y-6">
                <div className="bg-gray-900 p-6 rounded-xl border border-gray-600">
                  <h3 className="text-xl font-semibold text-lime-400 mb-4">Applicable Law</h3>
                  <p className="text-gray-300 mb-3">
                    These Terms are governed by the laws of India, without regard to conflict of law principles. 
                    Any disputes will be resolved in the courts of Andhra Pradesh, India.
                  </p>
                </div>

                <div className="bg-gray-900 p-6 rounded-xl border border-gray-600">
                  <h3 className="text-xl font-semibold text-lime-400 mb-4">Changes to Terms</h3>
                  <p className="text-gray-300 mb-3">
                    We may modify these Terms at any time. We'll notify you of significant changes via:
                  </p>
                  <ul className="text-gray-300 space-y-2">
                    <li>• Email notification to your registered address</li>
                    <li>• Prominent notice on our website</li>
                    <li>• In-app notifications</li>
                  </ul>
                  <p className="text-gray-300 mt-4 text-sm">
                    Continued use after changes constitutes acceptance of the new Terms.
                  </p>
                </div>

                <div className="bg-lime-400/10 border border-lime-400/30 p-6 rounded-xl">
                  <h3 className="text-xl font-semibold text-lime-400 mb-4">Contact Information</h3>
                  <p className="text-gray-300 mb-3">
                    For questions about these Terms of Service, please contact us at:
                  </p>
                  <div className="space-y-2 text-gray-300">
                    <p>Email: bharathbandi13925@gmail.com</p>
                    <p>Phone: +91 7816082435</p>
                    <p>Location: Parvathipuram, Andhra Pradesh, India</p>
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
        .delay-1200 { animation-delay: 1200ms; }
        .delay-1400 { animation-delay: 1400ms; }
      `}</style>
    </div>
  );
};

export default TermsOfService;