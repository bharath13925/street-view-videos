from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List,Any,Dict,Union,Optional
import requests, polyline, os, math, re, cv2
import numpy as np
from pathlib import Path
import glob
import json
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()  # Add this before getting the environment variable

# ------------------------
# Config
# ------------------------
GOOGLE_MAPS_API_KEY = os.getenv("PYTHON_API_KEY")

FRAMES_DIR = Path("frames")
FRAMES_DIR.mkdir(exist_ok=True)

# ------------------------
# Import smoothers and optical flow
# ------------------------
from smooth.lstm_smoother import smooth_headings
from optical_flow_interpolation import OpticalFlowInterpolator, create_interpolated_frames_data

# ------------------------
# FastAPI setup
# ------------------------
app = FastAPI(title="Street View + Heading Smoother + Optical Flow Service with Caching")


origins = [
    "https://street-view-videos.vercel.app", 
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ------------------------
# New Request Models for Caching
# ------------------------
class ExistingRouteRequest(BaseModel):
    start: str
    end: str
    interpolation_factor: int = 2
    video_fps: int = 30
    video_quality: str = "high"

class VideoCheckRequest(BaseModel):
    route_id: str
    filename: str

# ------------------------
# Original Request Models
# ------------------------
class RouteRequest(BaseModel):
    start: str
    end: str

class CompleteProcessRequest(BaseModel):
    start: str
    end: str
    interpolation_factor: int = 2

class Frame(BaseModel):
    lat: float
    lon: float
    heading: float
    smoothedHeading: float | None = None
    filename: str | None = None
    interpolated: bool = False

class SmoothReq(BaseModel):
    route_id: str
    frames: List[Frame]

class RegenerateReq(BaseModel):
    route_id: str
    frames: List[Frame]

class InterpolateReq(BaseModel):
    route_id: str
    frames: List[Frame]
    interpolation_factor: int = 2

class VideoGenerateReq(BaseModel):
    route_id: str
    fps: int = 30
    output_format: str = "mp4"  # mp4, avi, mov
    quality: str = "high"  # high, medium, low
    include_interpolated: bool = True

# ------------------------
# Numpy Conversion Utility
# ------------------------
def convert_numpy_types(obj: Any) -> Any:
    """Recursively convert numpy types to native Python types for JSON serialization"""
    if isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, np.floating):
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    elif isinstance(obj, dict):
        return {key: convert_numpy_types(value) for key, value in obj.items()}
    elif isinstance(obj, list):
        return [convert_numpy_types(item) for item in obj]
    elif isinstance(obj, tuple):
        return tuple(convert_numpy_types(item) for item in obj)
    else:
        return obj
    
# ------------------------
# Helper Functions
# ------------------------
def haversine(lat1, lon1, lat2, lon2):
    R = 6371000
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi/2)**2 + math.cos(phi1)*math.cos(phi2)*math.sin(dlambda/2)**2
    return 2 * R * math.asin(math.sqrt(a))

def calculate_heading(lat1, lon1, lat2, lon2):
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dlambda = math.radians(lon2 - lon1)
    x = math.sin(dlambda) * math.cos(phi2)
    y = math.cos(phi1)*math.sin(phi2) - math.sin(phi1)*math.cos(phi2)*math.cos(dlambda)
    heading = math.degrees(math.atan2(x, y))
    return (heading + 360) % 360

