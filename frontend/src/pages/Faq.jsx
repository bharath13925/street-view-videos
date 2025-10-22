import React, { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

const FAQ = () => {
  const [openFAQ, setOpenFAQ] = useState(null);

  const faqData = [
  {
    question: "What is the main purpose of this system?",
    answer:
      "The system aims to generate smooth and realistic route visualization videos for Vijayawada using Google Maps and Street View data. It helps users preview their routes as immersive drive-through experiences rather than static maps."
  },
  {
    question: "How are the routes visualized?",
    answer:
      "The system fetches Street View images along the selected path using latitude, longitude, and heading values. These images are processed using Visual Odometry, LSTM smoothing, and Optical Flow interpolation to create a continuous and realistic video of the route."
  },
  {
    question: "What technologies and APIs are used?",
    answer:
      "It integrates multiple Google Maps APIs including Directions, Street View Static, and Static Maps APIs, combined with Python-based processing using OpenCV, TensorFlow, and deep  learning models for image smoothing and interpolation."
  },
  {
    question: "How does the system ensure smooth transitions between frames?",
    answer:
      "The system applies LSTM models trained on the KITTI Odometry dataset to refine noisy GPS headings, and uses Optical Flow algorithms such as Farneback and RAFT to generate interpolated frames for continuous motion."
  },
  {
    question: "Can this system be extended beyond Vijayawada?",
    answer:
      "Yes. Although initially focused on Vijayawada, the framework can be adapted to any city supported by Google Street View by changing the input coordinates and route parameters."
  },
  {
    question: "What are the main outputs of the system?",
    answer:
      "The final outputs include a smooth route visualization video, a static reference map highlighting start and end points, and performance metrics showing processing time, smoothness improvement, and frame interpolation success rate."
  }
];


  const toggleFAQ = (index) => {
    setOpenFAQ(openFAQ === index ? null : index);
  };

  return (
    <section id="faq" className="py-16 bg-gradient-to-b from-black to-gray-900">
      <div className="container mx-auto px-4">
        <h2 className="text-4xl font-bold text-center mb-12 text-white animate-fade-in">
          Frequently Asked Questions
        </h2>
        <div className="max-w-3xl mx-auto space-y-4">
          {faqData.map((faq, index) => (
            <div
              key={index}
              className="group bg-gray-800 border border-gray-700 rounded-2xl shadow-lg transition-all duration-500 transform hover:scale-102 hover:shadow-2xl hover:shadow-lime-400/10 cursor-pointer animate-slide-up hover:border-lime-400/50"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div
                className="p-6 flex justify-between items-center"
                onClick={() => toggleFAQ(index)}
              >
                <h3 className="text-lg font-bold text-white group-hover:text-lime-400 transition-colors duration-300 flex-1 cursor-pointer">
                  {faq.question}
                </h3>
                <div className="ml-4 transform transition-transform duration-300 cursor-pointer">
                  {openFAQ === index ? (
                    <ChevronUp className="text-lime-400 w-6 h-6 animate-bounce" />
                  ) : (
                    <ChevronDown className="text-gray-400 group-hover:text-lime-400 w-6 h-6 transition-colors duration-300 group-hover:animate-bounce" />
                  )}
                </div>
              </div>
              
              <div
                className={`overflow-hidden transition-all duration-500 ease-in-out ${
                  openFAQ === index ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
                }`}
              >
                <div className="px-6 pb-6">
                  <div className="border-t border-gray-600 pt-4">
                    <p className="text-gray-300 animate-fade-in leading-relaxed">{faq.answer}</p>
                  </div>
                </div>
              </div>

              {/* Enhanced glow effect on hover */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-lime-400 to-lime-500 opacity-0 group-hover:opacity-10 transition-opacity duration-300 -z-10 blur-sm"></div>
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .animate-fade-in { animation: fade-in 0.8s ease-out; }
        .animate-slide-up { animation: slide-up 0.8s ease-out; }
        
        .hover\\:scale-102:hover { transform: scale(1.02); }
        
        .group:hover .group-hover\\:animate-bounce {
          animation: bounce 1s infinite;
        }
      `}</style>
    </section>
  );
};

export default FAQ;