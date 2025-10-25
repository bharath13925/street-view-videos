import { useState, useEffect, useRef } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { MapPin, Route, Video, Play, Download, Clock, FileVideo, Camera, Navigation, Zap, Map, ExternalLink } from "lucide-react";

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [startLocation, setStartLocation] = useState("");
  const [endLocation, setEndLocation] = useState("");
  const [route, setRoute] = useState(null);
  const [startCoords, setStartCoords] = useState(null);
  const [endCoords, setEndCoords] = useState(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [interpolationFactor, setInterpolationFactor] = useState(2);
  const [analytics, setAnalytics] = useState(null);
  const [cacheStatus, setCacheStatus] = useState(null);
  const [mapImageUrl, setMapImageUrl] = useState(null);
  const [distance, setDistance] = useState(null);
  
  // Video generation states
  const [videoLoading, setVideoLoading] = useState(false);
  const [videoStatus, setVideoStatus] = useState("");
  const [videoInfo, setVideoInfo] = useState(null);
  const [videoSettings, setVideoSettings] = useState({
    fps: 30,
    quality: "high",
    includeInterpolated: true
  });

  const startRef = useRef(null);
  const endRef = useRef(null);
  const backendUrl = import.meta.env.VITE_BACKEND_URL;
  const pythonUrl = import.meta.env.VITE_MICROSERVICE_URL;

  // Calculate distance between two coordinates using Haversine formula
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    return distance;
  };

  // Format distance for display
  const formatDistance = (distanceKm) => {
    if (distanceKm < 1) {
      return `${(distanceKm * 1000).toFixed(0)} m`;
    }
    return `${distanceKm.toFixed(2)} km`;
  };

  // Generate Google Maps URL
  const getGoogleMapsUrl = () => {
    if (!startCoords || !endCoords) return null;
    return `https://www.google.com/maps/dir/?api=1&origin=${startCoords.lat},${startCoords.lng}&destination=${endCoords.lat},${endCoords.lng}&travelmode=driving`;
  };

  useEffect(() => {
    // Fetch logged-in Firebase user
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        const uid = firebaseUser.uid;
        fetch(`${backendUrl}/api/users/${uid}`)
          .then((res) => res.json())
          .then((data) => setUser(data))
          .catch((err) => console.error("Error fetching user", err));
      }
    });

    const initAutocomplete = () => {
      if (!window.google) return;

      const options = {
        types: ["establishment", "geocode"],
        componentRestrictions: { country: "in" },
      };

      const startAutocomplete = new window.google.maps.places.Autocomplete(
        startRef.current,
        options
      );
      startAutocomplete.addListener("place_changed", () => {
        const place = startAutocomplete.getPlace();
        setStartLocation(place.name && place.formatted_address && startRef.current.value);
        if (place.geometry) {
          setStartCoords({
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng(),
          });
        }
      });

      const endAutocomplete = new window.google.maps.places.Autocomplete(
        endRef.current,
        options
      );
      endAutocomplete.addListener("place_changed", () => {
        const place = endAutocomplete.getPlace();
        setEndLocation(place.name && place.formatted_address && endRef.current.value);
        if (place.geometry) {
          setEndCoords({
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng(),
          });
        }
      });
    };

    if (window.google) {
      initAutocomplete();
    } else {
      window.initMap = initAutocomplete;
    }

    return () => unsubscribe();
  }, [backendUrl]);

  // Generate static map when coordinates are available
  useEffect(() => {
    if (startCoords && endCoords) {
      generateStaticMap();
      // Calculate distance
      const dist = calculateDistance(
        startCoords.lat,
        startCoords.lng,
        endCoords.lat,
        endCoords.lng
      );
      setDistance(dist);
    } else {
      setMapImageUrl(null);
      setDistance(null);
    }
  }, [startCoords, endCoords]);

  const generateStaticMap = () => {
    if (!startCoords || !endCoords) return;

    const API_KEY = import.meta.env.VITE_PLACES_API_KEY;
    
    // Calculate center point
    const centerLat = (startCoords.lat + endCoords.lat) / 2;
    const centerLng = (startCoords.lng + endCoords.lng) / 2;
    
    // Calculate zoom level based on distance
    const latDiff = Math.abs(startCoords.lat - endCoords.lat);
    const lngDiff = Math.abs(startCoords.lng - endCoords.lng);
    const maxDiff = Math.max(latDiff, lngDiff);
    
    let zoom = 10;
    if (maxDiff < 0.01) zoom = 15;
    else if (maxDiff < 0.05) zoom = 13;
    else if (maxDiff < 0.1) zoom = 11;
    else if (maxDiff < 0.5) zoom = 9;
    else zoom = 8;

    const staticMapUrl = `https://maps.googleapis.com/maps/api/staticmap?` +
      `center=${centerLat},${centerLng}&` +
      `zoom=${zoom}&` +
      `size=800x400&` +
      `maptype=roadmap&` +
      `markers=color:green|label:A|${startCoords.lat},${startCoords.lng}&` +
      `markers=color:red|label:B|${endCoords.lat},${endCoords.lng}&` +
      `path=color:0x0000ff|weight:5|${startCoords.lat},${startCoords.lng}|${endCoords.lat},${endCoords.lng}&` +
      `key=${API_KEY}`;

    setMapImageUrl(staticMapUrl);
  };

  // Check for cached route when locations change
  useEffect(() => {
    if (startLocation && endLocation && startLocation.trim() !== "" && endLocation.trim() !== "") {
      checkForCachedRoute();
    } else {
      setCacheStatus(null);
    }
  }, [startLocation, endLocation, interpolationFactor, videoSettings.fps, videoSettings.quality]);

  // Fetch analytics when route changes
  useEffect(() => {
    if (route && route._id) {
      fetchAnalytics(route._id);
      // Check if route has video info
      if (route.videoGenerated && route.videoFilename) {
        setVideoInfo({
          filename: route.videoFilename,
          video_url: `${pythonUrl}/videos/${route.pythonRouteId}/${route.videoFilename}`,
          ...route.videoStats
        });
      }
    }
  }, [route, pythonUrl]);

  const fetchAnalytics = async (routeId) => {
    try {
      const response = await fetch(`${backendUrl}/api/routes/${routeId}/analytics`);
      const data = await response.json();
      if (response.ok) {
        setAnalytics(data.analytics);
      }
    } catch (err) {
      console.error("Error fetching analytics:", err);
    }
  };

  const checkForCachedRoute = async () => {
    try {
      const response = await fetch(`${backendUrl}/api/routes/check-existing`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          start: startLocation,
          end: endLocation,
          interpolation_factor: interpolationFactor,
          video_fps: videoSettings.fps,
          video_quality: videoSettings.quality
        })
      });

      const data = await response.json();
      if (response.ok) {
        setCacheStatus(data);
        console.log("Cache check result:", data);
      } else {
        setCacheStatus({ cached: false, error: data.error });
      }
    } catch (err) {
      console.error("Error checking cache:", err);
      setCacheStatus({ cached: false, error: "Failed to check cache" });
    }
  };

  const handleUseCachedRoute = () => {
    if (cacheStatus && cacheStatus.cached && cacheStatus.route) {
      setRoute(cacheStatus.route);
      if (cacheStatus.video_info) {
        setVideoInfo(cacheStatus.video_info);
        setVideoStatus(`Using cached video: ${cacheStatus.video_info.filename} (${cacheStatus.video_info.file_size_mb} MB)`);
      }
      setStatus(`Using cached route with ${cacheStatus.route.framesData?.length || 0} frames`);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!user) {
      console.error("User not logged in");
      return;
    }

    if (!startLocation || !endLocation) {
      console.error("Both start and end locations are required");
      return;
    }

    setLoading(true);
    setStatus("Generating route...");

    try {
      const genResponse = await fetch(
        `${backendUrl}/api/routes/generate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: user._id || user.uid,
            start: startLocation,
            end: endLocation,
          })
        }
      );
      
      const genData = await genResponse.json();
      if (!genResponse.ok) {
        throw new Error(genData.error || 'Failed to generate route');
      }
      
      const generatedRoute = genData.route;
      setRoute(generatedRoute);
      setStatus("Route generated successfully! Smoothing headings...");

      const smoothResponse = await fetch(
        `${backendUrl}/api/routes/${generatedRoute._id}/smooth`,
        { method: "POST" }
      );

      const smoothData = await smoothResponse.json();
      if (smoothResponse.ok && smoothData.route) {
        const smoothedRoute = smoothData.route;
        setRoute(smoothedRoute);
        
        const smoothedHeadings = smoothedRoute.framesData?.map(f => f.smoothedHeading) || [];
        
        if (smoothedHeadings.every(h => h === null || h === undefined)) {
          setStatus("Route smoothed, but no headings were processed.");
        } else {
          setStatus("Headings smoothed! Regenerating frames with corrected headings...");
          
          const regenerateResponse = await fetch(
            `${backendUrl}/api/routes/${smoothedRoute._id}/regenerate`,
            { method: "POST" }
          );

          const regenerateData = await regenerateResponse.json();
          if (regenerateResponse.ok && regenerateData.route) {
            const finalRoute = regenerateData.route;
            setRoute(finalRoute);
            
            const regeneratedCount = regenerateData.regenerated_count || 0;
            setStatus(`Route processed successfully! ${regeneratedCount} frames regenerated. Ready for interpolation.`);
          } else {
            setStatus("Route smoothed, but frame regeneration failed.");
          }
        }
      } else {
        setStatus("Route generated, but smoothing failed.");
      }

    } catch (err) {
      console.error("Error in route processing:", err);
      setStatus(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCompletePipeline = async (e) => {
    e.preventDefault();
    
    if (!user) {
      console.error("User not logged in");
      return;
    }

    if (!startLocation || !endLocation) {
      console.error("Both start and end locations are required");
      return;
    }

    setLoading(true);
    setStatus("Starting complete pipeline...");

    try {
      const response = await fetch(
        `${backendUrl}/api/routes/process-complete`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: user._id || user.uid,
            start: startLocation,
            end: endLocation,
            interpolation_factor: interpolationFactor,
          })
        }
      );
      
      const data = await response.json();
      if (response.ok && data.pipeline_success) {
        setRoute(data.route);
        const stats = data.statistics;
        setStatus(`Complete pipeline successful! Generated ${stats.total_final_frames} total frames`);
      } else {
        setStatus(`Pipeline failed: ${data.error}`);
      }

    } catch (err) {
      console.error("Error in complete pipeline:", err);
      setStatus(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCompletePipelineWithVideo = async (e) => {
    e.preventDefault();
    
    if (!user) {
      console.error("User not logged in");
      return;
    }

    if (!startLocation || !endLocation) {
      console.error("Both start and end locations are required");
      return;
    }

    setLoading(true);
    setStatus("Starting complete pipeline with video generation...");

    try {
      const response = await fetch(
        `${backendUrl}/api/routes/process-complete-with-video`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: user._id || user.uid,
            start: startLocation,
            end: endLocation,
            interpolation_factor: interpolationFactor,
            generate_video: true,
            video_fps: videoSettings.fps,
            video_quality: videoSettings.quality,
          })
        }
      );
      
      const data = await response.json();
      if (response.ok && data.pipeline_success) {
        setRoute(data.route);
        const stats = data.statistics;
        
        if (data.video_info) {
          setVideoInfo(data.video_info);
          setStatus(`Complete pipeline with video successful! Generated ${stats.total_final_frames} frames and video`);
        } else {
          setStatus(`Complete pipeline successful! Generated ${stats.total_final_frames} frames (video generation failed)`);
        }
      } else {
        setStatus(`Pipeline failed: ${data.error}`);
      }

    } catch (err) {
      console.error("Error in complete pipeline:", err);
      setStatus(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSmartPipelineWithCache = async (e) => {
    e.preventDefault();
    
    if (!user || !startLocation || !endLocation) {
      return;
    }

    setLoading(true);
    setStatus("Checking cache and starting smart pipeline...");

    try {
      const response = await fetch(
        `${backendUrl}/api/routes/process-complete-with-video-cached`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: user._id || user.uid,
            start: startLocation,
            end: endLocation,
            interpolation_factor: interpolationFactor,
            generate_video: true,
            video_fps: videoSettings.fps,
            video_quality: videoSettings.quality,
          })
        }
      );
      
      const data = await response.json();
      if (response.ok && data.pipeline_success) {
        setRoute(data.route);
        const stats = data.statistics;
        
        if (data.cached) {
          setStatus(`Using cached route! Loaded ${stats.total_final_frames || data.route.framesData?.length || 0} frames instantly`);
        } else {
          setStatus(`New route processed! Generated ${stats.total_final_frames} frames`);
        }
        
        if (data.video_info) {
          setVideoInfo(data.video_info);
          setVideoStatus(data.cached 
            ? `Using cached video: ${data.video_info.filename}`
            : `New video generated: ${data.video_info.filename}`
          );
        }
      } else {
        setStatus(`Smart pipeline failed: ${data.error}`);
      }

    } catch (err) {
      console.error("Error in smart pipeline:", err);
      setStatus(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const interpolateFrames = async () => {
    if (!route || !route._id) return;

    setLoading(true);
    setStatus("Applying optical flow interpolation...");

    try {
      const response = await fetch(
        `${backendUrl}/api/routes/${route._id}/interpolate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            interpolation_factor: interpolationFactor,
          })
        }
      );

      const data = await response.json();
      if (response.ok && data.route) {
        const updatedRoute = data.route;
        const stats = data.interpolation_stats;
        setRoute(updatedRoute);
        setStatus(`Optical flow interpolation complete! Generated ${stats.interpolated_count} new frames`);
      } else {
        setStatus(`Interpolation failed: ${data.error}`);
      }
    } catch (err) {
      setStatus(`Error interpolating frames: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const regenerateFrames = async () => {
    if (!route || !route._id) return;

    setLoading(true);
    setStatus("Regenerating frames with smoothed headings...");

    try {
      const regenerateResponse = await fetch(
        `${backendUrl}/api/routes/${route._id}/regenerate`,
        { method: "POST" }
      );

      const regenerateData = await regenerateResponse.json();
      if (regenerateResponse.ok && regenerateData.route) {
        const updatedRoute = regenerateData.route;
        setRoute(updatedRoute);
        
        const regeneratedCount = regenerateData.regenerated_count || 0;
        setStatus(`${regeneratedCount} frames regenerated with smoothed headings!`);
      } else {
        setStatus("Frame regeneration failed.");
      }
    } catch (err) {
      setStatus(`Error regenerating frames: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const generateVideo = async () => {
    if (!route || !route._id) return;

    setVideoLoading(true);
    setVideoStatus("Generating video from processed frames...");

    try {
      const response = await fetch(
        `${backendUrl}/api/routes/${route._id}/generate-video`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fps: videoSettings.fps,
            output_format: "mp4",
            quality: videoSettings.quality,
            include_interpolated: videoSettings.includeInterpolated,
          })
        }
      );

      const data = await response.json();
      if (response.ok && data.video_info) {
        setVideoInfo(data.video_info);
        setVideoStatus(`Video generated successfully! ${data.video_info.file_size_mb} MB`);
        
        setRoute(prevRoute => ({
          ...prevRoute,
          videoGenerated: true,
          videoFilename: data.video_info.filename,
          videoStats: data.video_info
        }));
      } else {
        setVideoStatus(`Video generation failed: ${data.error}`);
      }
    } catch (err) {
      setVideoStatus(`Error generating video: ${err.message}`);
    } finally {
      setVideoLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-10 left-10 w-20 h-20 bg-lime-400/10 rounded-full animate-bounce blur-sm"></div>
        <div className="absolute top-32 right-20 w-16 h-16 bg-lime-400/15 rounded-full animate-pulse"></div>
        <div className="absolute bottom-20 left-1/4 w-24 h-24 bg-lime-400/8 rounded-full animate-bounce blur-sm" style={{ animationDelay: '0.5s' }}></div>
        <div className="absolute bottom-32 right-10 w-12 h-12 bg-lime-400/20 rounded-full animate-pulse" style={{ animationDelay: '0.7s' }}></div>
        <div className="absolute top-20 right-1/4 w-8 h-8 border-2 border-lime-400/20 transform rotate-45 animate-spin opacity-30" style={{ animationDuration: '8s' }}></div>
        <div className="absolute bottom-1/3 left-1/4 w-6 h-6 bg-lime-400/15 transform rotate-12 animate-pulse"></div>
      </div>

      <header className="relative z-10 bg-gradient-to-r from-gray-900/90 to-gray-800/90 backdrop-blur-xl text-white p-6 shadow-2xl border-b border-gray-700">
        <div className="flex items-center gap-4 mb-2">
          <div className="p-3 bg-lime-400/20 rounded-full">
            <Navigation className="text-lime-400 text-2xl animate-pulse" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-lime-400">RouteVision Dashboard</h1>
            <p className="text-gray-300 mt-1">
              Generate → Smooth → Regenerate → Interpolate → Video generation with interactive map
            </p>
          </div>
        </div>
      </header>

      <main className="relative z-10 p-8 max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-gradient-to-r from-lime-400 to-lime-500 rounded-full flex items-center justify-center animate-bounce">
            <MapPin className="text-black text-lg" />
          </div>
          <h2 className="text-2xl font-semibold text-lime-400">
            Welcome, {user?.name || "User"}
          </h2>
        </div>
        
        <p className="mb-8 text-gray-300 text-lg">
          Create smooth street view sequences with LSTM smoothing, optical flow interpolation, video generation, and interactive route visualization.
        </p>

        <form className="bg-gray-800/70 backdrop-blur-xl p-8 rounded-2xl shadow-2xl mb-8 border border-gray-700">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-lime-400 mb-3">
                <MapPin className="w-4 h-4" />
                Start Location
              </label>
              <input
                type="text"
                ref={startRef}
                value={startLocation}
                onChange={(e) => setStartLocation(e.target.value)}
                placeholder="Enter start location"
                className="w-full p-3 bg-gray-700/70 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-lime-400 focus:border-transparent transition-all duration-300"
                disabled={loading}
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-lime-400 mb-3">
                <Navigation className="w-4 h-4" />
                End Location
              </label>
              <input
                type="text"
                ref={endRef}
                value={endLocation}
                onChange={(e) => setEndLocation(e.target.value)}
                placeholder="Enter destination"
                className="w-full p-3 bg-gray-700/70 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-lime-400 focus:border-transparent transition-all duration-300"
                disabled={loading}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-lime-400 mb-3">
                <Zap className="w-4 h-4" />
                Interpolation Factor
              </label>
              <select
                value={interpolationFactor}
                onChange={(e) => setInterpolationFactor(parseInt(e.target.value))}
                className="w-full p-3 bg-gray-700/70 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-lime-400 focus:border-transparent transition-all duration-300"
                disabled={loading}
              >
                <option value={1}>1 (2x frames)</option>
                <option value={2}>2 (3x frames)</option>
                <option value={3}>3 (4x frames)</option>
                <option value={4}>4 (5x frames)</option>
              </select>
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-lime-400 mb-3">
                <Clock className="w-4 h-4" />
                Video FPS
              </label>
              <select
                value={videoSettings.fps}
                onChange={(e) => setVideoSettings({...videoSettings, fps: parseInt(e.target.value)})}
                className="w-full p-3 bg-gray-700/70 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-lime-400 focus:border-transparent transition-all duration-300"
                disabled={loading || videoLoading}
              >
                <option value={1}>1 FPS</option>
                <option value={2}>2 FPS</option>
                <option value={5}>5 FPS</option>
                <option value={10}>10 FPS</option>
                <option value={15}>15 FPS</option>
                <option value={24}>24 FPS</option>
                <option value={30}>30 FPS</option>
                <option value={60}>60 FPS</option>
              </select>
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-lime-400 mb-3">
                <FileVideo className="w-4 h-4" />
                Video Quality
              </label>
              <div className="flex space-x-4">
                {["high", "medium", "low"].map((quality) => (
                  <label key={quality} className="flex items-center group cursor-pointer">
                    <input
                      type="radio"
                      name="quality"
                      value={quality}
                      checked={videoSettings.quality === quality}
                      onChange={(e) => setVideoSettings({...videoSettings, quality: e.target.value})}
                      className="mr-2 text-lime-400 focus:ring-lime-400"
                      disabled={loading || videoLoading}
                    />
                    <span className="capitalize text-gray-300 group-hover:text-lime-400 transition-colors duration-300">
                      {quality}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {cacheStatus && (
            <div className={`p-4 rounded-lg mb-6 border transition-all duration-300 ${
              cacheStatus.cached ? 'bg-green-900/30 border-green-500/30 text-green-300' : 
              cacheStatus.error ? 'bg-red-900/30 border-red-500/30 text-red-300' : 'bg-yellow-900/30 border-yellow-500/30 text-yellow-300'
            }`}>
              {cacheStatus.cached ? (
                <div>
                  <p className="font-medium mb-2 flex items-center gap-2">
                    <Zap className="w-4 h-4 animate-pulse" />
                    Cached Route Found!
                  </p>
                  <p className="text-sm opacity-90">
                    Route with {cacheStatus.route?.framesData?.length || 0} frames available.
                  </p>
                  <button
                    type="button"
                    onClick={handleUseCachedRoute}
                    className="mt-3 bg-green-600/70 hover:bg-green-600 text-white px-4 py-2 rounded-md text-sm transition-all duration-300 transform hover:scale-105"
                    disabled={loading || videoLoading}
                  >
                    Use Cached Route
                  </button>
                </div>
              ) : cacheStatus.error ? (
                <p className="font-medium flex items-center gap-2">
                  <span className="w-4 h-4 bg-red-500 rounded-full animate-pulse"></span>
                  Cache check failed: {cacheStatus.error}
                </p>
              ) : (
                <p className="font-medium flex items-center gap-2">
                  <span className="w-4 h-4 bg-yellow-500 rounded-full animate-spin"></span>
                  No cached route found for these parameters
                </p>
              )}
            </div>
          )}

          <div className="flex flex-wrap gap-4">
            <button
              type="button"
              onClick={handleSmartPipelineWithCache}
              disabled={loading || videoLoading}
              className="group bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-semibold px-6 py-3 rounded-lg transition-all duration-300 transform hover:scale-105 active:scale-95 hover:shadow-xl hover:shadow-purple-400/30 relative overflow-hidden"
            >
              <span className="relative z-10 flex items-center gap-2">
                <Zap className="w-4 h-4" />
                {loading ? "Processing..." : "Smart Pipeline (Auto-Cache)"}
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 transform skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
            </button>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading || videoLoading}
              className="group bg-gradient-to-r from-lime-500 to-lime-600 hover:from-lime-600 hover:to-lime-700 disabled:from-gray-600 disabled:to-gray-700 text-black font-semibold px-6 py-3 rounded-lg transition-all duration-300 transform hover:scale-105 active:scale-95 hover:shadow-xl hover:shadow-lime-400/30 relative overflow-hidden"
            >
              <span className="relative z-10 flex items-center gap-2">
                <Route className="w-4 h-4" />
                {loading ? "Processing..." : "Step-by-Step Process"}
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/25 to-white/0 transform skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
            </button>

            <button
              type="button"
              onClick={handleCompletePipeline}
              disabled={loading || videoLoading}
              className="group bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-semibold px-6 py-3 rounded-lg transition-all duration-300 transform hover:scale-105 active:scale-95 hover:shadow-xl hover:shadow-blue-400/30 relative overflow-hidden"
            >
              <span className="relative z-10 flex items-center gap-2">
                <Navigation className="w-4 h-4" />
                {loading ? "Processing..." : "Complete Pipeline"}
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 transform skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
            </button>

            <button
              type="button"
              onClick={handleCompletePipelineWithVideo}
              disabled={loading || videoLoading}
              className="group bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-semibold px-6 py-3 rounded-lg transition-all duration-300 transform hover:scale-105 active:scale-95 hover:shadow-xl hover:shadow-purple-400/30 relative overflow-hidden"
            >
              <span className="relative z-10 flex items-center gap-2">
                <Video className="w-4 h-4" />
                {loading ? "Processing..." : "Complete Pipeline + Video"}
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 transform skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
            </button>

            {route && (
              <>
                <button
                  type="button"
                  onClick={regenerateFrames}
                  disabled={loading || videoLoading}
                  className="group bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-semibold px-6 py-3 rounded-lg transition-all duration-300 transform hover:scale-105 active:scale-95 hover:shadow-xl hover:shadow-orange-400/30 relative overflow-hidden"
                >
                  <span className="relative z-10 flex items-center gap-2">
                    <Camera className="w-4 h-4" />
                    Regenerate Frames Only
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 transform skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                </button>

                <button
                  type="button"
                  onClick={interpolateFrames}
                  disabled={loading || videoLoading}
                  className="group bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-semibold px-6 py-3 rounded-lg transition-all duration-300 transform hover:scale-105 active:scale-95 hover:shadow-xl hover:shadow-indigo-400/30 relative overflow-hidden"
                >
                  <span className="relative z-10 flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    Apply Optical Flow
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 transform skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                </button>

                <button
                  type="button"
                  onClick={generateVideo}
                  disabled={loading || videoLoading || !route.framesData || route.framesData.length < 2}
                  className="group bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-semibold px-6 py-3 rounded-lg transition-all duration-300 transform hover:scale-105 active:scale-95 hover:shadow-xl hover:shadow-red-400/30 relative overflow-hidden"
                >
                  <span className="relative z-10 flex items-center gap-2">
                    <Play className="w-4 h-4" />
                    {videoLoading ? "Generating Video..." : "Generate Video"}
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 transform skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                </button>
              </>
            )}
          </div>
        </form>

        {mapImageUrl && (
          <div className="bg-gray-800/70 backdrop-blur-xl p-8 rounded-2xl shadow-2xl mb-8 border border-gray-700">
            <h3 className="text-2xl font-semibold text-lime-400 mb-6 flex items-center gap-3">
              <div className="p-2 bg-lime-400/20 rounded-full">
                <Map className="w-6 h-6" />
              </div>
              Route Overview
              {distance && (
                <span className="text-base font-normal text-gray-300 ml-auto flex items-center gap-2 bg-gray-700/50 px-4 py-2 rounded-lg">
                  <Route className="w-4 h-4 text-lime-400" />
                  Distance: <span className="text-lime-400 font-semibold">{formatDistance(distance)}</span>
                </span>
              )}
            </h3>
            <div className="relative rounded-xl overflow-hidden shadow-2xl border border-gray-600 group cursor-pointer"
                 onClick={() => {
                   const url = getGoogleMapsUrl();
                   if (url) window.open(url, '_blank');
                 }}>
              <img
                src={mapImageUrl}
                alt="Route map showing path from start to destination"
                className="w-full h-auto transition-all duration-300 group-hover:scale-105"
                style={{ maxHeight: '400px', objectFit: 'cover' }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                <div className="bg-lime-400 text-black px-6 py-3 rounded-full font-semibold flex items-center gap-2 transform scale-90 group-hover:scale-100 transition-transform duration-300 shadow-xl">
                  <ExternalLink className="w-5 h-5" />
                  Open in Google Maps
                </div>
              </div>
              
              <div className="absolute bottom-4 left-4 right-4 bg-black/80 backdrop-blur-md rounded-lg p-4 border border-gray-600/50">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between text-white">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse flex-shrink-0"></div>
                      <span className="text-sm font-medium truncate">Start: {startLocation}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-white">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse flex-shrink-0"></div>
                      <span className="text-sm font-medium truncate">End: {endLocation}</span>
                    </div>
                  </div>
                </div>
                {startCoords && endCoords && (
                  <div className="mt-3 pt-3 border-t border-gray-600/50 grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-gray-300">
                    <div>
                      <span className="text-green-400 font-medium">Start:</span> {startCoords.lat.toFixed(6)}, {startCoords.lng.toFixed(6)}
                    </div>
                    <div>
                      <span className="text-red-400 font-medium">End:</span> {endCoords.lat.toFixed(6)}, {endCoords.lng.toFixed(6)}
                    </div>
                  </div>
                )}
                {distance && (
                  <div className="mt-3 pt-3 border-t border-gray-600/50 flex items-center justify-center">
                    <div className="bg-lime-400/20 px-4 py-2 rounded-lg">
                      <span className="text-lime-400 font-semibold text-sm">
                        Straight-line Distance: {formatDistance(distance)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <p className="text-center text-gray-400 text-sm mt-4 flex items-center justify-center gap-2">
              <ExternalLink className="w-4 h-4" />
              Click on the map to view full route in Google Maps
            </p>
          </div>
        )}

        {status && (
          <div className={`p-4 rounded-lg mb-6 border transition-all duration-300 ${
            status.includes('Error') || status.includes('failed') ? 'bg-red-900/30 border-red-500/30 text-red-300' : 
            status.includes('successful') || status.includes('complete') || status.includes('cached') ? 'bg-green-900/30 border-green-500/30 text-green-300' : 
            'bg-blue-900/30 border-blue-500/30 text-blue-300'
          }`}>
            <p className="font-medium flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full animate-pulse ${
                status.includes('Error') || status.includes('failed') ? 'bg-red-400' : 
                status.includes('successful') || status.includes('complete') || status.includes('cached') ? 'bg-green-400' : 
                'bg-blue-400'
              }`}></div>
              {status}
            </p>
          </div>
        )}

        {videoStatus && (
          <div className={`p-4 rounded-lg mb-6 border transition-all duration-300 ${
            videoStatus.includes('Error') || videoStatus.includes('failed') ? 'bg-red-900/30 border-red-500/30 text-red-300' : 
            videoStatus.includes('successful') ? 'bg-green-900/30 border-green-500/30 text-green-300' : 
            'bg-blue-900/30 border-blue-500/30 text-blue-300'
          }`}>
            <p className="font-medium flex items-center gap-2">
              <Video className="w-4 h-4 animate-pulse" />
              {videoStatus}
            </p>
          </div>
        )}

        {videoInfo && (
          <div className="bg-gray-800/70 backdrop-blur-xl p-8 rounded-2xl shadow-2xl mb-8 border border-gray-700">
            <h3 className="text-2xl font-semibold text-lime-400 mb-6 flex items-center gap-3">
              <div className="p-2 bg-lime-400/20 rounded-full">
                <Video className="w-6 h-6" />
              </div>
              Generated Street View Video
            </h3>
            <div className="flex flex-col lg:flex-row gap-8">
              <div className="flex-1">
                <div className="relative rounded-xl overflow-hidden shadow-2xl border border-gray-600 group">
                  <video
                    controls
                    className="w-full transition-all duration-300 group-hover:scale-105"
                    style={{ maxHeight: '500px' }}
                  >
                    <source src={videoInfo.video_url} type="video/mp4" />
                    Your browser does not support the video tag.
                  </video>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                </div>
              </div>
              <div className="lg:w-80">
                <div className="bg-gray-700/50 p-6 rounded-xl text-white border border-gray-600">
                  <h4 className="font-medium mb-4 text-lime-400 flex items-center gap-2">
                    <FileVideo className="w-4 h-4" />
                    Video Details
                  </h4>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-300">Source:</span>
                      <span className="capitalize text-lime-400">{videoInfo.source_type}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Duration:</span>
                      <span className="text-white">{videoInfo.duration_seconds?.toFixed(1)}s</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">FPS:</span>
                      <span className="text-white">{videoInfo.fps}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Resolution:</span>
                      <span className="text-white">{videoInfo.resolution}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Size:</span>
                      <span className="text-white">{videoInfo.file_size_mb} MB</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Frames:</span>
                      <span className="text-white">{videoInfo.total_frames}</span>
                    </div>
                  </div>
                  <div className="mt-6">
                    <a
                      href={videoInfo.video_url}
                      download={videoInfo.filename}
                      className="group inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-4 py-2 rounded-lg text-sm transition-all duration-300 transform hover:scale-105 hover:shadow-lg"
                    >
                      <Download className="w-4 h-4 group-hover:animate-bounce" />
                      Download Video
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {route && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <div className="bg-gray-800/70 backdrop-blur-xl p-6 rounded-2xl shadow-2xl border border-gray-700">
              <h3 className="text-xl font-semibold text-lime-400 mb-6 flex items-center gap-3">
                <div className="p-2 bg-lime-400/20 rounded-full">
                  <Route className="w-5 h-5" />
                </div>
                Route Information
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Route ID:</span>
                  <span className="text-xs font-mono text-white bg-gray-700/50 px-2 py-1 rounded">{route._id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Start:</span>
                  <span className="text-white text-right max-w-48 truncate" title={route.start}>{route.start}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">End:</span>
                  <span className="text-white text-right max-w-48 truncate" title={route.end}>{route.end}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Total Frames:</span>
                  <span className="text-lime-400 font-semibold">{route.framesData?.length || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Interpolated:</span>
                  <span className={`font-semibold ${route.interpolated ? 'text-green-400' : 'text-gray-500'}`}>
                    {route.interpolated ? 'Yes' : 'No'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Video Generated:</span>
                  <span className={`font-semibold ${route.videoGenerated ? 'text-green-400' : 'text-gray-500'}`}>
                    {route.videoGenerated ? 'Yes' : 'No'}
                  </span>
                </div>
                {route.interpolationFactor && (
                  <div className="flex justify-between">
                    <span className="text-gray-300">Interpolation Factor:</span>
                    <span className="text-white">{route.interpolationFactor}</span>
                  </div>
                )}
              </div>
            </div>

            {analytics && (
              <div className="bg-gray-800/70 backdrop-blur-xl p-6 rounded-2xl shadow-2xl border border-gray-700">
                <h3 className="text-xl font-semibold text-lime-400 mb-6 flex items-center gap-3">
                  <div className="p-2 bg-lime-400/20 rounded-full">
                    <Navigation className="w-5 h-5" />
                  </div>
                  Analytics
                </h3>
                <div className="grid grid-cols-2 gap-6 text-sm">
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-300">Original Frames:</span>
                      <span className="text-blue-400 font-semibold">{analytics.original_frames}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Interpolated:</span>
                      <span className="text-purple-400 font-semibold">{analytics.interpolated_frames}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Smoothed:</span>
                      <span className="text-green-400 font-semibold">{analytics.smoothed_frames}</span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-300">Processed:</span>
                      <span className={`font-semibold ${route.processed ? 'text-green-400' : 'text-gray-500'}`}>
                        {route.processed ? 'Yes' : 'No'}
                      </span>
                    </div>
                    {analytics.heading_stats && (
                      <div className="flex justify-between">
                        <span className="text-gray-300">Avg Heading:</span>
                        <span className="text-white">{analytics.heading_stats.mean_heading?.toFixed(1)}°</span>
                      </div>
                    )}
                  </div>
                </div>

                {analytics.smoothed_heading_stats && (
                  <div className="mt-6 pt-4 border-t border-gray-600">
                    <h4 className="font-medium text-gray-300 mb-3 flex items-center gap-2">
                      <Zap className="w-4 h-4 text-lime-400" />
                      Smoothing Effect
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-300">Smoothing Impact:</span>
                        <span className="text-orange-400 font-semibold">{analytics.smoothed_heading_stats.smoothing_effect?.toFixed(2)}°</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-300">Smoothed Avg:</span>
                        <span className="text-lime-400 font-semibold">{analytics.smoothed_heading_stats.mean_smoothed_heading?.toFixed(1)}°</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {route && (
          <div className="bg-gradient-to-r from-gray-800/70 to-gray-700/70 backdrop-blur-xl p-8 rounded-2xl shadow-2xl mb-8 border border-gray-600">
            <h3 className="text-2xl font-semibold text-lime-400 mb-8 flex items-center gap-3">
              <div className="p-2 bg-lime-400/20 rounded-full">
                <Navigation className="w-6 h-6" />
              </div>
              Processing Statistics
            </h3>
            
            {route.processingStats ? (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
                  <div className="bg-gray-700/50 p-4 rounded-xl border border-gray-600 transform hover:scale-105 transition-all duration-300">
                    <div className="text-3xl font-bold text-blue-400 mb-2">{route.processingStats.original_frames}</div>
                    <div className="text-sm text-gray-300">Original Frames</div>
                  </div>
                  <div className="bg-gray-700/50 p-4 rounded-xl border border-gray-600 transform hover:scale-105 transition-all duration-300">
                    <div className="text-3xl font-bold text-green-400 mb-2">{route.processingStats.regenerated_frames}</div>
                    <div className="text-sm text-gray-300">Regenerated</div>
                  </div>
                  <div className="bg-gray-700/50 p-4 rounded-xl border border-gray-600 transform hover:scale-105 transition-all duration-300">
                    <div className="text-3xl font-bold text-purple-400 mb-2">{route.processingStats.interpolated_frames}</div>
                    <div className="text-sm text-gray-300">Interpolated</div>
                  </div>
                  <div className="bg-gray-700/50 p-4 rounded-xl border border-gray-600 transform hover:scale-105 transition-all duration-300">
                    <div className="text-3xl font-bold text-orange-400 mb-2">{route.processingStats.total_final_frames}</div>
                    <div className="text-sm text-gray-300">Total Final</div>
                  </div>
                </div>
                
                {route.processingStats.average_consistency && (
                  <div className="mt-8 text-center">
                    <div className="text-xl font-medium text-gray-300 mb-4">
                      Motion Consistency: <span className="text-lime-400 font-bold">{(route.processingStats.average_consistency * 100).toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-4 relative overflow-hidden shadow-inner">
                      <div 
                        className="bg-gradient-to-r from-lime-400 to-lime-500 h-4 rounded-full transition-all duration-1000 ease-out shadow-lg"
                        style={{width: `${route.processingStats.average_consistency * 100}%`}}
                      ></div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <div className="relative">
                  <div className="w-16 h-16 border-4 border-lime-400/30 border-t-lime-400 rounded-full animate-spin"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Navigation className="w-6 h-6 text-lime-400 animate-pulse" />
                  </div>
                </div>
                <p className="text-gray-400 animate-pulse">Loading processing statistics...</p>
              </div>
            )}
          </div>
        )}
      </main>

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
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
}