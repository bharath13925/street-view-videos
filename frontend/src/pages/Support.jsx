import React, { useState } from 'react';
import {
  MapPin,
  HelpCircle,
  MessageCircle,
  Mail,
  Phone,
  Clock,
  Search,
  Book,
  Video,
  FileText,
  Users,
  Zap,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

const Support = () => {
  const [activeTab, setActiveTab] = useState('faq');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFAQ, setExpandedFAQ] = useState(null);
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
    priority: 'medium',
  });
  const [formSubmitted, setFormSubmitted] = useState(false);

  const backendUrl = import.meta.env.VITE_BACKEND_URL;

  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) element.scrollIntoView({ behavior: 'smooth' });
  };

  const handleFormChange = (e) => {
    setContactForm({ ...contactForm, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
  e.preventDefault();

  try {
    // Send form data to backend
    const response = await fetch(`${backendUrl}/api/contact/send-email`, { // adjust route if needed
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(contactForm),
    });

    const data = await response.json();

    if (response.ok) {
      // Success: show confirmation
      setFormSubmitted(true);
      setContactForm({
        name: "",
        email: "",
        subject: "",
        message: "",
        priority: "medium",
      });
      console.log("✅ Email sent successfully:", data);
    } else {
      // Backend returned error
      console.error("❌ Failed to send email:", data.message);
      alert(`Failed to send email: ${data.message}`);
    }
  } catch (error) {
    console.error("❌ Error sending email:", error);
    alert("Something went wrong. Please try again later.");
  }
};


  const toggleFAQ = (uniqueIndex) => {
    setExpandedFAQ(expandedFAQ === uniqueIndex ? null : uniqueIndex);
  };

  const faqs = [
    {
      category: 'Getting Started',
      icon: <Zap />,
      questions: [
        {
          q: 'How do I create an account?',
          a: "Click the 'Sign Up' button, provide your email, create a password. Verify via email.",
        },
        {
          q: 'Is RouteVision free to use?',
          a: 'Yes! Free tier available. Premium adds analytics & priority support.',
        },
        {
          q: 'What devices are supported?',
          a: 'All modern browsers (Chrome, Firefox, Safari, Edge) on desktop & mobile.',
        },
      ],
    },
    {
      category: 'Navigation & Routes',
      icon: <MapPin />,
      questions: [
        {
          q: 'How accurate are the route predictions?',
          a: 'Uses Google Maps API real-time traffic, ~95% accurate under normal conditions.',
        },
        {
          q: 'Can I use RouteVision offline?',
          a: 'Not yet. Offline maps in progress for premium users.',
        },
        {
          q: 'How do I save my favorite routes?',
          a: 'Plan a route → click heart icon → view in dashboard.',
        },
      ],
    },
    {
      category: 'Street View & Videos',
      icon: <Video />,
      questions: [
        {
          q: "Why can't I see Street View for some routes?",
          a: "Depends on Google's coverage. Rural areas may be missing imagery.",
        },
        {
          q: 'How often are route videos updated?',
          a: 'Generated from Google Street View updates (major roads updated regularly).',
        },
        {
          q: 'Can I download route videos?',
          a: 'Videos are streamed. Premium users get longer, higher-quality streams.',
        },
      ],
    },
    {
      category: 'Account & Billing',
      icon: <Users />,
      questions: [
        {
          q: 'How do I change my password?',
          a: "Account Settings → Security → 'Change Password'.",
        },
        {
          q: 'What payment methods do you accept?',
          a: 'Credit cards, PayPal, UPI. SSL encrypted.',
        },
        {
          q: 'How do I cancel my subscription?',
          a: "Account Settings → Billing → 'Cancel Subscription'. Active until period ends.",
        },
      ],
    },
  ];

  const supportOptions = [
    {
      title: 'Live Chat',
      description: 'Instant help from our support team',
      icon: <MessageCircle />,
      available: '24/7',
      action: 'Start Chat',
    },
    {
      title: 'Email Support',
      description: 'Send us a detailed message',
      icon: <Mail />,
      available: 'Response in 24h',
      action: 'Send Email',
    },
    {
      title: 'Phone Support',
      description: 'Call our hotline',
      icon: <Phone />,
      available: '9 AM - 6 PM IST',
      action: 'Call Now',
    },
  ];

  const resources = [
    { title: 'User Guide', description: 'Complete guide to RouteVision', icon: <Book /> },
    { title: 'Video Tutorials', description: 'Step-by-step instructions', icon: <Video /> },
    { title: 'API Documentation', description: 'For developers', icon: <FileText /> },
    { title: 'Community Forum', description: 'Connect with others', icon: <Users /> },
  ];

  const filteredFAQs = faqs
    .map((category) => ({
      ...category,
      questions: category.questions.filter(
        (faq) =>
          faq.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
          faq.a.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    }))
    .filter((category) => category.questions.length > 0);

  return (
    <div className="min-h-screen bg-black overflow-x-hidden">
      {/* Hero */}
      <section className="py-20 bg-gradient-to-br from-gray-900 via-black to-gray-800 text-center relative">
        <div className="flex justify-center items-center mb-6">
          <HelpCircle className="text-lime-400 text-6xl mr-4 animate-spin" />
          <h1 className="text-5xl font-bold text-white">Support Center</h1>
        </div>
        <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto">
          Get help, find answers, and connect with our team.
        </p>
        <div className="flex justify-center gap-4">
          <button
            onClick={() => window.history.back()}
            className="border-2 border-lime-400 text-lime-400 px-6 py-2 rounded-lg font-semibold hover:bg-lime-400 hover:text-black transition-all"
          >
            ← Back to Home
          </button>
          <button
            onClick={() => scrollToSection('contact-form')}
            className="bg-lime-400 text-black px-6 py-2 rounded-lg font-semibold hover:bg-lime-500 transition-all"
          >
            Contact Support
          </button>
        </div>
      </section>

      {/* Tabs */}
      <section className="py-8 bg-gradient-to-b from-black to-gray-900">
        <div className="flex justify-center bg-gray-800 rounded-xl max-w-md mx-auto p-1 space-x-1">
          {[
            { id: 'faq', label: 'FAQs', icon: <HelpCircle size={18} /> },
            { id: 'resources', label: 'Resources', icon: <Book size={18} /> },
            { id: 'contact', label: 'Contact', icon: <Mail size={18} /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium ${
                activeTab === tab.id
                  ? 'bg-lime-400 text-black'
                  : 'text-gray-300 hover:text-lime-400 hover:bg-gray-700'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* FAQs */}
      {activeTab === 'faq' && (
        <section className="py-16 bg-gradient-to-b from-gray-900 to-black">
          <div className="max-w-4xl mx-auto px-4">
            <h2 className="text-4xl font-bold text-center mb-12 text-white animate-fade-in">
              Frequently Asked Questions
            </h2>
            <div className="relative mb-12">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search for answers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-gray-800 border border-gray-600 rounded-xl pl-12 pr-4 py-3 text-white"
              />
            </div>
            {filteredFAQs.map((category, ci) => (
              <div key={category.category} className="mb-10">
                <div className="flex items-center mb-4 text-lime-400">
                  {category.icon}
                  <h3 className="ml-3 text-2xl text-white">{category.category}</h3>
                </div>
                {category.questions.map((faq, fi) => {
                  const uid = `${ci}-${fi}`;
                  const open = expandedFAQ === uid;
                  return (
                    <div
                      key={fi}
                      className="group bg-gray-800 border border-gray-700 rounded-2xl shadow-lg transition-all duration-500 transform hover:scale-102 hover:shadow-2xl hover:shadow-lime-400/10 cursor-pointer animate-slide-up hover:border-lime-400/50 mb-3"
                      style={{ animationDelay: `${fi * 100}ms` }}
                    >
                      <div
                        onClick={() => toggleFAQ(uid)}
                        className="p-6 flex justify-between items-center"
                      >
                        <h4 className="text-lg font-bold text-white group-hover:text-lime-400 transition-colors duration-300 flex-1">
                          {faq.q}
                        </h4>
                        <div className="ml-4 transform transition-transform duration-300">
                          {open ? (
                            <ChevronUp className="text-lime-400 w-6 h-6 animate-bounce" />
                          ) : (
                            <ChevronDown className="text-gray-400 group-hover:text-lime-400 w-6 h-6 transition-colors duration-300 group-hover:animate-bounce" />
                          )}
                        </div>
                      </div>

                      <div
                        className={`overflow-hidden transition-all duration-500 ease-in-out ${
                          open ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
                        }`}
                      >
                        <div className="px-6 pb-6">
                          <div className="border-t border-gray-600 pt-4">
                            <p className="text-gray-300 animate-fade-in leading-relaxed">
                              {faq.a}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Glow effect */}
                      <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-lime-400 to-lime-500 opacity-0 group-hover:opacity-10 transition-opacity duration-300 -z-10 blur-sm"></div>
                    </div>
                  );
                })}
              </div>
            ))}
            {filteredFAQs.length === 0 && (
              <div className="text-center text-gray-400">No results found.</div>
            )}
          </div>
        </section>
      )}

      {/* Resources */}
      {activeTab === 'resources' && (
        <section className="py-16 bg-gradient-to-b from-gray-900 to-black">
          <div className="max-w-6xl mx-auto px-4 grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {resources.map((r) => (
              <div
                key={r.title}
                className="bg-gray-800 p-6 rounded-2xl text-center hover:scale-105 transition-transform"
              >
                <div className="text-lime-400 text-4xl mb-3">{r.icon}</div>
                <h3 className="text-lg text-white">{r.title}</h3>
                <p className="text-gray-400 text-sm">{r.description}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Contact */}
      {activeTab === 'contact' && (
        <section id="contact-form" className="py-16 bg-gradient-to-b from-gray-900 to-black">
          <div className="max-w-6xl mx-auto px-4">
            <h2 className="text-4xl font-bold text-center mb-12 text-white">Get in Touch</h2>
            
            {/* Support Options */}
            <div className="grid md:grid-cols-3 gap-6 mb-12">
              {supportOptions.map((option, index) => (
                <div
                  key={option.title}
                  className="bg-gray-800 p-6 rounded-2xl text-center hover:scale-105 transition-all duration-300 animate-fade-in"
                  style={{ animationDelay: `${index * 200}ms` }}
                >
                  <div className="text-lime-400 text-4xl mb-4">{option.icon}</div>
                  <h3 className="text-xl font-bold text-white mb-2">{option.title}</h3>
                  <p className="text-gray-400 mb-3">{option.description}</p>
                  <div className="text-sm text-lime-400 mb-4 flex items-center justify-center">
                    <Clock size={16} className="mr-1" />
                    {option.available}
                  </div>
                  <button className="bg-lime-400 text-black px-4 py-2 rounded-lg font-semibold hover:bg-lime-500 transition-colors">
                    {option.action}
                  </button>
                </div>
              ))}
            </div>

            {/* Contact Form */}
            <div className="max-w-2xl mx-auto">
              <div className="bg-gray-800 p-8 rounded-2xl shadow-2xl animate-fade-in">
                <h3 className="text-2xl font-bold text-white mb-6 text-center">Send us a Message</h3>
                
                {formSubmitted ? (
                  <div className="bg-green-900 border border-green-700 p-6 rounded-lg text-center animate-zoom-in">
                    <div className="text-green-400 text-4xl mb-3">✓</div>
                    <h4 className="text-xl font-bold text-green-300 mb-2">Message Sent!</h4>
                    <p className="text-green-400">Thanks for reaching out. We'll get back to you soon!</p>
                    <button
                      onClick={() => setFormSubmitted(false)}
                      className="mt-4 bg-lime-400 text-black px-4 py-2 rounded-lg font-semibold hover:bg-lime-500 transition-colors"
                    >
                      Send Another Message
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <input
                        type="text"
                        name="name"
                        placeholder="Your Name"
                        value={contactForm.name}
                        onChange={handleFormChange}
                        required
                        className="w-full p-3 bg-gray-900 text-white rounded-lg border border-gray-700 focus:border-lime-400 focus:ring-1 focus:ring-lime-400 outline-none transition-all"
                      />
                      <input
                        type="email"
                        name="email"
                        placeholder="Your Email"
                        value={contactForm.email}
                        onChange={handleFormChange}
                        required
                        className="w-full p-3 bg-gray-900 text-white rounded-lg border border-gray-700 focus:border-lime-400 focus:ring-1 focus:ring-lime-400 outline-none transition-all"
                      />
                    </div>
                    
                    <div className="grid md:grid-cols-2 gap-4">
                      <input
                        type="text"
                        name="subject"
                        placeholder="Subject"
                        value={contactForm.subject}
                        onChange={handleFormChange}
                        required
                        className="w-full p-3 bg-gray-900 text-white rounded-lg border border-gray-700 focus:border-lime-400 focus:ring-1 focus:ring-lime-400 outline-none transition-all"
                      />
                      <select
                        name="priority"
                        value={contactForm.priority}
                        onChange={handleFormChange}
                        className="w-full p-3 bg-gray-900 text-white rounded-lg border border-gray-700 focus:border-lime-400 focus:ring-1 focus:ring-lime-400 outline-none transition-all"
                      >
                        <option value="low">Low Priority</option>
                        <option value="medium">Medium Priority</option>
                        <option value="high">High Priority</option>
                        <option value="urgent">Urgent</option>
                      </select>
                    </div>
                    
                    <textarea
                      name="message"
                      placeholder="Your Message"
                      value={contactForm.message}
                      onChange={handleFormChange}
                      required
                      rows="6"
                      className="w-full p-3 bg-gray-900 text-white rounded-lg border border-gray-700 focus:border-lime-400 focus:ring-1 focus:ring-lime-400 outline-none transition-all resize-none"
                    />
                    
                    <button
                      type="submit"
                      className="w-full bg-lime-400 text-black font-semibold py-3 rounded-lg hover:bg-lime-500 transition-all duration-300 transform hover:scale-105"
                    >
                      Send Message
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

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

        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }

        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.05); opacity: 0.8; }
        }

        @keyframes zoom-in {
          from { transform: scale(0.9); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }

        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }

        @keyframes typing {
          from { width: 0 }
          to { width: 100% }
        }

        @keyframes gradient-move {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        /* Animation utility classes */
        .animate-fade-in { animation: fade-in 0.8s ease-out; }
        .animate-slide-up { animation: slide-up 0.8s ease-out; }
        .animate-spin-slow { animation: spin-slow 3s linear infinite; }
        .animate-bounce { animation: bounce 1s infinite; }
        .animate-pulse { animation: pulse 1.5s infinite; }
        .animate-zoom-in { animation: zoom-in 0.6s ease-out; }
        .animate-shake { animation: shake 0.5s ease-in-out; }
        .animate-typing { 
          overflow: hidden;
          white-space: nowrap;
          border-right: 2px solid #84cc16;
          animation: typing 2s steps(20) forwards;
        }
        .animate-gradient {
          background: linear-gradient(270deg, #84cc16, #65a30d, #4ade80, #22c55e);
          background-size: 400% 400%;
          animation: gradient-move 8s ease infinite;
        }

        /* Animation delays */
        .delay-200 { animation-delay: 200ms; }
        .delay-300 { animation-delay: 300ms; }
        .delay-400 { animation-delay: 400ms; }
        .delay-500 { animation-delay: 500ms; }

        /* Hover effect */
        .hover\\:scale-102:hover { transform: scale(1.02); }

        .group:hover .group-hover\\:animate-bounce {
          animation: bounce 1s infinite;
        }

        /* Custom scrollbar for dark theme */
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

export default Support;
