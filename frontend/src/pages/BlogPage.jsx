// 1. First, create individual blog components

// BlogPage.jsx - Main blog component
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, User, Calendar, Clock } from 'lucide-react';

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
      } else if (line.startsWith('## ')) {
        if (currentElement) {
          elements.push({ type: elementType, content: currentElement.trim() });
          currentElement = '';
        }
        elements.push({ type: 'h2', content: line.substring(3) });
      } else if (line.startsWith('### ')) {
        if (currentElement) {
          elements.push({ type: elementType, content: currentElement.trim() });
          currentElement = '';
        }
        elements.push({ type: 'h3', content: line.substring(4) });
      } else if (line.trim() === '') {
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
            <h1 key={index} className="text-3xl font-bold text-gray-800 mb-6 mt-8">
              {element.content}
            </h1>
          );
        case 'h2':
          return (
            <h2 key={index} className="text-2xl font-bold text-gray-800 mb-4 mt-8 border-l-4 border-lime-500 pl-4">
              {element.content}
            </h2>
          );
        case 'h3':
          return (
            <h3 key={index} className="text-xl font-semibold text-lime-600 mb-3 mt-6">
              {element.content}
            </h3>
          );
        default:
          return (
            <p key={index} className="text-gray-700 mb-4 leading-relaxed">
              {element.content}
            </p>
          );
      }
    });
  };

  const RelatedPosts = () => {
    const otherPosts = Object.keys(blogPosts).filter(key => key !== slug);
    
    return (
      <div className="bg-gray-50 p-8 rounded-xl mt-12">
        <h3 className="text-2xl font-bold text-gray-800 mb-6">Related Articles</h3>
        <div className="grid md:grid-cols-2 gap-6">
          {otherPosts.map(postKey => {
            const post = blogPosts[postKey];
            return (
              <div key={postKey} className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition">
                <h4 className="text-lg font-semibold text-gray-800 mb-2">{post.title}</h4>
                <p className="text-gray-600 mb-3 text-sm">By {post.author} • {post.readTime}</p>
                <button
                  onClick={() => navigate(`/blog/${postKey}`)}
                  className="text-lime-500 font-semibold hover:text-lime-600 transition"
                >
                  Read Article →
                </button>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-lime-500 to-lime-400 text-white py-16">
        <div className="container mx-auto px-4">
          <button 
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-white/80 hover:text-white mb-6 transition"
          >
            <ArrowLeft size={20} />
            Back to Home
          </button>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            {currentPost.title}
          </h1>
          <div className="flex flex-wrap items-center gap-6 text-white/90">
            <div className="flex items-center gap-2">
              <User size={18} />
              <span>{currentPost.author}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar size={18} />
              <span>{currentPost.date}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock size={18} />
              <span>{currentPost.readTime}</span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <article className="prose prose-lg max-w-none">
            {formatContent(currentPost.content)}
          </article>
          
          <RelatedPosts />
          
          {/* Call to Action */}
          <div className="bg-gradient-to-r from-lime-500 to-lime-400 text-white p-8 rounded-xl mt-12 text-center">
            <h3 className="text-2xl font-bold mb-4">Ready to Start Exploring?</h3>
            <p className="text-lg mb-6 text-white/90">
              Put these tips into practice with RouteVision's advanced route planning tools.
            </p>
            <button 
              onClick={() => navigate('/signup')}
              className="bg-white text-lime-500 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition"
            >
              Get Started
            </button>
          </div>
        </div>
      </div>
      
      {/* Footer */}
      <footer className="bg-gray-800 text-white py-12">
        <div className="container mx-auto px-4 text-center">
          <div className="flex justify-center items-center gap-2 mb-4">
            <MapPin className="text-lime-400" size={24} />
            <span className="text-xl font-semibold">RouteVision</span>
          </div>
          <p className="text-gray-400">
            Discover routes with immersive video experiences and Street View integration.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default BlogPage;

