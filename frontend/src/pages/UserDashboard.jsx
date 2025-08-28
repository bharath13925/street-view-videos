
import { useState, useEffect, useRef } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";

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

  useEffect(() => {
    // Fetch logged-in Firebase user
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        const uid = firebaseUser.uid;
        fetch(`http://localhost:5000/api/users/${uid}`)
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
        setStartLocation(place.name || place.formatted_address || startRef.current.value);
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
        setEndLocation(place.name || place.formatted_address || endRef.current.value);
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
  }, []);

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
          video_url: `http://localhost:8000/videos/${route.pythonRouteId}/${route.videoFilename}`,
          ...route.videoStats
        });
      }
    }
  }, [route]);

  const fetchAnalytics = async (routeId) => {
    try {
      const response = await fetch(`http://localhost:5000/api/routes/${routeId}/analytics`);
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
      const response = await fetch("http://localhost:5000/api/routes/check-existing", {
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
      // Step 1: Generate initial route
      const genResponse = await fetch(
        "http://localhost:5000/api/routes/generate",
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
      console.log("Route generated:", generatedRoute);
      setStatus("Route generated successfully! Smoothing headings...");

      // Step 2: Smooth the route headings
      const smoothResponse = await fetch(
        `http://localhost:5000/api/routes/${generatedRoute._id}/smooth`,
        { method: "POST" }
      );

      const smoothData = await smoothResponse.json();
      if (smoothResponse.ok && smoothData.route) {
        const smoothedRoute = smoothData.route;
        setRoute(smoothedRoute);
        console.log("Route smoothed successfully:", smoothedRoute);
        
        const smoothedHeadings = smoothedRoute.framesData?.map(f => f.smoothedHeading) || [];
        console.log("Smoothed headings:", smoothedHeadings);
        
        if (smoothedHeadings.every(h => h === null || h === undefined)) {
          console.warn("Warning: All smoothed headings are null/undefined");
          setStatus("Route smoothed, but no headings were processed.");
        } else {
          setStatus("Headings smoothed! Regenerating frames with corrected headings...");
          
          // Step 3: Regenerate frames with smoothed headings
          const regenerateResponse = await fetch(
            `http://localhost:5000/api/routes/${smoothedRoute._id}/regenerate`,
            { method: "POST" }
          );

          const regenerateData = await regenerateResponse.json();
          if (regenerateResponse.ok && regenerateData.route) {
            const finalRoute = regenerateData.route;
            setRoute(finalRoute);
            
            const regeneratedCount = regenerateData.regenerated_count || 0;
            console.log(`Successfully regenerated ${regeneratedCount} frames`);
            setStatus(`Route processed successfully! ${regeneratedCount} frames regenerated. Ready for interpolation.`);
          } else {
            console.error("Unexpected regenerate response:", regenerateData);
            setStatus("Route smoothed, but frame regeneration failed.");
          }
        }
      } else {
        console.error("Unexpected smooth response:", smoothData);
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
    setStatus("Starting complete pipeline (Generate → Smooth → Regenerate → Interpolate)...");

    try {
      const response = await fetch(
        "http://localhost:5000/api/routes/process-complete",
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
        console.log("Complete pipeline successful:", data);
        setStatus(`Complete pipeline successful! Generated ${stats.total_final_frames} total frames (${stats.original_frames} original + ${stats.interpolated_frames} interpolated)`);
      } else {
        console.error("Pipeline failed:", data);
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
        "http://localhost:5000/api/routes/process-complete-with-video",
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
          setStatus(`Complete pipeline with video successful! Generated ${stats.total_final_frames} frames and video (${data.video_info.file_size_mb} MB)`);
        } else {
          setStatus(`Complete pipeline successful! Generated ${stats.total_final_frames} frames (video generation failed)`);
        }
      } else {
        console.error("Pipeline failed:", data);
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
    
    if (!user) {
      console.error("User not logged in");
      return;
    }

    if (!startLocation || !endLocation) {
      console.error("Both start and end locations are required");
      return;
    }

    setLoading(true);
    setStatus("Checking cache and starting smart pipeline...");

    try {
      const response = await fetch(
        "http://localhost:5000/api/routes/process-complete-with-video-cached",
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
            ? `Using cached video: ${data.video_info.filename} (${data.video_info.file_size_mb} MB)`
            : `New video generated: ${data.video_info.filename} (${data.video_info.file_size_mb} MB)`
          );
        }
      } else {
        console.error("Smart pipeline failed:", data);
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
    if (!route || !route._id) {
      console.error("No route available for interpolation");
      return;
    }

    setLoading(true);
    setStatus("Applying optical flow interpolation...");

    try {
      const response = await fetch(
        `http://localhost:5000/api/routes/${route._id}/interpolate`,
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
        
        console.log("Interpolation successful:", data);
        setStatus(`Optical flow interpolation complete! Generated ${stats.interpolated_count} new frames (${stats.total_count} total, consistency: ${(stats.average_consistency * 100).toFixed(1)}%)`);
      } else {
        console.error("Interpolation failed:", data);
        setStatus(`Interpolation failed: ${data.error}`);
      }
    } catch (err) {
      console.error("Error interpolating frames:", err);
      setStatus(`Error interpolating frames: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const regenerateFrames = async () => {
    if (!route || !route._id) {
      console.error("No route available for regeneration");
      return;
    }

    setLoading(true);
    setStatus("Regenerating frames with smoothed headings...");

    try {
      const regenerateResponse = await fetch(
        `http://localhost:5000/api/routes/${route._id}/regenerate`,
        { method: "POST" }
      );

      const regenerateData = await regenerateResponse.json();
      if (regenerateResponse.ok && regenerateData.route) {
        const updatedRoute = regenerateData.route;
        setRoute(updatedRoute);
        
        const regeneratedCount = regenerateData.regenerated_count || 0;
        console.log(`Successfully regenerated ${regeneratedCount} frames`);
        setStatus(`${regeneratedCount} frames regenerated with smoothed headings!`);
      } else {
        console.error("Unexpected regenerate response:", regenerateData);
        setStatus("Frame regeneration failed.");
      }
    } catch (err) {
      console.error("Error regenerating frames:", err);
      setStatus(`Error regenerating frames: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const generateVideo = async () => {
    if (!route || !route._id) {
      console.error("No route available for video generation");
      return;
    }

    setVideoLoading(true);
    setVideoStatus("Generating video from processed frames...");

    try {
      const response = await fetch(
        `http://localhost:5000/api/routes/${route._id}/generate-video`,
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
        setVideoStatus(`Video generated successfully! ${data.video_info.file_size_mb} MB, ${data.video_info.duration_seconds?.toFixed(1)}s duration`);
        
        // Update route state with video info
        setRoute(prevRoute => ({
          ...prevRoute,
          videoGenerated: true,
          videoFilename: data.video_info.filename,
          videoStats: data.video_info
        }));
      } else {
        console.error("Video generation failed:", data);
        setVideoStatus(`Video generation failed: ${data.error}`);
      }
    } catch (err) {
      console.error("Error generating video:", err);
      setVideoStatus(`Error generating video: ${err.message}`);
    } finally {
      setVideoLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-gray-800">
      <header className="bg-lime-600 text-white p-6 shadow-md">
        <h1 className="text-2xl font-bold">Street View Route Processor with Smart Caching</h1>
        <p className="text-lime-100 mt-1">Generate → Smooth → Regenerate → Interpolate → Video (with caching)</p>
      </header>

      <main className="p-8 max-w-7xl mx-auto">
        <h2 className="text-xl font-semibold text-lime-700 mb-4">
          Welcome, {user?.name || "User"}
        </h2>
        <p className="mb-6 text-gray-600">
          Create smooth street view sequences with LSTM smoothing, optical flow interpolation, and video generation.
        </p>

        <form className="bg-gray-50 p-6 rounded-lg shadow-md mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Location
              </label>
              <input
                type="text"
                ref={startRef}
                value={startLocation}
                onChange={(e) => setStartLocation(e.target.value)}
                placeholder="Enter start location"
                className="w-full p-2 border border-gray-300 rounded-md"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Location
              </label>
              <input
                type="text"
                ref={endRef}
                value={endLocation}
                onChange={(e) => setEndLocation(e.target.value)}
                placeholder="Enter destination"
                className="w-full p-2 border border-gray-300 rounded-md"
                disabled={loading}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Interpolation Factor (frames between each pair)
              </label>
              <select
                value={interpolationFactor}
                onChange={(e) => setInterpolationFactor(parseInt(e.target.value))}
                className="w-full p-2 border border-gray-300 rounded-md"
                disabled={loading}
              >
                <option value={1}>1 (2x frames)</option>
                <option value={2}>2 (3x frames)</option>
                <option value={3}>3 (4x frames)</option>
                <option value={4}>4 (5x frames)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Video FPS
              </label>
              <select
                value={videoSettings.fps}
                onChange={(e) => setVideoSettings({...videoSettings, fps: parseInt(e.target.value)})}
                className="w-full p-2 border border-gray-300 rounded-md"
                disabled={loading || videoLoading}
              >
                <option value={2}>2 FPS</option>
                <option value={5}>5 FPS</option>
                <option value={10}>10 FPS</option>
                <option value={15}>15 FPS</option>
                <option value={24}>24 FPS</option>
                <option value={30}>30 FPS</option>
                <option value={60}>60 FPS</option>
              </select>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Video Quality
            </label>
            <div className="flex space-x-4">
              {["high", "medium", "low"].map((quality) => (
                <label key={quality} className="flex items-center">
                  <input
                    type="radio"
                    name="quality"
                    value={quality}
                    checked={videoSettings.quality === quality}
                    onChange={(e) => setVideoSettings({...videoSettings, quality: e.target.value})}
                    className="mr-2"
                    disabled={loading || videoLoading}
                  />
                  <span className="capitalize">{quality}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Cache Status Display */}
          {cacheStatus && (
            <div className={`p-4 rounded-lg mb-4 ${
              cacheStatus.cached ? 'bg-green-100 text-green-700' : 
              cacheStatus.error ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
            }`}>
              {cacheStatus.cached ? (
                <div>
                  <p className="font-medium mb-2">✅ Cached Route Found!</p>
                  <p className="text-sm">
                    Route with {cacheStatus.route?.framesData?.length || 0} frames and 
                    {cacheStatus.video_info ? ` video (${cacheStatus.video_info.file_size_mb} MB)` : ' no video'} available.
                  </p>
                  <button
                    type="button"
                    onClick={handleUseCachedRoute}
                    className="mt-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm"
                    disabled={loading || videoLoading}
                  >
                    Use Cached Route
                  </button>
                </div>
              ) : cacheStatus.error ? (
                <p className="font-medium">❌ Cache check failed: {cacheStatus.error}</p>
              ) : (
                <p className="font-medium">🔍 No cached route found for these parameters</p>
              )}
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleSmartPipelineWithCache}
              disabled={loading || videoLoading}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:bg-gray-400 text-white font-semibold px-4 py-2 rounded-md"
            >
              {loading ? "Processing..." : "🚀 Smart Pipeline (Auto-Cache)"}
            </button>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading || videoLoading}
              className="bg-lime-600 hover:bg-lime-700 disabled:bg-gray-400 text-white font-semibold px-4 py-2 rounded-md"
            >
              {loading ? "Processing..." : "Step-by-Step Process"}
            </button>

            <button
              type="button"
              onClick={handleCompletePipeline}
              disabled={loading || videoLoading}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold px-4 py-2 rounded-md"
            >
              {loading ? "Processing..." : "Complete Pipeline"}
            </button>

            <button
              type="button"
              onClick={handleCompletePipelineWithVideo}
              disabled={loading || videoLoading}
              className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white font-semibold px-4 py-2 rounded-md"
            >
              {loading ? "Processing..." : "Complete Pipeline + Video"}
            </button>

            {route && (
              <>
                <button
                  type="button"
                  onClick={regenerateFrames}
                  disabled={loading || videoLoading}
                  className="bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white font-semibold px-4 py-2 rounded-md"
                >
                  Regenerate Frames Only
                </button>

                <button
                  type="button"
                  onClick={interpolateFrames}
                  disabled={loading || videoLoading}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white font-semibold px-4 py-2 rounded-md"
                >
                  Apply Optical Flow
                </button>

                <button
                  type="button"
                  onClick={generateVideo}
                  disabled={loading || videoLoading || !route.framesData || route.framesData.length < 2}
                  className="bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-semibold px-4 py-2 rounded-md"
                >
                  {videoLoading ? "Generating Video..." : "Generate Video"}
                </button>
              </>
            )}
          </div>
        </form>

        {/* Status Display */}
        {status && (
          <div className={`p-4 rounded-lg mb-6 ${
            status.includes('Error') || status.includes('failed') ? 'bg-red-100 text-red-700' : 
            status.includes('successful') || status.includes('complete') || status.includes('cached') ? 'bg-green-100 text-green-700' : 
            'bg-blue-100 text-blue-700'
          }`}>
            <p className="font-medium">{status}</p>
          </div>
        )}

        {/* Video Status Display */}
        {videoStatus && (
          <div className={`p-4 rounded-lg mb-6 ${
            videoStatus.includes('Error') || videoStatus.includes('failed') ? 'bg-red-100 text-red-700' : 
            videoStatus.includes('successful') ? 'bg-green-100 text-green-700' : 
            'bg-blue-100 text-blue-700'
          }`}>
            <p className="font-medium">{videoStatus}</p>
          </div>
        )}

        {/* Video Player */}
        {videoInfo && (
          <div className="bg-gray-900 p-6 rounded-lg shadow-md mb-6">
            <h3 className="text-lg font-semibold text-white mb-4">Generated Video</h3>
            <div className="flex flex-col lg:flex-row gap-6">
              <div className="flex-1">
                <video
                  controls
                  className="w-full rounded-lg shadow-lg"
                  style={{ maxHeight: '400px' }}
                  poster=""
                >
                  <source src={videoInfo.video_url} type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
              </div>
              <div className="lg:w-80">
                <div className="bg-gray-800 p-4 rounded-lg text-white">
                  <h4 className="font-medium mb-3">Video Details</h4>
                  <div className="space-y-2 text-sm">
                    <p><strong>Source:</strong> <span className="capitalize">{videoInfo.source_type}</span></p>
                    <p><strong>Duration:</strong> {videoInfo.duration_seconds?.toFixed(1)}s</p>
                    <p><strong>FPS:</strong> {videoInfo.fps}</p>
                    <p><strong>Resolution:</strong> {videoInfo.resolution}</p>
                    <p><strong>Size:</strong> {videoInfo.file_size_mb} MB</p>
                    <p><strong>Frames:</strong> {videoInfo.total_frames}</p>
                  </div>
                  <div className="mt-4">
                    <a
                      href={videoInfo.video_url}
                      download={videoInfo.filename}
                      className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm"
                    >
                      Download Video
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Route Information */}
        {route && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Basic Route Info */}
            <div className="bg-gray-50 p-6 rounded-lg shadow-md">
              <h3 className="text-lg font-semibold text-lime-700 mb-4">Route Information</h3>
              <div className="space-y-2">
                <p><strong>Route ID:</strong> <span className="text-sm font-mono">{route._id}</span></p>
                <p><strong>Python Route ID:</strong> <span className="text-sm font-mono">{route.pythonRouteId}</span></p>
                <p><strong>Start:</strong> {route.start}</p>
                <p><strong>End:</strong> {route.end}</p>
                <p><strong>Total Frames:</strong> {route.framesData?.length || 0}</p>
                <p><strong>Interpolated:</strong> {route.interpolated ? 'Yes' : 'No'}</p>
                <p><strong>Video Generated:</strong> {route.videoGenerated ? 'Yes' : 'No'}</p>
                {route.interpolationFactor && (
                  <p><strong>Interpolation Factor:</strong> {route.interpolationFactor}</p>
                )}
              </div>
            </div>

            {/* Analytics */}
            {analytics && (
              <div className="bg-gray-50 p-6 rounded-lg shadow-md">
                <h3 className="text-lg font-semibold text-lime-700 mb-4">Analytics</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p><strong>Original Frames:</strong> {analytics.original_frames}</p>
                    <p><strong>Interpolated:</strong> {analytics.interpolated_frames}</p>
                    <p><strong>Smoothed:</strong> {analytics.smoothed_frames}</p>
                  </div>
                  <div>
                    <p><strong>Has VO Data:</strong> {analytics.has_vo_data ? 'Yes' : 'No'}</p>
                    <p><strong>Processed:</strong> {route.processed ? 'Yes' : 'No'}</p>
                    {analytics.heading_stats && (
                      <p><strong>Avg Heading:</strong> {analytics.heading_stats.mean_heading?.toFixed(1)}°</p>
                    )}
                  </div>
                </div>

                {analytics.smoothed_heading_stats && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <h4 className="font-medium text-gray-700 mb-2">Smoothing Effect</h4>
                    <p className="text-sm"><strong>Smoothing Impact:</strong> {analytics.smoothed_heading_stats.smoothing_effect?.toFixed(2)}°</p>
                    <p className="text-sm"><strong>Smoothed Avg:</strong> {analytics.smoothed_heading_stats.mean_smoothed_heading?.toFixed(1)}°</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Processing Statistics */}
        {route && route.processingStats && (
          <div className="mt-6 bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold text-blue-700 mb-4">Processing Statistics</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-blue-600">{route.processingStats.original_frames}</div>
                <div className="text-sm text-gray-600">Original Frames</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">{route.processingStats.regenerated_frames}</div>
                <div className="text-sm text-gray-600">Regenerated</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-600">{route.processingStats.interpolated_frames}</div>
                <div className="text-sm text-gray-600">Interpolated</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-orange-600">{route.processingStats.total_final_frames}</div>
                <div className="text-sm text-gray-600">Total Final</div>
              </div>
            </div>
            {route.processingStats.average_consistency && (
              <div className="mt-4 text-center">
                <div className="text-lg font-medium text-gray-700">
                  Motion Consistency: <span className="text-blue-600">{(route.processingStats.average_consistency * 100).toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full" 
                    style={{width: `${route.processingStats.average_consistency * 100}%`}}
                  ></div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}