def interpolate_points(latlons, step_m=7):
    points = []
    for i in range(len(latlons)-1):
        lat1, lon1 = latlons[i]
        lat2, lon2 = latlons[i+1]
        dist = haversine(lat1, lon1, lat2, lon2)
        n_steps = max(int(dist // step_m), 1)
        lats = np.linspace(lat1, lat2, n_steps, endpoint=False)
        lons = np.linspace(lon1, lon2, n_steps, endpoint=False)
        points.extend(zip(lats, lons))
    points.append(latlons[-1])
    return points

def safe_name(name: str) -> str:
    return re.sub(r"[^A-Za-z0-9_\-]", "_", name)[:50]

def find_route_directory(route_id: str) -> Optional[Path]:
    """Find route directory with fuzzy matching"""
    route_dir = FRAMES_DIR / route_id
    if route_dir.exists():
        return route_dir
    
    # Try fuzzy matching
    all_dirs = [d for d in FRAMES_DIR.iterdir() if d.is_dir()]
    route_parts = route_id.lower().replace("_", " ").split()
    best_match = None
    best_score = 0
    
    for dir_path in all_dirs:
        dir_name_lower = dir_path.name.lower().replace("_", " ")
        score = sum(1 for part in route_parts if part in dir_name_lower)
        if score > best_score and score >= len(route_parts) * 0.7:
            best_score = score
            best_match = dir_path
    
    return best_match

def get_route_metadata(route_dir: Path) -> Dict:
    """Get metadata about an existing route"""
    metadata = {
        "route_id": route_dir.name,
        "original_frames": [],
        "smoothed_frames": [],
        "interpolated_frames": [],
        "videos": [],
        "has_complete_pipeline": False
    }
    
    # Check for original frames
    original_frames = sorted(route_dir.glob("frame_*.jpg"))
    metadata["original_frames"] = [str(f) for f in original_frames]
    
    # Check for smoothed frames
    smoothed_dir = route_dir / "smoothed"
    if smoothed_dir.exists():
        smoothed_frames = sorted(smoothed_dir.glob("smoothed_*.jpg"))
        metadata["smoothed_frames"] = [str(f) for f in smoothed_frames]
        
        # Check for interpolated frames
        interp_dir = smoothed_dir / "interpolated"
        if interp_dir.exists():
            interp_frames = sorted(interp_dir.glob("interpolated_*.jpg"))
            metadata["interpolated_frames"] = [str(f) for f in interp_frames]
    
    # Check for videos
    videos_dir = route_dir / "videos"
    if videos_dir.exists():
        video_files = list(videos_dir.glob("*.mp4")) + list(videos_dir.glob("*.avi"))
        metadata["videos"] = [{"filename": f.name, "path": str(f), "size_mb": f.stat().st_size / (1024 * 1024)} for f in video_files]
    
    # Determine if complete pipeline was run
    metadata["has_complete_pipeline"] = (
        len(metadata["original_frames"]) > 0 and
        len(metadata["smoothed_frames"]) > 0 and
        len(metadata["interpolated_frames"]) > 0
    )
    
    return metadata

def load_existing_frames_data(route_dir: Path) -> List[Dict]:
    """Load existing frames data from directory structure"""
    frames_data = []
    
    # Check for interpolated frames first (most complete)
    interp_dir = route_dir / "smoothed" / "interpolated"
    if interp_dir.exists():
        interp_frames = sorted(interp_dir.glob("interpolated_*.jpg"))
        if interp_frames:
            # Load interpolated frames
            for i, frame_path in enumerate(interp_frames):
                frames_data.append({
                    "lat": 0.0,  # Would need to be stored separately
                    "lon": 0.0,
                    "heading": 0.0,
                    "smoothedHeading": 0.0,
                    "filename": str(frame_path),
                    "interpolated": "interpolated" in frame_path.name
                })
            return frames_data
    
    # Fall back to smoothed frames
    smoothed_dir = route_dir / "smoothed"
    if smoothed_dir.exists():
        smoothed_frames = sorted(smoothed_dir.glob("smoothed_*.jpg"))
        if smoothed_frames:
            for i, frame_path in enumerate(smoothed_frames):
                frames_data.append({
                    "lat": 0.0,
                    "lon": 0.0,
                    "heading": 0.0,
                    "smoothedHeading": 0.0,
                    "filename": str(frame_path),
                    "interpolated": False
                })
            return frames_data
    
    # Fall back to original frames
    original_frames = sorted(route_dir.glob("frame_*.jpg"))
    if original_frames:
        for i, frame_path in enumerate(original_frames):
            frames_data.append({
                "lat": 0.0,
                "lon": 0.0,
                "heading": 0.0,
                "smoothedHeading": None,
                "filename": str(frame_path),
                "interpolated": False
            })
    
    return frames_data

def load_existing_frames(route_id: str):
    route_dir = FRAMES_DIR / route_id
    if not route_dir.exists():
        return None
    frames = sorted(route_dir.glob("frame_*.jpg"))
    return [{"filename": str(f)} for f in frames] if frames else None

def fetch_street_view_image(lat, lon, heading, filename):
    """Fetch a single Street View image"""
    streetview_url = (
        "https://maps.googleapis.com/maps/api/streetview"
        f"?size=640x640&location={lat},{lon}&heading={heading}&pitch=0&key={GOOGLE_MAPS_API_KEY}"
    )
    
    try:
        r = requests.get(streetview_url, timeout=30)
        if r.status_code == 200 and r.content:
            with open(filename, "wb") as f:
                f.write(r.content)
            print(f"✅ Fetched new image: {filename} (heading: {heading:.2f})")
            return True
        else:
            print(f"❌ Failed to fetch Street View at {lat},{lon} with heading {heading}")
            return False
    except Exception as e:
        print(f"❌ Error fetching Street View: {e}")
        return False

# Video generation helper function
def generate_video_from_frames(frame_paths, output_path, fps=30, quality="high"):
    """Generate video from a list of frame paths (Windows-safe with fallback codecs)"""
    if not frame_paths:
        raise ValueError("No frame paths provided")
    
    # Read first frame to get dimensions
    first_frame = cv2.imread(frame_paths[0])
    if first_frame is None:
        raise ValueError(f"Could not read first frame: {frame_paths[0]}")
    
    height, width, _ = first_frame.shape
    
    # Set codec based on quality
    if quality == "high":
        codec_list = ['mp4v', 'XVID', 'MJPG']
    elif quality == "medium":
        codec_list = ['XVID', 'MJPG']
    else:
        codec_list = ['MJPG']
    
    out = None
    for c in codec_list:
        codec = cv2.VideoWriter_fourcc(*c)
        out = cv2.VideoWriter(str(output_path), codec, fps, (width, height))
        if out.isOpened():
            print(f"✅ VideoWriter opened successfully with codec: {c}")
            break
        else:
            print(f"⚠️ Codec {c} failed, trying next...")
            out.release()
    
    if out is None or not out.isOpened():
        # Try changing extension to .avi
        output_path = output_path.with_suffix(".avi")
        codec = cv2.VideoWriter_fourcc(*'XVID')
        out = cv2.VideoWriter(str(output_path), codec, fps, (width, height))
        if not out.isOpened():
            raise RuntimeError(f"Failed to open video writer for {output_path}")
        print(f"✅ Fallback codec used, writing AVI: {output_path}")
    
    print(f"🎬 Creating video with {len(frame_paths)} frames at {fps} FPS")
    print(f"📺 Resolution: {width}x{height}")
    
    successful_frames = 0
    for i, frame_path in enumerate(frame_paths):
        frame = cv2.imread(frame_path)
        if frame is not None:
            if frame.shape[:2] != (height, width):
                frame = cv2.resize(frame, (width, height))
            out.write(frame)
            successful_frames += 1
        else:
            print(f"⚠️ Could not read frame: {frame_path}")
    
    out.release()
    
    if successful_frames == 0:
        raise RuntimeError("No frames could be processed")
    
    print(f"✅ Video created successfully: {output_path}")
    return {
        "video_path": str(output_path),
        "total_frames": len(frame_paths),
        "successful_frames": successful_frames,
        "fps": fps,
        "duration_seconds": successful_frames / fps,
        "resolution": f"{width}x{height}"
    }

# ------------------------
# Visual Odometry (VO)
# ------------------------
def compute_vo_headings(frames):
    vo_headings = []
    orb = cv2.ORB_create(nfeatures=1000)
    bf = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=True)

    print(f"🔍 Starting VO computation for {len(frames)} frames")

    for i in range(len(frames) - 1):
        file1 = frames[i]['filename']
        file2 = frames[i + 1]['filename']

        # Ensure both files exist
        if not os.path.exists(file1) or not os.path.exists(file2):
            print(f"⚠️ Missing file(s): {file1} or {file2}")
            vo_headings.append(None)
            continue

        img1 = cv2.imread(file1, cv2.IMREAD_GRAYSCALE)
        img2 = cv2.imread(file2, cv2.IMREAD_GRAYSCALE)

        if img1 is None or img2 is None:
            print(f"⚠️ Could not read image(s): {file1} or {file2}")
            vo_headings.append(None)
            continue

        kp1, des1 = orb.detectAndCompute(img1, None)
        kp2, des2 = orb.detectAndCompute(img2, None)

        if des1 is None or des2 is None:
            print(f"⚠️ No descriptors for frame pair {i} and {i + 1}")
            vo_headings.append(None)
            continue

        matches = bf.match(des1, des2)
        matches = sorted(matches, key=lambda x: x.distance)

        if len(matches) < 4:
            print(f"⚠️ Not enough matches ({len(matches)}) between frame {i} and {i + 1}")
            vo_headings.append(None)
            continue

        pts1 = np.float32([kp1[m.queryIdx].pt for m in matches])
        pts2 = np.float32([kp2[m.trainIdx].pt for m in matches])

        M, mask = cv2.estimateAffinePartial2D(pts1, pts2)

        if M is not None:
            angle = math.degrees(math.atan2(M[1, 0], M[0, 0]))
            vo_headings.append(angle)
            print(f"✅ VO heading [{i}] → [{i + 1}]: {angle:.2f}°")
        else:
            print(f"⚠️ Transformation matrix estimation failed for pair {i}")
            vo_headings.append(None)

    print(f"🧭 VO computation complete: {len(vo_headings)} headings computed.")
    return vo_headings

# ------------------------
# NEW CACHING ENDPOINTS
# ------------------------
@app.post("/check_existing_route")
def check_existing_route(request: ExistingRouteRequest):
    """Check if a route already exists with complete processing and video"""
    try:
        route_id = f"{safe_name(request.start)}_{safe_name(request.end)}"
        print(f"🔍 Checking for existing route: {route_id}")
        
        route_dir = find_route_directory(route_id)
        if not route_dir:
            return {
                "exists": False,
                "route_id": route_id,
                "message": "Route directory not found"
            }
        
        print(f"✅ Found route directory: {route_dir}")
        metadata = get_route_metadata(route_dir)
        
        # Check if we have a complete pipeline
        if not metadata["has_complete_pipeline"]:
            return {
                "exists": True,
                "route_id": route_dir.name,
                "complete_pipeline": False,
                "video_available": False,
                "message": "Route exists but pipeline incomplete"
            }
        
        # Check for suitable video
        suitable_video = None
        for video in metadata["videos"]:
            video_name_lower = video["filename"].lower()
            # Check if video matches requirements (fps, quality, etc.)
            if (f"{request.video_fps}fps" in video_name_lower or 
                request.video_quality in video_name_lower or
                "interpolated" in video_name_lower):
                suitable_video = video
                break
        
        if not suitable_video and metadata["videos"]:
            # Use any available video
            suitable_video = metadata["videos"][0]
        
        if not suitable_video:
            return {
                "exists": True,
                "route_id": route_dir.name,
                "complete_pipeline": True,
                "video_available": False,
                "message": "Route complete but no video found"
            }
        
        # Load frames data
        frames_data = load_existing_frames_data(route_dir)
        
        # Generate processing stats
        processing_stats = {
            "original_frames": len(metadata["original_frames"]),
            "smoothed_frames": len(metadata["smoothed_frames"]),
            "interpolated_frames": len([f for f in frames_data if f.get("interpolated", False)]),
            "total_final_frames": len(frames_data),
            "interpolation_factor": request.interpolation_factor
        }
        
        # Generate video stats
        video_path = Path(suitable_video["path"])
        video_stats = {
            "source_type": "interpolated" if "interpolated" in suitable_video["filename"] else "smoothed",
            "file_size_mb": suitable_video["size_mb"],
            "fps": request.video_fps,  # Assume requested FPS
            "quality": request.video_quality,
            "duration_seconds": len(frames_data) / request.video_fps if frames_data else 0,
            "resolution": "640x640",  # Default Street View resolution
            "total_frames": len(frames_data)
        }
        
        print(f"🎬 Found suitable video: {suitable_video['filename']}")
        print(f"📊 Processing stats: {processing_stats}")
        
        return convert_numpy_types({
            "exists": True,
            "route_id": route_dir.name,
            "complete_pipeline": True,
            "video_available": True,
            "video_filename": suitable_video["filename"],
            "video_path": suitable_video["path"],
            "frames": frames_data,
            "processing_stats": processing_stats,
            "video_stats": video_stats,
            "cached_at": datetime.now().isoformat()
        })
        
    except Exception as e:
        print(f"❌ Error checking existing route: {e}")
        import traceback
        traceback.print_exc()
        return {
            "exists": False,
            "error": str(e),
            "message": "Error checking existing route"
        }

@app.get("/check_video/{route_id}/{filename}")
def check_video_exists(route_id: str, filename: str):
    """Check if a specific video file exists"""
    try:
        route_dir = find_route_directory(route_id)
        if not route_dir:
            return {"exists": False, "message": "Route directory not found"}
        
        video_path = route_dir / "videos" / filename
        exists = video_path.exists()
        
        result = {"exists": exists}
        if exists:
            result.update({
                "path": str(video_path),
                "size_mb": video_path.stat().st_size / (1024 * 1024),
                "modified": datetime.fromtimestamp(video_path.stat().st_mtime).isoformat()
            })
        
        return result
        
    except Exception as e:
        print(f"❌ Error checking video: {e}")
        return {"exists": False, "error": str(e)}

# ------------------------
# ORIGINAL API ENDPOINTS (with caching awareness)
# ------------------------
@app.post("/generate_frames")
def generate_frames(route: RouteRequest):
    route_id = f"{safe_name(route.start)}_{safe_name(route.end)}"

    # Check for existing frames first
    existing_frames = load_existing_frames(route_id)
    if existing_frames:
        vo_headings = compute_vo_headings(existing_frames)
        print(f"🗂️ Using cached frames for route: {route_id}")
        return {"route_id": route_id, "frames": existing_frames, "vo_headings": vo_headings, "cached": True}

    print(f"🚀 Generating new frames for route: {route_id}")

    # Fetch route
    directions_url = (
        "https://maps.googleapis.com/maps/api/directions/json"
        f"?origin={route.start}&destination={route.end}&key={GOOGLE_MAPS_API_KEY}"
    )
    resp = requests.get(directions_url).json()
    if resp.get("status") != "OK":
        return {"error": resp.get("status"), "message": resp.get("error_message", "")}

    steps = resp["routes"][0]["overview_polyline"]["points"]
    latlons = polyline.decode(steps)
    points = interpolate_points(latlons, step_m=7)

    route_dir = FRAMES_DIR / route_id
    route_dir.mkdir(parents=True, exist_ok=True)

    frames = []
    for idx in range(len(points)-1):
        lat, lon = points[idx]
        lat_next, lon_next = points[idx+1]
        heading = calculate_heading(lat, lon, lat_next, lon_next)
        filename = f"frame_{idx+1}.jpg"
        filepath = route_dir / filename

        if fetch_street_view_image(lat, lon, heading, filepath):
            frames.append({
                "lat": lat,
                "lon": lon,
                "heading": heading,
                "smoothedHeading": None,
                "filename": str(filepath),
                "interpolated": False
            })

     # Compute VO headings after all frames are downloaded
    vo_headings = []
    if len(frames) > 1:
        try:
            vo_headings = compute_vo_headings(frames)
            print(f"✅ Computed {len(vo_headings)} VO headings")
        except Exception as e:
            print(f"⚠️ VO heading computation failed: {e}")
            vo_headings = [None] * (len(frames) - 1)  # Fill with None values
    

    return {"route_id": route_id, "frames": frames, "vo_headings": vo_headings, "cached": False}

@app.post("/smooth")
def smooth(req: SmoothReq):
    if not req.frames or len(req.frames) == 0:
        return {"route_id": req.route_id, "frames": [], "smoothed": False}

    raw = [f.heading for f in req.frames if f.heading is not None]
    if len(raw) == 0:
        return {"route_id": req.route_id, "frames": [], "smoothed": False}

    sm = smooth_headings(raw)
    print("Smoothed headings:", sm)
    
    for i, f in enumerate(req.frames):
        f.smoothedHeading = float(sm[i])
        
    return {"route_id": req.route_id, "frames": req.frames, "smoothed": True}

@app.post("/regenerate_frames")
def regenerate_frames(req: RegenerateReq):
    """Regenerate Street View frames using smoothed headings"""
    if not req.frames or len(req.frames) == 0:
        return {"error": "No frames provided", "frames": []}

    # Check if smoothed headings exist
    frames_with_smoothed = [f for f in req.frames if f.smoothedHeading is not None]
    if not frames_with_smoothed:
        return {"error": "No smoothed headings found", "frames": req.frames}

    route_dir = FRAMES_DIR / req.route_id / "smoothed"
    route_dir.mkdir(parents=True, exist_ok=True)

    regenerated_count = 0
    updated_frames = []

    for idx, frame in enumerate(req.frames):
        if frame.smoothedHeading is not None:
            # Create new filename for smoothed frame
            new_filename = f"smoothed_frame_{idx+1}.jpg"
            new_filepath = route_dir / new_filename

            # Fetch new image with smoothed heading
            success = fetch_street_view_image(
                frame.lat, 
                frame.lon, 
                frame.smoothedHeading, 
                new_filepath
            )

            if success:
                # Update frame with new filename
                frame.filename = str(new_filepath)
                regenerated_count += 1
                print(f"🔄 Regenerated frame {idx+1}: original heading {frame.heading:.2f}° → smoothed {frame.smoothedHeading:.2f}°")
            else:
                print(f"⚠️ Failed to regenerate frame {idx+1}, keeping original")
        
        updated_frames.append(frame)

    print(f"✅ Successfully regenerated {regenerated_count}/{len(req.frames)} frames")

    return {
        "route_id": req.route_id, 
        "frames": updated_frames, 
        "regenerated_count": regenerated_count,
        "success": True
    }

@app.post("/interpolate_frames")
def interpolate_frames(req: InterpolateReq):
    """Generate interpolated frames using optical flow from smoothed frames"""
    if not req.frames or len(req.frames) < 2:
        return {"error": "Need at least 2 frames for interpolation", "frames": req.frames}

    print(f"🔍 Starting interpolation for route: {req.route_id}")
    print(f"📊 Input frames count: {len(req.frames)}")
    
    # Debug: Check what we received
    frames_with_files = [f for f in req.frames if f.filename]
    print(f"📁 Frames with filename field: {len(frames_with_files)}")
    
    # Build valid frames list with improved path resolution
    valid_frames = []
    route_base_dir = FRAMES_DIR / req.route_id
    
    # If the exact route directory doesn't exist, try to find it with fuzzy matching
    if not route_base_dir.exists():
        print(f"⚠️ Exact route directory not found: {route_base_dir}")
        print("🔍 Searching for similar directory names...")
        
        # Get all directories in FRAMES_DIR
        all_dirs = [d for d in FRAMES_DIR.iterdir() if d.is_dir()]
        
        # Try to find matching directory using fuzzy matching
        route_parts = req.route_id.lower().replace("_", " ").split()
        best_match = None
        best_score = 0
        
        for dir_path in all_dirs:
            dir_name_lower = dir_path.name.lower().replace("_", " ")
            
            # Count how many route parts are in this directory name
            score = sum(1 for part in route_parts if part in dir_name_lower)
            
            if score > best_score and score >= len(route_parts) * 0.7:  # At least 70% match
                best_score = score
                best_match = dir_path
        
        if best_match:
            print(f"✅ Found matching directory: {best_match}")
            route_base_dir = best_match
        else:
            # List available directories for debugging
            available_dirs = [d.name for d in all_dirs]
            print(f"❌ No matching directory found. Available directories: {available_dirs[:5]}...")
            
            return {
                "error": "Route directory not found",
                "details": {
                    "requested_route_id": req.route_id,
                    "frames_base_dir": str(FRAMES_DIR),
                    "available_directories": available_dirs[:10],  # Show first 10
                    "suggestion": "Check if the pythonRouteId in your database matches the actual folder name"
                },
                "frames": req.frames
            }
    
    # Now process frames with the correct base directory
    for i, f in enumerate(req.frames):
        if not f.filename:
            print(f"⚠️  Frame {i+1}: No filename field")
            continue
            
        frame_path = Path(f.filename)
        
        # Convert Windows paths to cross-platform paths
        if "\\" in str(frame_path):
            # Convert Windows path to Path object
            parts = str(frame_path).split("\\")
            frame_path = Path(*parts)
        
        # If the frame path doesn't exist, try alternative locations
        if not frame_path.exists():
            # Get just the filename
            filename_only = frame_path.name
            
            # Try multiple locations in order of preference
            search_paths = [
                route_base_dir / filename_only,  # Direct in route dir
                route_base_dir / "smoothed" / filename_only,  # In smoothed subdir
                route_base_dir / "smoothed" / f"smoothed_{filename_only}",  # With smoothed prefix
            ]
            
            # Also try with common smoothed frame naming patterns
            if not filename_only.startswith("smoothed_"):
                search_paths.extend([
                    route_base_dir / "smoothed" / f"smoothed_frame_{i+1}.jpg",
                    route_base_dir / f"smoothed_frame_{i+1}.jpg",
                ])
            
            found_path = None
            for search_path in search_paths:
                if search_path.exists():
                    found_path = search_path
                    print(f"🔄 Frame {i+1}: Found at {found_path}")
                    break
            
            if found_path:
                # Update frame with correct path
                f.filename = str(found_path)
                valid_frames.append(f)
            else:
                print(f"❌ Frame {i+1}: File not found. Searched:")
                for path in search_paths[:3]:  # Show first 3 search paths
                    print(f"   - {path}")
        else:
            print(f"✅ Frame {i+1}: Found at {frame_path}")
            valid_frames.append(f)
    
    print(f"✅ Valid frames for interpolation: {len(valid_frames)}")
    
    if len(valid_frames) < 2:
        # Provide detailed debugging information
        smoothed_dir = route_base_dir / "smoothed"
        error_details = {
            "total_frames_requested": len(req.frames),
            "frames_with_filenames": len(frames_with_files),
            "valid_frames_found": len(valid_frames),
            "route_base_directory": str(route_base_dir),
            "route_dir_exists": route_base_dir.exists(),
            "smoothed_dir_exists": smoothed_dir.exists() if route_base_dir.exists() else False,
        }
        
        # List actual files in the directories
        if route_base_dir.exists():
            original_files = list(route_base_dir.glob("*.jpg"))
            error_details["original_jpg_files"] = len(original_files)
            error_details["sample_original_files"] = [f.name for f in original_files[:3]]
            
            if smoothed_dir.exists():
                smoothed_files = list(smoothed_dir.glob("*.jpg"))
                error_details["smoothed_jpg_files"] = len(smoothed_files)
                error_details["sample_smoothed_files"] = [f.name for f in smoothed_files[:3]]
        
        return {
            "error": "Need at least 2 valid frame files for interpolation",
            "details": error_details,
            "suggestion": "Run regenerate_frames first to create smoothed frame files, or check that file paths in database match actual files",
            "frames": req.frames
        }

    # Create interpolation directory
    interpolation_dir = route_base_dir / "smoothed" / "interpolated"
    interpolation_dir.mkdir(parents=True, exist_ok=True)

    # Initialize optical flow interpolator
    interpolator = OpticalFlowInterpolator(interpolation_factor=req.interpolation_factor)

    try:
        # Extract frame paths from valid frames
        frame_paths = [f.filename for f in valid_frames]
        
        print(f"🎬 Starting optical flow interpolation with factor {req.interpolation_factor}")
        print(f"📁 Processing {len(frame_paths)} valid frames")
        
        # Process frame sequence with optical flow interpolation
        interpolated_paths = interpolator.process_frame_sequence(frame_paths, interpolation_dir)
        
        # Create combined frames data including interpolated frames
        combined_frames_data = create_interpolated_frames_data(
            [f.dict() for f in valid_frames],
            interpolated_paths,
            req.interpolation_factor
        )
        
        # Convert back to Frame objects
        updated_frames = [Frame(**frame_data) for frame_data in combined_frames_data]
        
        # Calculate motion consistency scores
        consistency_scores = interpolator.estimate_motion_consistency(interpolated_paths)
        avg_consistency = sum(consistency_scores) / len(consistency_scores) if consistency_scores else 0.0
        
        interpolated_count = len(updated_frames) - len(valid_frames)
        
        print(f"✅ Generated {interpolated_count} interpolated frames")
        print(f"📊 Average motion consistency: {avg_consistency:.3f}")
        
        return {
            "route_id": req.route_id,
            "frames": updated_frames,
            "interpolated_count": interpolated_count,
            "original_count": len(valid_frames),
            "total_count": len(updated_frames),
            "average_consistency": avg_consistency,
            "consistency_scores": consistency_scores,
            "resolved_route_directory": str(route_base_dir),  # For debugging
            "success": True
        }
        
    except Exception as e:
        print(f"❌ Error during optical flow interpolation: {e}")
        import traceback
        traceback.print_exc()
        return {
            "error": f"Optical flow interpolation failed: {str(e)}",
            "frames": req.frames,
            "success": False
        }

@app.post("/process_complete_pipeline")
def process_complete_pipeline(request: CompleteProcessRequest):
    """Complete pipeline: Generate → Smooth → Regenerate → Interpolate"""
    
    try:
        print("🚀 Starting complete processing pipeline")
        
        # Step 1: Generate initial frames
        print("1️⃣ Generating initial frames...")
        route_request = RouteRequest(start=request.start, end=request.end)
        gen_result = generate_frames(route_request)
        if "error" in gen_result:
            return {"error": gen_result["error"], "details": "Failed at generation step"}
        
        # Convert dict frames to Frame objects for validation
        try:
            frame_objects = [Frame(**frame_dict) for frame_dict in gen_result["frames"]]
        except Exception as e:
            return {"error": f"Invalid frame data: {str(e)}", "details": "Frame validation failed"}
        
        # Step 2: Smooth headings
        print("2️⃣ Smoothing headings...")
        smooth_req = SmoothReq(route_id=gen_result["route_id"], frames=frame_objects)
        smooth_result = smooth(smooth_req)
        if not smooth_result.get("smoothed", False):
            return {"error": "Smoothing failed", "details": smooth_result}
        
        # Step 3: Regenerate frames with smoothed headings
        print("3️⃣ Regenerating frames with smoothed headings...")
        regen_req = RegenerateReq(route_id=gen_result["route_id"], frames=smooth_result["frames"])
        regen_result = regenerate_frames(regen_req)
        if not regen_result.get("success", False):
            return {"error": "Frame regeneration failed", "details": regen_result}
        
        # Step 4: Apply optical flow interpolation
        print("4️⃣ Applying optical flow interpolation...")
        interp_req = InterpolateReq(
            route_id=gen_result["route_id"], 
            frames=regen_result["frames"],
            interpolation_factor=request.interpolation_factor
        )
        interp_result = interpolate_frames(interp_req)
        if not interp_result.get("success", False):
            return {"error": "Optical flow interpolation failed", "details": interp_result.get("error", "Unknown error")}
        
        print("✅ Complete pipeline finished successfully!")
        
        # Prepare response data with safe defaults
        response_data = {
            "route_id": gen_result["route_id"],
            "pipeline_success": True,
            "steps_completed": 4,
            "final_frames": [frame.dict() for frame in interp_result["frames"]],
            "statistics": {
                "original_frames": len(gen_result.get("frames", [])),
                "regenerated_frames": regen_result.get("regenerated_count", 0),
                "interpolated_frames": interp_result.get("interpolated_count", 0),
                "total_final_frames": interp_result.get("total_count", len(interp_result.get("frames", []))),
                "average_consistency": interp_result.get("average_consistency", 0.0)
            }
        }
        
        # Convert all numpy types to native Python types for JSON serialization
        return convert_numpy_types(response_data)
        
    except Exception as e:
        print(f"❌ Pipeline error: {e}")
        import traceback
        traceback.print_exc()
        return {
            "error": f"Pipeline processing failed: {str(e)}",
            "pipeline_success": False,
            "details": str(e)
        }
    
@app.post("/generate_video")
def generate_video(req: VideoGenerateReq):
    """Generate video from processed frames (smoothed + interpolated)"""
    try:
        print(f"🎬 Starting video generation for route: {req.route_id}")
        
        # Find route directory
        route_base_dir = FRAMES_DIR / req.route_id
        if not route_base_dir.exists():
            all_dirs = [d for d in FRAMES_DIR.iterdir() if d.is_dir()]
            route_parts = req.route_id.lower().replace("_", " ").split()
            best_match = None
            best_score = 0
            for dir_path in all_dirs:
                dir_name_lower = dir_path.name.lower().replace("_", " ")
                score = sum(1 for part in route_parts if part in dir_name_lower)
                if score > best_score and score >= len(route_parts) * 0.7:
                    best_score = score
                    best_match = dir_path
            if best_match:
                route_base_dir = best_match
            else:
                available_dirs = [d.name for d in all_dirs]
                return {"error": "Route directory not found", "details": {"requested_route_id": req.route_id, "available_directories": available_dirs[:10]}}
        
        # Look for frames
        frame_dirs_to_check = [
            route_base_dir / "smoothed" / "interpolated",
            route_base_dir / "smoothed",
            route_base_dir,
        ]
        frame_paths = []
        source_type = "unknown"
        for frame_dir in frame_dirs_to_check:
            if frame_dir.exists():
                patterns = ["interpolated_*.jpg", "interp_*.jpg", "smoothed_*.jpg", "frame_*.jpg"]
                for pattern in patterns:
                    found_frames = sorted(frame_dir.glob(pattern),
                                          key=lambda x: int(''.join(filter(str.isdigit, x.stem)) or 0))
                    if found_frames:
                        frame_paths = [str(f) for f in found_frames]
                        source_type = "interpolated" if "interpolated" in str(frame_dir) else "smoothed" if "smoothed" in str(frame_dir) else "original"
                        break
                if frame_paths:
                    break
        if not frame_paths:
            return {"error": "No frames found for video generation", "details": {"route_directory": str(route_base_dir), "checked_directories": [str(d) for d in frame_dirs_to_check], "suggestion": "Run the complete pipeline first"}}
        
        # Create videos folder
        videos_dir = route_base_dir / "videos"
        videos_dir.mkdir(exist_ok=True)
        
        # Shorten filename to avoid Windows path issues
        video_filename = f"{safe_name(req.route_id)[:30]}_{source_type}_{req.fps}fps.mp4"
        video_path = videos_dir / video_filename
        
        # Generate video
        video_stats = generate_video_from_frames(frame_paths, video_path, fps=req.fps, quality=req.quality)
        file_size_mb = video_path.stat().st_size / (1024 * 1024)
        
        return convert_numpy_types({
            "route_id": req.route_id,
            "video_path": str(video_path),
            "video_filename": video_filename,
            "source_type": source_type,
            "file_size_mb": round(file_size_mb, 2),
            "video_stats": video_stats,
            "success": True
        })
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"error": f"Video generation failed: {str(e)}", "route_id": req.route_id, "success": False}

# Add this endpoint to serve video files
@app.get("/videos/{route_id}/{filename}")
def serve_video(route_id: str, filename: str):
    """Serve video files (Windows-safe with fuzzy matching)"""
    try:
        route_base_dir = find_route_directory(route_id)
        if not route_base_dir:
            return {
                "error": "Route directory not found",
                "route_id": route_id,
                "suggestion": "Check if route exists or run pipeline first"
            }

        video_path = route_base_dir / "videos" / filename

        # Check if file exists
        if not video_path.exists():
            return {
                "error": "Video file not found",
                "path": str(video_path),
                "suggestion": "Run the pipeline and video generation first, or check filename"
            }

        # Serve video file
        return FileResponse(
            path=str(video_path),
            media_type='video/mp4',
            filename=filename
        )

    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"error": f"Error serving video: {str(e)}"}
