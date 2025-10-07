import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, User, Calendar, Clock, Navigation, BookOpen, Zap, Route } from 'lucide-react';

const BlogPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();

  const blogPosts = {
    'city-exploration': {
      title: "Best Routes for City Exploration",
      author: "Sarah Chen",
      date: "August 15, 2025",
      readTime: "8 min read",
      content: `
# Discovering Urban Treasures: Your Guide to City Exploration

Cities are living, breathing entities filled with hidden gems waiting to be discovered. Whether you're a tourist visiting for the first time or a local looking to see your hometown through fresh eyes, the right route can transform an ordinary walk into an extraordinary adventure.

## Why Route Planning Matters

The difference between a mediocre city experience and an unforgettable one often comes down to planning. A well-thought-out route connects the dots between attractions, local favorites, and unexpected discoveries, creating a narrative that unfolds with each step.

## Essential Elements of Great Urban Routes

### 1. Mix of Popular and Hidden Spots
The best city routes balance must-see attractions with lesser-known local favorites. While iconic landmarks provide context and photo opportunities, it's often the small neighborhood café or street art alley that creates lasting memories.

### 2. Walkability and Flow
Consider the natural flow of foot traffic and the physical demands of your route. A good urban exploration route should feel organic, not forced, with logical connections between stops that enhance rather than exhaust the experience.

### 3. Cultural Immersion Points
Look for opportunities to engage with local culture - farmer's markets, community spaces, local shops, and residential neighborhoods where you can observe daily life unfold naturally.

## Top City Exploration Strategies

### The Neighborhood Deep Dive
Instead of trying to cover the entire city, pick 2-3 connected neighborhoods and explore them thoroughly. This approach allows you to understand the character and rhythm of different areas while maintaining a manageable pace.

### The Thematic Journey
Organize your route around themes like "Street Art Trail," "Foodie's Paradise," or "Architectural Wonders." This creates a cohesive narrative and helps you discover connections between different parts of the city.

### The Local's Perspective
Research routes that locals actually use for their daily activities. Follow the path from residential areas to business districts, stopping at the places where people actually live, work, and socialize.

## Timing Your Urban Adventure

The time of day dramatically affects your city exploration experience. Early morning routes offer peaceful streets and the chance to see the city wake up. Lunch hour brings energy and activity, while evening routes showcase nightlife and illuminated landmarks.

Consider seasonal factors too - spring and fall often provide ideal weather, while summer might require more shaded routes and winter exploration might focus on indoor connections between outdoor stops.

## Making the Most of Your Journey

Remember that the best city exploration happens when you're open to spontaneity within your planned framework. Allow time for unexpected discoveries, conversations with locals, and those perfect photo moments that can't be scheduled.

Your route is a suggestion, not a rigid itinerary. The goal is to create a framework that guides your exploration while leaving room for the magic of urban discovery to unfold naturally.
      `
    },
    'navigation-tips': {
      title: "Navigation Tips for Beginners",
      author: "Marcus Rodriguez",
      date: "August 12, 2025",
      readTime: "6 min read",
      content: `
# Mastering Navigation: Essential Skills for the Modern Explorer

Navigation in today's world combines traditional wayfinding skills with modern technology. Whether you're exploring a new city or hiking unfamiliar trails, developing strong navigation skills builds confidence and enhances every journey.

## Building Your Navigation Foundation

### Understanding Your Tools
Modern navigation relies on multiple tools working together. Your smartphone provides GPS accuracy and real-time updates, but understanding how to read physical maps, use a compass, and recognize natural landmarks ensures you're never truly lost.

### The Art of Observation
Great navigators are keen observers. They notice landmark buildings, unique street features, and natural elements that serve as reliable reference points. Developing this awareness takes practice but becomes second nature with time.

## Essential Navigation Techniques

### The Three-Point Check
Before starting any journey, establish three key reference points: where you are, where you're going, and at least one major landmark you can use to orient yourself if you become confused.

### Progressive Planning
Break longer routes into segments with clear waypoints. This approach makes navigation more manageable and provides multiple opportunities to confirm you're on track.

### Backup Systems
Technology fails, batteries die, and signals get lost. Always have a backup plan - whether that's a printed map, written directions, or simply knowing how to ask for help in the local language.

## Digital Navigation Best Practices

### Offline Preparation
Download offline maps before venturing into areas with poor signal coverage. This simple step can save hours of frustration and ensure you stay on course even when connectivity is spotty.

### Battery Management
Navigation apps drain batteries quickly. Carry a portable charger, enable battery-saving modes, and consider using airplane mode with GPS still active to extend battery life while maintaining navigation capability.

### Multiple Apps Strategy
Different navigation apps excel in different situations. Urban explorers might prefer detailed transit information, while hikers need topographic features. Having 2-3 reliable apps provides options when one doesn't meet your specific needs.

## Reading the Environment

### Natural Navigation Cues
The sun rises in the east and sets in the west - a fundamental truth that works anywhere on Earth. Moss often grows on the north side of trees in the Northern Hemisphere, and mountain slopes can help establish direction even on cloudy days.

### Urban Landmarks
Cities have their own navigation language. Major roads often follow geographic features like rivers or ridge lines. Understanding a city's basic layout - whether it follows a grid system, radiates from a central point, or follows natural topography - provides context for every navigation decision.

## Common Navigation Mistakes

### Over-Reliance on Technology
While GPS is incredibly accurate, blind following can lead to problems. Always maintain awareness of your surroundings and trust your instincts when something doesn't feel right.

### Ignoring Scale and Time
Maps can be deceiving about actual distances and travel times. What looks like a short walk might involve significant elevation changes or busy intersections that slow progress considerably.

### Poor Communication
When traveling with others, ensure everyone understands the route and has access to navigation information. Designate a primary navigator but make sure the entire group can find their way if separated.

## Building Navigation Confidence

Start with familiar areas and gradually extend your comfort zone. Practice different navigation techniques in low-stakes situations so you're prepared when it really matters. Remember, getting slightly lost sometimes leads to the best discoveries - embrace the adventure while staying safe and informed.

The goal isn't to never make navigation mistakes, but to develop the skills and confidence to correct course quickly and learn from every journey.
      `
    },
    'maps-api': {
      title: "Google Maps API Integration",
      author: "Alex Thompson",
      date: "August 10, 2025",
      readTime: "10 min read",
      content: `
# Leveraging Google Maps API for Superior Route Planning

The Google Maps API represents one of the most powerful tools available for creating sophisticated navigation and route planning applications. Understanding how to harness its capabilities can transform basic mapping functionality into intelligent, user-focused experiences.

## Why Google Maps API Matters

### Comprehensive Data Coverage
Google Maps API provides access to the same robust dataset that powers Google Maps, including real-time traffic data, business information, street view imagery, and detailed routing algorithms that consider multiple transportation modes.

### Scalability and Reliability
Built to handle billions of requests, the API infrastructure ensures consistent performance whether you're building a small local app or a global platform serving millions of users.

## Core API Components for Route Planning

### Directions API
The foundation of route planning functionality, the Directions API calculates optimal routes between locations while considering traffic conditions, transportation modes, and user preferences like avoiding tolls or highways.

### Distance Matrix API
Perfect for applications that need to calculate travel times and distances between multiple points simultaneously. This is particularly valuable for delivery optimization, service area calculations, and comparative route analysis.

### Roads API
Provides advanced functionality for GPS tracking applications, including snap-to-road features that ensure location data aligns with actual roadways, even when GPS accuracy is imperfect.

## Advanced Integration Strategies

### Real-Time Optimization
Combine multiple API calls to create dynamic routing that adapts to changing conditions. Traffic data updates constantly, and sophisticated implementations can reroute users proactively when conditions change.

### Multi-Modal Route Planning
Modern users need options. Integrate walking, driving, cycling, and public transit options to provide comprehensive journey planning that adapts to user preferences and real-world constraints.

### Predictive Intelligence
Use historical traffic patterns and current conditions to predict optimal departure times. This forward-thinking approach helps users plan journeys that avoid predictable delays.

## Implementation Best Practices

### Efficient API Usage
Structure your requests to minimize API calls while maximizing functionality. Batch requests when possible, cache frequently accessed data appropriately, and implement intelligent retry logic for handling temporary service interruptions.

### Error Handling and Fallbacks
Network connectivity isn't always reliable, and APIs occasionally experience issues. Robust implementations include graceful degradation strategies that maintain core functionality even when some services are unavailable.

### Performance Optimization
Large-scale applications require careful attention to performance. Implement lazy loading for map data, optimize image and resource loading, and consider user experience during loading states.

## User Experience Considerations

### Progressive Enhancement
Start with basic functionality and layer on advanced features. Users should be able to accomplish core tasks even if some enhanced features aren't available on their device or connection.

### Accessibility Integration
Ensure your navigation tools work for users with different abilities. This includes screen reader compatibility, high contrast options, and alternative input methods for users who can't interact with traditional touch interfaces.

### Localization and Cultural Adaptation
Google Maps API supports global use, but effective implementation requires understanding local navigation preferences, transportation norms, and cultural expectations about wayfinding.

## Technical Architecture Patterns

### Component-Based Design
Structure your mapping components for reusability and maintainability. Separate concerns between data fetching, route calculation, display logic, and user interaction handling.

### State Management
Route planning applications involve complex state relationships between current location, destination, route options, and user preferences. Implement robust state management patterns that keep your application predictable and debuggable.

### Caching Strategies
Intelligent caching reduces API costs and improves user experience. Cache route calculations, geocoding results, and map tiles appropriately while respecting data freshness requirements.

## Security and Privacy Considerations

### API Key Management
Protect your API credentials through proper key restriction, environment-specific configurations, and regular rotation schedules. Never expose unrestricted API keys in client-side code.

### User Data Handling
Location data is highly sensitive. Implement privacy-first approaches that give users control over their data while providing the functionality they expect from modern navigation applications.

## Future-Proofing Your Integration

Google continues evolving their mapping platform with new features and capabilities. Build your integration with flexibility in mind, using abstraction layers that allow you to adapt to API changes and incorporate new features as they become available.

The most successful Google Maps API integrations don't just display maps - they create intelligent, adaptive experiences that understand user intent and provide value that goes beyond basic directions. Focus on solving real navigation problems, and the technical implementation will follow naturally.
      `
    }
  };

  const currentPost = blogPosts[slug] || blogPosts['city-exploration'];

  const formatContent = (content) => {
    const lines = content.trim().split('\n');
    const elements = [];
    let currentElement = '';
    let elementType = 'p';

    for (let line of lines) {
      if (line.startsWith('# ')) {
        if (currentElement) {
          elements.push({ type: elementType, content: currentElement.trim() });
          currentElement = '';
        }
        elements.push({ type: 'h1', content: line.substring(2) });
      }
      else if (line.startsWith('## ')) {
        if (currentElement) {
          elements.push({ type: elementType, content: currentElement.trim() });
          currentElement = '';
        }
        elements.push({ type: 'h2', content: line.substring(3) });
      } 
      else if (line.startsWith('### ')) {
        if (currentElement) {
          elements.push({ type: elementType, content: currentElement.trim() });
          currentElement = '';
        }
        elements.push({ type: 'h3', content: line.substring(4) });
      }
      else if (line.trim() === '') {
        if (currentElement) {
          elements.push({ type: elementType, content: currentElement.trim() });
          currentElement = '';
          elementType = 'p';
        }
      } else {
        currentElement += line + ' ';
      }
    }

    if (currentElement) {
      elements.push({ type: elementType, content: currentElement.trim() });
    }

    return elements.map((element, index) => {
      switch (element.type) {
        case 'h1':
          return (
            <h1 key={index} className="text-4xl font-bold text-lime-400 mb-8 mt-10 animate-slide-up">
              {element.content}
            </h1>
          );
        case 'h2':
          return (
            <h2 key={index} className="text-2xl font-bold text-white mb-6 mt-10 border-l-4 border-lime-400 pl-6 animate-slide-up" style={{ animationDelay: `${index * 0.1}s` }}>
              {element.content}
            </h2>
          );
        case 'h3':
          return (
            <h3 key={index} className="text-xl font-semibold text-lime-300 mb-4 mt-8 animate-slide-up" style={{ animationDelay: `${index * 0.1}s` }}>
              {element.content}
            </h3>
          );
        default:
          return (
            <p key={index} className="text-gray-300 mb-6 leading-relaxed text-lg animate-slide-up" style={{ animationDelay: `${index * 0.05}s` }}>
              {element.content}
            </p>
          );
      }
    });
  };

  const RelatedPosts = () => {
    const otherPosts = Object.keys(blogPosts).filter(key => key !== slug);
    
    return (
      <div className="bg-gray-800/70 backdrop-blur-xl p-8 rounded-2xl mt-12 border border-gray-700 animate-slide-up hover:shadow-lime-400/10 transition-all duration-500">
        <h3 className="text-2xl font-bold text-lime-400 mb-6 flex items-center gap-3">
          <div className="p-2 bg-lime-400/20 rounded-full">
            <BookOpen className="w-5 h-5" />
          </div>
          Related Articles
        </h3>
        <div className="grid md:grid-cols-2 gap-6">
          {otherPosts.map((postKey, index) => {
            const post = blogPosts[postKey];
            return (
              <div 
                key={postKey} 
                className="group bg-gray-700/50 p-6 rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-105 hover:-translate-y-2 border border-gray-600 hover:border-lime-400/50 backdrop-blur-sm animate-slide-up"
                style={{ animationDelay: `${index * 0.2}s` }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 bg-lime-400 rounded-full animate-pulse"></div>
                  <h4 className="text-lg font-semibold text-white group-hover:text-lime-400 transition-colors duration-300">
                    {post.title}
                  </h4>
                </div>
                <div className="flex items-center gap-4 mb-4 text-gray-400 text-sm">
                  <div className="flex items-center gap-1">
                    <User className="w-3 h-3" />
                    <span>{post.author}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{post.readTime}</span>
                  </div>
                </div>
                <button
                  onClick={() => navigate(`/blog/${postKey}`)}
                  className="group/btn flex items-center gap-2 text-lime-400 font-semibold hover:text-lime-300 transition-all duration-300"
                >
                  <span className="group-hover/btn:translate-x-2 transition-transform duration-300">Read Article</span>
                  <span className="group-hover/btn:translate-x-2 transition-transform duration-300">→</span>
                </button>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-10 left-10 w-20 h-20 bg-lime-400/10 rounded-full animate-bounce blur-sm"></div>
        <div className="absolute top-32 right-20 w-16 h-16 bg-lime-400/15 rounded-full animate-pulse"></div>
        <div className="absolute bottom-20 left-1/4 w-24 h-24 bg-lime-400/8 rounded-full animate-bounce blur-sm" style={{ animationDelay: '0.5s' }}></div>
        <div className="absolute bottom-32 right-10 w-12 h-12 bg-lime-400/20 rounded-full animate-pulse" style={{ animationDelay: '0.7s' }}></div>
        
        {/* Geometric shapes */}
        <div className="absolute top-20 right-1/4 w-8 h-8 border-2 border-lime-400/20 transform rotate-45 animate-spin opacity-30" style={{ animationDuration: '8s' }}></div>
        <div className="absolute bottom-1/3 left-1/4 w-6 h-6 bg-lime-400/15 transform rotate-12 animate-pulse"></div>
      </div>

      {/* Header */}
      <div className="relative z-10 bg-gradient-to-r from-gray-900/90 to-gray-800/90 backdrop-blur-xl text-white py-20 border-b border-gray-700 animate-slide-down">
        <div className="container mx-auto px-4">
          <button 
            onClick={() => navigate('/')}
            className="group flex items-center gap-3 text-gray-300 hover:text-lime-400 mb-8 transition-all duration-300 transform hover:scale-105 animate-slide-up"
          >
            <div className="p-2 bg-gray-700/50 rounded-full group-hover:bg-lime-400/20 transition-all duration-300">
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform duration-300" />
            </div>
            <span className="font-medium">Back to Home</span>
          </button>
          
          <div className="flex items-center gap-4 mb-6 animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <div className="p-4 bg-lime-400/20 rounded-full animate-pulse">
              {slug === 'city-exploration' ? <MapPin className="w-8 h-8 text-lime-400" /> :
               slug === 'navigation-tips' ? <Navigation className="w-8 h-8 text-lime-400" /> :
               <Route className="w-8 h-8 text-lime-400" />}
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-lime-400">
              {currentPost.title}
            </h1>
          </div>
          
          <div className="flex flex-wrap items-center gap-8 text-gray-300 animate-slide-up" style={{ animationDelay: '0.4s' }}>
            <div className="flex items-center gap-3 group">
              <div className="p-2 bg-gray-700/50 rounded-full group-hover:bg-lime-400/20 transition-all duration-300">
                <User className="w-4 h-4" />
              </div>
              <span className="group-hover:text-lime-400 transition-colors duration-300">{currentPost.author}</span>
            </div>
            <div className="flex items-center gap-3 group">
              <div className="p-2 bg-gray-700/50 rounded-full group-hover:bg-lime-400/20 transition-all duration-300">
                <Calendar className="w-4 h-4" />
              </div>
              <span className="group-hover:text-lime-400 transition-colors duration-300">{currentPost.date}</span>
            </div>
            <div className="flex items-center gap-3 group">
              <div className="p-2 bg-gray-700/50 rounded-full group-hover:bg-lime-400/20 transition-all duration-300">
                <Clock className="w-4 h-4" />
              </div>
              <span className="group-hover:text-lime-400 transition-colors duration-300">{currentPost.readTime}</span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="relative z-10 container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <article className="bg-gray-800/50 backdrop-blur-xl rounded-2xl p-8 md:p-12 shadow-2xl border border-gray-700 mb-12 animate-slide-up" style={{ animationDelay: '0.6s' }}>
            <div className="prose prose-lg max-w-none">
              {formatContent(currentPost.content)}
            </div>
          </article>
          
          <RelatedPosts />
          
          {/* Call to Action */}
          <div className="bg-gradient-to-r from-lime-500/90 to-lime-400/90 backdrop-blur-xl text-black p-8 rounded-2xl mt-12 text-center border border-lime-400/30 shadow-2xl hover:shadow-lime-400/20 transition-all duration-500 animate-slide-up">
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-black/20 rounded-full animate-bounce">
                <Zap className="w-8 h-8 text-black" />
              </div>
            </div>
            <h3 className="text-3xl font-bold mb-4">Ready to Start Exploring?</h3>
            <p className="text-lg mb-8 text-black/80 max-w-2xl mx-auto">
              Put these tips into practice with RouteVision's advanced route planning tools and AI-powered navigation.
            </p>
            <button 
              onClick={() => navigate('/user-signup')}
              className="group bg-black text-lime-400 px-8 py-4 rounded-lg font-semibold hover:bg-gray-900 transition-all duration-300 transform hover:scale-105 hover:shadow-xl relative overflow-hidden"
            >
              <span className="relative z-10 flex items-center gap-2 group-hover:animate-pulse">
                <MapPin className="w-5 h-5" />
                Get Started Now
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-lime-400/0 via-lime-400/20 to-lime-400/0 transform skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes slide-down {
          from { opacity: 0; transform: translateY(-30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .animate-fade-in { animation: fade-in 0.8s ease-out; }
        .animate-slide-up { animation: slide-up 0.8s ease-out; }
        .animate-slide-down { animation: slide-down 0.8s ease-out; }
        
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

export default BlogPage;