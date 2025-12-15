from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Any, Dict, Union, Optional
import requests, polyline, os, math, re, cv2
import numpy as np
from pathlib import Path
import glob
import json
from datetime import datetime
from dotenv import load_dotenv
from PIL import Image, ImageDraw, ImageFont

load_dotenv()

# ------------------------
# Config
# ------------------------
GOOGLE_MAPS_API_KEY = os.getenv("PYTHON_API_KEY")

FRAMES_DIR = Path("frames")
FRAMES_DIR.mkdir(exist_ok=True)

# Alert configuration - INCREASED distances for earlier warnings
TURN_ALERT_DISTANCE = 120  # meters (was 50m)
LANDMARK_ALERT_DISTANCE = 200  # meters (was 100m)
LANDMARK_SEARCH_RADIUS = 250  # meters

# VIDEO SPEED CONFIGURATION
NORMAL_SPEED_MULTIPLIER = 1.0
ALERT_SPEED_MULTIPLIER = 0.3
ALERT_SLOWDOWN_FRAMES = 5

# TURN DETECTION THRESHOLD
HEADING_CHANGE_THRESHOLD = 20  # degrees
TURN_DETECTION_WINDOW = 3  # frames

# Landmark categories
IMPORTANT_LANDMARK_TYPES = [
    'school', 'university', 'college',
    'bus_station', 'transit_station', 'train_station', 'subway_station',
    'shopping_mall', 'department_store',
    'hospital', 'police', 'fire_station',
    'airport', 'park', 'stadium', 'museum',
    'restaurant', 'cafe', 'bank', 'atm',
    'gas_station', 'parking'
]

# ------------------------
# Import smoothers and optical flow
# ------------------------
from smooth.lstm_smoother import smooth_headings
from optical_flow_interpolation import OpticalFlowInterpolator, create_interpolated_frames_data

# ------------------------
# FastAPI setup
# ------------------------
app = FastAPI(title="Street View Navigation - Fixed Alerts & Caching")

origins = ["https://street-view-videos.vercel.app", "http://localhost:3000", "http://localhost:5173"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ------------------------
# Request Models
# ------------------------
class RouteRequest(BaseModel):
    start: str
    end: str
    enable_alerts: bool = True

class CompleteProcessRequest(BaseModel):
    start: str
    end: str
    interpolation_factor: int = 2
    enable_alerts: bool = True

class Frame(BaseModel):
    lat: float
    lon: float
    heading: float
    smoothedHeading: float | None = None
    filename: str | None = None
    interpolated: bool = False
    alert: str | None = None
    alertType: str | None = None
    alertDistance: float | None = None
    alertIcon: str | None = None
    category: str | None = None

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
    output_format: str = "mp4"
    quality: str = "high"
    include_interpolated: bool = True

class CacheCheckRequest(BaseModel):
    start: str
    end: str
    interpolation_factor: int = 2
    video_fps: int = 30
    video_quality: str = "high"

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

def normalize_angle_difference(angle1, angle2):
    """Calculate the shortest angular difference between two headings"""
    diff = angle2 - angle1
    while diff > 180:
        diff -= 360
    while diff < -180:
        diff += 360
    return abs(diff)

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
    route_dir = FRAMES_DIR / route_id
    if route_dir.exists():
        return route_dir
    
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

def convert_numpy_types(obj: Any) -> Any:
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

def fetch_street_view_image(lat, lon, heading, filename):
    streetview_url = (
        "https://maps.googleapis.com/maps/api/streetview"
        f"?size=640x640&location={lat},{lon}&heading={heading}&pitch=0&key={GOOGLE_MAPS_API_KEY}"
    )
    
    try:
        r = requests.get(streetview_url, timeout=30)
        if r.status_code == 200 and r.content:
            with open(filename, "wb") as f:
                f.write(r.content)
            return True
        else:
            return False
    except Exception as e:
        print(f"❌ Error fetching Street View: {e}")
        return False

# ------------------------
# ✅ NEW: Helper to find closest point index
# ------------------------
def find_closest_point_index(lat, lon, points_with_headings):
    """Maps a lat/lon to the nearest frame index in the route"""
    min_dist = float('inf')
    best_idx = 0

    for i, p in enumerate(points_with_headings):
        d = haversine(lat, lon, p['lat'], p['lon'])
        if d < min_dist:
            min_dist = d
            best_idx = i

    return best_idx

# ------------------------
# VISUAL OVERLAY FUNCTIONS
# ------------------------
def draw_turn_arrow(image_path: str, turn_direction: str, distance: int) -> bool:
    """Draw turn arrow at TOP of image - ASCII TEXT ONLY"""
    try:
        img = Image.open(image_path)
        draw = ImageDraw.Draw(img)
        width, height = img.size
        
        try:
            font_large = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 50)
            font_small = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 28)
        except:
            try:
                font_large = ImageFont.truetype("arial.ttf", 50)
                font_small = ImageFont.truetype("arial.ttf", 28)
            except:
                font_large = ImageFont.load_default()
                font_small = ImageFont.load_default()
        
        box_height = 110
        overlay = Image.new('RGBA', img.size, (0, 0, 0, 0))
        overlay_draw = ImageDraw.Draw(overlay)
        overlay_draw.rectangle([(0, 0), (width, box_height)], fill=(0, 0, 0, 200))
        img = Image.alpha_composite(img.convert('RGBA'), overlay).convert('RGB')
        draw = ImageDraw.Draw(img)
        
        # ✅ ASCII arrows only (no emoji)
        arrow_map = {
            'turn-left': '<--',
            'turn-right': '-->',
            'turn-slight-left': '/<-',
            'turn-slight-right': '->\\',
            'turn-sharp-left': '<<--',
            'turn-sharp-right': '-->>',
            'uturn-left': '<U',
            'uturn-right': 'U>',
            'straight': '^^^',
            'merge': '==>',
            'roundabout-left': '(@)',
            'roundabout-right': '(@)',
            'detected-left': '<--',
            'detected-right': '-->'
        }
        
        arrow = arrow_map.get(turn_direction, '-->')
        draw.text((20, 15), arrow, fill=(255, 215, 0), font=font_large)
        
        turn_text = turn_direction.replace('-', ' ').replace('_', ' ').upper()
        draw.text((120, 20), turn_text, fill=(255, 255, 255), font=font_small)
        draw.text((120, 60), f"IN {distance}M", fill=(255, 215, 0), font=font_small)
        
        img.save(image_path)
        print(f"✅ Drew turn arrow: {turn_text} at {distance}m on {image_path}")
        return True
        
    except Exception as e:
        print(f"❌ Error drawing turn arrow: {e}")
        import traceback
        traceback.print_exc()
        return False

def draw_landmark_pin(image_path: str, landmark_name: str, distance: int, category: str) -> bool:
    """Draw landmark info at BOTTOM of image - TEXT ONLY (no emoji)"""
    try:
        img = Image.open(image_path)
        draw = ImageDraw.Draw(img)
        width, height = img.size
        
        try:
            font_large = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 36)
            font_small = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 24)
        except:
            try:
                font_large = ImageFont.truetype("arial.ttf", 36)
                font_small = ImageFont.truetype("arial.ttf", 24)
            except:
                font_large = ImageFont.load_default()
                font_small = ImageFont.load_default()
        
        box_height = 100
        box_y = height - box_height
        overlay = Image.new('RGBA', img.size, (0, 0, 0, 0))
        overlay_draw = ImageDraw.Draw(overlay)
        overlay_draw.rectangle([(0, box_y), (width, height)], fill=(0, 0, 0, 200))
        img = Image.alpha_composite(img.convert('RGBA'), overlay).convert('RGB')
        draw = ImageDraw.Draw(img)
        
        # ✅ TEXT-ONLY categories (no emoji in overlay)
        category_text_map = {
            'SCHOOL': 'SCHOOL',
            'UNIVERSITY': 'UNIVERSITY',
            'COLLEGE': 'COLLEGE',
            'BUS_STATION': 'BUS STATION',
            'TRANSIT_STATION': 'TRANSIT',
            'TRAIN_STATION': 'TRAIN',
            'SUBWAY_STATION': 'METRO',
            'SHOPPING_MALL': 'MALL',
            'DEPARTMENT_STORE': 'SHOPPING',
            'HOSPITAL': 'HOSPITAL',
            'POLICE': 'POLICE',
            'FIRE_STATION': 'FIRE DEPT',
            'AIRPORT': 'AIRPORT',
            'PARK': 'PARK',
            'STADIUM': 'STADIUM',
            'MUSEUM': 'MUSEUM',
            'RESTAURANT': 'RESTAURANT',
            'CAFE': 'CAFE',
            'BANK': 'BANK',
            'ATM': 'ATM',
            'GAS_STATION': 'GAS',
            'PARKING': 'PARKING'
        }
        
        # Extract text-only label from category
        category_label = category_text_map.get(category.upper().replace(' ', '_'), category)
        draw.text((20, box_y + 10), category_label, fill=(100, 200, 255), font=font_large)
        
        max_chars = 30
        display_name = landmark_name[:max_chars] + "..." if len(landmark_name) > max_chars else landmark_name
        draw.text((20, box_y + 50), display_name.upper(), fill=(255, 255, 255), font=font_small)
        draw.text((width - 120, box_y + 50), f"{distance}M", fill=(100, 200, 255), font=font_small)
        
        img.save(image_path)
        print(f"✅ Drew landmark: {category_label} - {landmark_name} at {distance}m on {image_path}")
        return True
        
    except Exception as e:
        print(f"❌ Error drawing landmark pin: {e}")
        import traceback
        traceback.print_exc()
        return False

def add_visual_overlay_to_frame(frame_path: str, alert_data: dict) -> bool:
    """Master function to add visual overlays"""
    try:
        if not alert_data or not alert_data.get('alert'):
            return False
        
        alert_type = alert_data.get('alertType')
        
        if alert_type == 'turn':
            turn_icon = alert_data.get('alertIcon', 'navigation')
            distance = int(alert_data.get('alertDistance', 0))
            return draw_turn_arrow(frame_path, turn_icon, distance)
            
        elif alert_type == 'landmark':
            landmark_name = alert_data.get('alert', '').split('in')[0].strip()
            if ':' in landmark_name:
                landmark_name = landmark_name.split(':', 1)[1].strip()
            distance = int(alert_data.get('alertDistance', 0))
            category = alert_data.get('category', 'LOCATION')
            return draw_landmark_pin(frame_path, landmark_name, distance, category)
        
        return False
        
    except Exception as e:
        print(f"❌ Error adding visual overlay: {e}")
        import traceback
        traceback.print_exc()
        return False

# ------------------------
# TURN DETECTION
# ------------------------
def get_turn_instructions(directions_data):
    """Extract turns from Google Directions"""
    turns = []
    if not directions_data or 'routes' not in directions_data:
        return turns
    
    for leg in directions_data['routes'][0]['legs']:
        for step in leg['steps']:
            if 'maneuver' in step:
                turns.append({
                    'maneuver': step['maneuver'],
                    'instruction': step.get('html_instructions', ''),
                    'start_location': step['start_location'],
                    'end_location': step['end_location'],
                    'distance': step['distance']['value'],
                    'duration': step['duration']['value'],
                    'source': 'google'
                })
    
    return turns

def detect_all_turns_from_path(points_with_headings):
    """Detect ALL turns by analyzing heading changes"""
    detected_turns = []
    
    for i in range(len(points_with_headings) - TURN_DETECTION_WINDOW):
        current_heading = points_with_headings[i]['heading']
        future_heading = points_with_headings[i + TURN_DETECTION_WINDOW]['heading']
        
        heading_change = normalize_angle_difference(current_heading, future_heading)
        
        if heading_change >= HEADING_CHANGE_THRESHOLD:
            diff = future_heading - current_heading
            while diff > 180:
                diff -= 360
            while diff < -180:
                diff += 360
            
            if diff < 0:
                if heading_change > 60:
                    maneuver = 'turn-sharp-left'
                elif heading_change > 30:
                    maneuver = 'turn-left'
                else:
                    maneuver = 'turn-slight-left'
            else:
                if heading_change > 60:
                    maneuver = 'turn-sharp-right'
                elif heading_change > 30:
                    maneuver = 'turn-right'
                else:
                    maneuver = 'turn-slight-right'
            
            detected_turns.append({
                'maneuver': maneuver,
                'instruction': f'Detected {maneuver.replace("-", " ")}',
                'start_location': {
                    'lat': points_with_headings[i]['lat'],
                    'lng': points_with_headings[i]['lon']
                },
                'heading_change': heading_change,
                'distance': 0,
                'duration': 0,
                'source': 'detected'
            })
    
    return detected_turns

def merge_turns(google_turns, detected_turns):
    """Merge Google and detected turns"""
    all_turns = google_turns.copy()
    
    for detected in detected_turns:
        is_duplicate = False
        detected_lat = detected['start_location']['lat']
        detected_lon = detected['start_location']['lng']
        
        for google_turn in google_turns:
            google_lat = google_turn['start_location']['lat']
            google_lon = google_turn['start_location']['lng']
            distance = haversine(detected_lat, detected_lon, google_lat, google_lon)
            
            if distance < 30:
                is_duplicate = True
                break
        
        if not is_duplicate:
            all_turns.append(detected)
    
    return all_turns

# ------------------------
# Navigation Alert Functions
# ------------------------
def is_important_landmark(place_types):
    for place_type in place_types:
        if place_type in IMPORTANT_LANDMARK_TYPES:
            return True
    return False

def get_landmark_category(place_types):
    """✅ Returns TEXT-ONLY categories (no emoji)"""
    category_map = {
        'school': 'SCHOOL',
        'university': 'UNIVERSITY',
        'college': 'COLLEGE',
        'bus_station': 'BUS_STATION',
        'transit_station': 'TRANSIT_STATION',
        'train_station': 'TRAIN_STATION',
        'subway_station': 'SUBWAY_STATION',
        'shopping_mall': 'SHOPPING_MALL',
        'department_store': 'DEPARTMENT_STORE',
        'hospital': 'HOSPITAL',
        'police': 'POLICE',
        'fire_station': 'FIRE_STATION',
        'airport': 'AIRPORT',
        'park': 'PARK',
        'stadium': 'STADIUM',
        'museum': 'MUSEUM',
        'restaurant': 'RESTAURANT',
        'cafe': 'CAFE',
        'bank': 'BANK',
        'atm': 'ATM',
        'gas_station': 'GAS_STATION',
        'parking': 'PARKING'
    }
    
    for place_type in place_types:
        if place_type in category_map:
            return category_map[place_type]
    
    return 'LOCATION'

def get_nearby_landmarks(lat, lon, radius=LANDMARK_SEARCH_RADIUS):
    try:
        type_filter = '|'.join(IMPORTANT_LANDMARK_TYPES[:5])
        
        places_url = (
            "https://maps.googleapis.com/maps/api/place/nearbysearch/json"
            f"?location={lat},{lon}&radius={radius}"
            f"&type={type_filter}"
            f"&key={GOOGLE_MAPS_API_KEY}"
        )
        
        response = requests.get(places_url, timeout=5)
        if response.status_code == 200:
            data = response.json()
            landmarks = []
            
            for place in data.get('results', [])[:5]:
                place_lat = place['geometry']['location']['lat']
                place_lon = place['geometry']['location']['lng']
                distance = haversine(lat, lon, place_lat, place_lon)
                place_types = place.get('types', [])
                
                if is_important_landmark(place_types):
                    landmarks.append({
                        'name': place['name'],
                        'distance': distance,
                        'types': place_types,
                        'category': get_landmark_category(place_types),
                        'rating': place.get('rating', 0),
                        'location': {'lat': place_lat, 'lng': place_lon}
                    })
            
            landmarks.sort(key=lambda x: (-x['rating'], x['distance']))
            return landmarks[:3]
        
    except Exception as e:
        print(f"⚠️ Error fetching landmarks: {e}")
    
    return []

def generate_frame_alerts(lat, lon, turns, previous_alerts=None, frame_index=0):
    """✅ FIXED: Generate alert METADATA ONLY - skips passed turns"""
    alerts = []
    
    if previous_alerts is None:
        previous_alerts = set()
    
    # ✅ CRITICAL FIX: Only alert for turns AHEAD of current frame
    for turn in turns:
        # Skip turns that have already been passed
        if 'turn_index' in turn and frame_index >= turn['turn_index']:
            continue
        
        turn_lat = turn['start_location']['lat']
        turn_lon = turn['start_location']['lng']
        distance = haversine(lat, lon, turn_lat, turn_lon)
        
        if distance <= TURN_ALERT_DISTANCE:
            turn_type = turn['maneuver'].replace('_', ' ').title()
            alert_key = f"turn_{turn['maneuver']}_{int(distance/10)*10}"
            
            if alert_key not in previous_alerts:
                alerts.append({
                    'alert': f"{turn_type} in {int(distance)}m",
                    'alertType': 'turn',
                    'alertDistance': distance,
                    'alertIcon': turn['maneuver'],
                    'priority': 1,
                    'source': turn.get('source', 'google')
                })
                previous_alerts.add(alert_key)
    
    if frame_index % 5 == 0:
        landmarks = get_nearby_landmarks(lat, lon)
        for landmark in landmarks:
            if landmark['distance'] <= LANDMARK_ALERT_DISTANCE:
                landmark_key = f"landmark_{landmark['name']}_{int(landmark['distance']/20)*20}"
                
                if landmark_key not in previous_alerts:
                    alerts.append({
                        'alert': f"{landmark['category']}: {landmark['name']} in {int(landmark['distance'])}m",
                        'alertType': 'landmark',
                        'alertDistance': landmark['distance'],
                        'alertIcon': 'map-pin',
                        'category': landmark['category'],
                        'priority': 2
                    })
                    previous_alerts.add(landmark_key)
    
    alerts.sort(key=lambda x: (x.get('priority', 999), x['alertDistance']))
    
    return alerts, previous_alerts

# ------------------------
# DYNAMIC SPEED VIDEO GENERATION
# ------------------------
def calculate_frame_durations(frames_data: List[Dict], base_fps: int) -> List[float]:
    frame_durations = []
    base_duration = 1.0 / base_fps
    slow_duration = base_duration / ALERT_SPEED_MULTIPLIER
    
    for i, frame in enumerate(frames_data):
        has_alert = frame.get('alert') is not None
        
        if has_alert:
            frame_durations.append(slow_duration)
            
            for offset in range(1, ALERT_SLOWDOWN_FRAMES + 1):
                if i - offset >= 0 and len(frame_durations) >= offset:
                    frame_durations[i - offset] = slow_duration
        else:
            in_slowdown_range = False
            for offset in range(1, ALERT_SLOWDOWN_FRAMES + 1):
                if i - offset >= 0 and frames_data[i - offset].get('alert'):
                    in_slowdown_range = True
                    break
            
            if in_slowdown_range:
                frame_durations.append(slow_duration)
            else:
                frame_durations.append(base_duration)
    
    return frame_durations

def generate_video_with_dynamic_speed(frame_paths, frames_data, output_path, fps=30, quality="high"):
    if not frame_paths:
        raise ValueError("No frame paths provided")
    
    first_frame = cv2.imread(frame_paths[0])
    if first_frame is None:
        raise ValueError(f"Could not read first frame: {frame_paths[0]}")
    
    height, width, _ = first_frame.shape
    
    frame_durations = calculate_frame_durations(frames_data, fps)
    
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
            break
        else:
            out.release()
    
    if out is None or not out.isOpened():
        output_path = output_path.with_suffix(".avi")
        codec = cv2.VideoWriter_fourcc(*'XVID')
        out = cv2.VideoWriter(str(output_path), codec, fps, (width, height))
        if not out.isOpened():
            raise RuntimeError(f"Failed to open video writer")
    
    total_written_frames = 0
    base_frame_duration = 1.0 / fps
    
    for i, frame_path in enumerate(frame_paths):
        frame = cv2.imread(frame_path)
        if frame is None:
            continue
        
        if frame.shape[:2] != (height, width):
            frame = cv2.resize(frame, (width, height))
        
        target_duration = frame_durations[i] if i < len(frame_durations) else base_frame_duration
        repeat_count = max(1, int(round(target_duration / base_frame_duration)))
        
        for _ in range(repeat_count):
            out.write(frame)
            total_written_frames += 1
    
    out.release()
    
    actual_duration = total_written_frames / fps
    
    return {
        "video_path": str(output_path),
        "total_source_frames": len(frame_paths),
        "total_written_frames": total_written_frames,
        "fps": fps,
        "duration_seconds": actual_duration,
        "resolution": f"{width}x{height}",
        "speed_type": "dynamic",
        "slowdown_multiplier": f"{int((1/ALERT_SPEED_MULTIPLIER)*100)}% near alerts"
    }

# ------------------------
# Visual Odometry
# ------------------------
def compute_vo_headings(frames):
    vo_headings = []
    orb = cv2.ORB_create(nfeatures=1000)
    bf = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=True)

    for i in range(len(frames) - 1):
        file1 = frames[i]['filename']
        file2 = frames[i + 1]['filename']

        if not os.path.exists(file1) or not os.path.exists(file2):
            vo_headings.append(None)
            continue

        img1 = cv2.imread(file1, cv2.IMREAD_GRAYSCALE)
        img2 = cv2.imread(file2, cv2.IMREAD_GRAYSCALE)

        if img1 is None or img2 is None:
            vo_headings.append(None)
            continue

        kp1, des1 = orb.detectAndCompute(img1, None)
        kp2, des2 = orb.detectAndCompute(img2, None)

        if des1 is None or des2 is None:
            vo_headings.append(None)
            continue

        matches = bf.match(des1, des2)
        matches = sorted(matches, key=lambda x: x.distance)

        if len(matches) < 4:
            vo_headings.append(None)
            continue

        pts1 = np.float32([kp1[m.queryIdx].pt for m in matches])
        pts2 = np.float32([kp2[m.trainIdx].pt for m in matches])

        M, mask = cv2.estimateAffinePartial2D(pts1, pts2)

        if M is not None:
            angle = math.degrees(math.atan2(M[1, 0], M[0, 0]))
            vo_headings.append(angle)
        else:
            vo_headings.append(None)

    return vo_headings

# ------------------------
# CACHE CHECK ENDPOINT
# ------------------------
@app.post("/check_existing_route")
def check_existing_route(request: CacheCheckRequest):
    """✅ Check if processed route with video already exists"""
    try:
        route_id = f"{safe_name(request.start)}_{safe_name(request.end)}"
        route_dir = find_route_directory(route_id)
        
        if not route_dir:
            return {"exists": False, "video_available": False}
        
        # Check for interpolated frames
        interpolated_dir = route_dir / "smoothed" / "interpolated"
        if not interpolated_dir.exists():
            return {"exists": False, "video_available": False}
        
        # Check for frames_data.json with alerts
        frames_data_path = interpolated_dir / "frames_data.json"
        if not frames_data_path.exists():
            return {"exists": False, "video_available": False}
        
        # Load frames data
        with open(frames_data_path, 'r') as f:
            frames_data = json.load(f)
        
        # Check for video
        videos_dir = route_dir / "videos"
        if not videos_dir.exists():
            return {
                "exists": True,
                "video_available": False,
                "route_id": route_id,
                "frames": frames_data
            }
        
        # Find matching video
        expected_filename = f"{safe_name(route_id)[:30]}_dynamic_{request.video_fps}fps.mp4"
        video_path = videos_dir / expected_filename
        
        if not video_path.exists():
            # Try to find any video
            videos = list(videos_dir.glob("*.mp4"))
            if not videos:
                return {
                    "exists": True,
                    "video_available": False,
                    "route_id": route_id,
                    "frames": frames_data
                }
            video_path = videos[0]
        
        # Get video stats
        file_size_mb = video_path.stat().st_size / (1024 * 1024)
        
        print(f"✅ Cache HIT: Found route {route_id} with video {video_path.name}")
        
        return {
            "exists": True,
            "video_available": True,
            "route_id": route_id,
            "frames": frames_data,
            "video_path": str(video_path),
            "video_filename": video_path.name,
            "video_stats": {
                "file_size_mb": round(file_size_mb, 2),
                "fps": request.video_fps,
                "quality": request.video_quality,
                "source_type": "interpolated",
                "speed_type": "dynamic"
            },
            "processing_stats": {
                "total_final_frames": len(frames_data),
                "total_turns": sum(1 for f in frames_data if f.get('alertType') == 'turn'),
                "total_alerts": sum(1 for f in frames_data if f.get('alert'))
            }
        }
        
    except Exception as e:
        print(f"❌ Cache check error: {e}")
        import traceback
        traceback.print_exc()
        return {"exists": False, "video_available": False, "error": str(e)}

@app.get("/check_video/{route_id}/{filename}")
def check_video_exists(route_id: str, filename: str):
    """Check if specific video file exists"""
    try:
        route_dir = find_route_directory(route_id)
        if not route_dir:
            return {"exists": False}
        
        video_path = route_dir / "videos" / filename
        return {"exists": video_path.exists(), "path": str(video_path) if video_path.exists() else None}
        
    except Exception as e:
        return {"exists": False, "error": str(e)}

# ------------------------
# API ENDPOINTS
# ------------------------
@app.post("/generate_frames")
def generate_frames(route: RouteRequest):
    """✅ Generate frames with alert metadata ONLY (no overlays yet)"""
    route_id = f"{safe_name(route.start)}_{safe_name(route.end)}"

    print(f"🚀 Generating frames - METADATA ONLY (no overlays yet)")

    directions_url = (
        "https://maps.googleapis.com/maps/api/directions/json"
        f"?origin={route.start}&destination={route.end}&key={GOOGLE_MAPS_API_KEY}"
    )
    resp = requests.get(directions_url).json()
    
    if resp.get("status") != "OK":
        return {"error": resp.get("status"), "message": resp.get("error_message", "")}

    directions_data = resp
    steps = resp["routes"][0]["overview_polyline"]["points"]
    latlons = polyline.decode(steps)
    points = interpolate_points(latlons, step_m=7)

    route_dir = FRAMES_DIR / route_id
    route_dir.mkdir(parents=True, exist_ok=True)

    # ✅ NEW: Build points_with_headings FIRST (for turn_index mapping)
    points_with_headings = []
    for idx in range(len(points)-1):
        lat, lon = points[idx]
        lat_next, lon_next = points[idx+1]
        heading = calculate_heading(lat, lon, lat_next, lon_next)
        points_with_headings.append({
            'lat': lat,
            'lon': lon,
            'heading': heading,
            'idx': idx
        })
    
    # ✅ CHANGE A: Extract Google turns WITH turn_index
    google_turns = []
    if route.enable_alerts:
        for leg in directions_data['routes'][0]['legs']:
            for step in leg['steps']:
                if 'maneuver' in step:
                    # ✅ Map turn to closest route frame
                    idx = find_closest_point_index(
                        step['start_location']['lat'],
                        step['start_location']['lng'],
                        points_with_headings
                    )

                    google_turns.append({
                        'maneuver': step['maneuver'],
                        'instruction': step.get('html_instructions', ''),
                        'start_location': step['start_location'],
                        'end_location': step['end_location'],
                        'distance': step['distance']['value'],
                        'duration': step['duration']['value'],
                        'turn_index': idx,  # ✅ NEW: Route position
                        'source': 'google'
                    })
    
    detected_turns = detect_all_turns_from_path(points_with_headings) if route.enable_alerts else []
    
    # Add turn_index to detected turns
    for turn in detected_turns:
        turn_lat = turn['start_location']['lat']
        turn_lon = turn['start_location']['lng']
        idx = find_closest_point_index(turn_lat, turn_lon, points_with_headings)
        turn['turn_index'] = idx
    
    all_turns = merge_turns(google_turns, detected_turns) if route.enable_alerts else []
    
    print(f"📍 Google: {len(google_turns)} turns, Detected: {len(detected_turns)} turns, Total: {len(all_turns)} turns")
    
    frames = []
    previous_alerts = set()
    total_landmarks_detected = 0
    alert_count = 0
    
    for idx in range(len(points)-1):
        lat, lon = points[idx]
        lat_next, lon_next = points[idx+1]
        heading = calculate_heading(lat, lon, lat_next, lon_next)
        filename = f"frame_{idx+1}.jpg"
        filepath = route_dir / filename
        
        alert_data = None
        if route.enable_alerts:
            # ✅ CHANGE B: Pass frame_index to skip passed turns
            frame_alerts, previous_alerts = generate_frame_alerts(
                lat, lon, all_turns, previous_alerts, frame_index=idx
            )
            
            if frame_alerts:
                alert_data = frame_alerts[0]
                alert_count += 1
                if alert_data.get('alertType') == 'landmark':
                    total_landmarks_detected += 1
        
        if fetch_street_view_image(lat, lon, heading, filepath):
            frame_dict = {
                "lat": lat,
                "lon": lon,
                "heading": heading,
                "smoothedHeading": None,
                "filename": str(filepath),
                "interpolated": False
            }
            
            if alert_data:
                frame_dict.update(alert_data)
                print(f"📌 Frame {idx+1}: Alert metadata stored - {alert_data['alert']}")
            
            frames.append(frame_dict)

    vo_headings = compute_vo_headings(frames) if len(frames) > 1 else []
    
    print(f"✅ Generated {len(frames)} frames with {alert_count} alert metadata entries")

    return {
        "route_id": route_id,
        "frames": frames,
        "vo_headings": vo_headings,
        "directions_data": directions_data,
        "navigation_stats": {
            "total_turns": len(all_turns),
            "google_turns": len(google_turns),
            "detected_turns": len(detected_turns),
            "total_alerts": alert_count,
            "total_landmarks": total_landmarks_detected
        },
        "cached": False
    }

@app.post("/smooth")
def smooth(req: SmoothReq):
    if not req.frames or len(req.frames) == 0:
        return {"route_id": req.route_id, "frames": [], "smoothed": False}

    raw = [f.heading for f in req.frames if f.heading is not None]
    if len(raw) == 0:
        return {"route_id": req.route_id, "frames": [], "smoothed": False}

    sm = smooth_headings(raw)
    
    for i, f in enumerate(req.frames):
        f.smoothedHeading = float(sm[i])
        
    return {"route_id": req.route_id, "frames": req.frames, "smoothed": True}

@app.post("/regenerate_frames")
def regenerate_frames(req: RegenerateReq):
    """✅ Fetch new images with smoothed headings, preserve alerts"""
    if not req.frames or len(req.frames) == 0:
        return {"error": "No frames provided", "frames": []}

    frames_with_smoothed = [f for f in req.frames if f.smoothedHeading is not None]
    if not frames_with_smoothed:
        return {"error": "No smoothed headings found", "frames": req.frames}

    route_dir = FRAMES_DIR / req.route_id / "smoothed"
    route_dir.mkdir(parents=True, exist_ok=True)

    regenerated_count = 0
    updated_frames = []

    for idx, frame in enumerate(req.frames):
        if frame.smoothedHeading is not None:
            new_filename = f"smoothed_frame_{idx+1}.jpg"
            new_filepath = route_dir / new_filename

            success = fetch_street_view_image(
                frame.lat, 
                frame.lon, 
                frame.smoothedHeading, 
                new_filepath
            )

            if success:
                frame.filename = str(new_filepath)
                regenerated_count += 1
                print(f"✅ Regenerated frame {idx+1} with smoothed heading")
        
        updated_frames.append(frame)

    print(f"✅ Regenerated {regenerated_count} frames")

    return {
        "route_id": req.route_id, 
        "frames": updated_frames, 
        "regenerated_count": regenerated_count,
        "success": True
    }

@app.post("/interpolate_frames")
def interpolate_frames(req: InterpolateReq):
    """✅ Apply overlays ONLY HERE on final interpolated frames"""
    if not req.frames or len(req.frames) < 2:
        return {"error": "Need at least 2 frames", "frames": req.frames}

    route_base_dir = FRAMES_DIR / req.route_id
    if not route_base_dir.exists():
        route_base_dir = find_route_directory(req.route_id)
        if not route_base_dir:
            return {"error": "Route directory not found", "frames": req.frames}
    
    valid_frames = [f for f in req.frames if f.filename and Path(f.filename).exists()]
    
    if len(valid_frames) < 2:
        return {"error": "Need at least 2 valid frames", "frames": req.frames}

    interpolation_dir = route_base_dir / "smoothed" / "interpolated"
    interpolation_dir.mkdir(parents=True, exist_ok=True)

    interpolator = OpticalFlowInterpolator(interpolation_factor=req.interpolation_factor)

    try:
        frame_paths = [f.filename for f in valid_frames]
        interpolated_paths = interpolator.process_frame_sequence(frame_paths, interpolation_dir)
        
        combined_frames_data = create_interpolated_frames_data(
            [f.dict() for f in valid_frames],
            interpolated_paths,
            req.interpolation_factor
        )
        
        # ✅ APPLY OVERLAYS TO ALL FINAL FRAMES (not just interpolated)
        overlays_applied = 0
        print(f"🎨 Starting overlay application on {len(combined_frames_data)} final frames...")
        
        for i, frame_data in enumerate(combined_frames_data):
            if frame_data.get('alert'):
                alert_data = {
                    'alert': frame_data['alert'],
                    'alertType': frame_data['alertType'],
                    'alertDistance': frame_data.get('alertDistance'),
                    'alertIcon': frame_data.get('alertIcon'),
                    'category': frame_data.get('category')
                }
                
                frame_path = frame_data['filename']
                print(f"🎨 Applying overlay to frame {i+1}/{len(combined_frames_data)}: {frame_path}")
                
                if add_visual_overlay_to_frame(frame_path, alert_data):
                    overlays_applied += 1
                    print(f"✅ Overlay {overlays_applied} applied: {alert_data['alert']}")
                else:
                    print(f"❌ Failed to apply overlay to {frame_path}")
        
        # ✅ SAVE frames_data.json with all metadata
        frames_data_path = interpolation_dir / "frames_data.json"
        with open(frames_data_path, 'w') as f:
            json.dump(combined_frames_data, f, indent=2)
        print(f"✅ Saved frames_data.json with {len(combined_frames_data)} frames")
        
        updated_frames = [Frame(**frame_data) for frame_data in combined_frames_data]
        
        print(f"✅ Interpolation complete")
        print(f"🎨 Applied {overlays_applied} visual overlays to FINAL frames")
        
        return {
            "route_id": req.route_id,
            "frames": updated_frames,
            "interpolated_count": len(updated_frames) - len(valid_frames),
            "original_count": len(valid_frames),
            "total_count": len(updated_frames),
            "overlays_applied": overlays_applied,
            "success": True
        }
        
    except Exception as e:
        print(f"❌ Interpolation error: {e}")
        import traceback
        traceback.print_exc()
        return {"error": str(e), "frames": req.frames, "success": False}

@app.post("/process_complete_pipeline")
def process_complete_pipeline(request: CompleteProcessRequest):
    try:
        print("🚀 Starting complete pipeline")
        
        route_request = RouteRequest(start=request.start, end=request.end, enable_alerts=request.enable_alerts)
        gen_result = generate_frames(route_request)
        if "error" in gen_result:
            return {"error": gen_result["error"]}
        
        frame_objects = [Frame(**frame_dict) for frame_dict in gen_result["frames"]]
        
        smooth_req = SmoothReq(route_id=gen_result["route_id"], frames=frame_objects)
        smooth_result = smooth(smooth_req)
        if not smooth_result.get("smoothed", False):
            return {"error": "Smoothing failed"}
        
        regen_req = RegenerateReq(route_id=gen_result["route_id"], frames=smooth_result["frames"])
        regen_result = regenerate_frames(regen_req)
        if not regen_result.get("success", False):
            return {"error": "Regeneration failed"}
        
        interp_req = InterpolateReq(
            route_id=gen_result["route_id"], 
            frames=regen_result["frames"],
            interpolation_factor=request.interpolation_factor
        )
        interp_result = interpolate_frames(interp_req)
        if not interp_result.get("success", False):
            return {"error": "Interpolation failed"}
        
        print("✅ Complete pipeline finished!")
        
        return convert_numpy_types({
            "route_id": gen_result["route_id"],
            "pipeline_success": True,
            "final_frames": [frame.dict() for frame in interp_result["frames"]],
            "vo_headings": gen_result.get("vo_headings", []),
            "directions_data": gen_result.get("directions_data", {}),
            "statistics": {
                "original_frames": len(gen_result.get("frames", [])),
                "regenerated_frames": regen_result.get("regenerated_count", 0),
                "interpolated_frames": interp_result.get("interpolated_count", 0),
                "total_final_frames": interp_result.get("total_count", 0),
                "overlays_applied": interp_result.get("overlays_applied", 0)
            },
            "navigation_stats": gen_result.get("navigation_stats", {})
        })
        
    except Exception as e:
        print(f"❌ Pipeline error: {e}")
        import traceback
        traceback.print_exc()
        return {"error": str(e), "pipeline_success": False}

@app.post("/generate_video")
def generate_video(req: VideoGenerateReq):
    """✅ Video generation - uses final interpolated frames with overlays"""
    try:
        print(f"🎬 Generating video from final frames with overlays")
        
        route_base_dir = FRAMES_DIR / req.route_id
        if not route_base_dir.exists():
            route_base_dir = find_route_directory(req.route_id)
            if not route_base_dir:
                return {"error": "Route not found"}
        
        frame_dirs = [
            route_base_dir / "smoothed" / "interpolated",
            route_base_dir / "smoothed",
            route_base_dir,
        ]
        frame_paths = []
        frames_data = []
        
        for frame_dir in frame_dirs:
            if frame_dir.exists():
                patterns = ["interpolated_*.jpg", "smoothed_*.jpg", "frame_*.jpg"]
                for pattern in patterns:
                    found = sorted(frame_dir.glob(pattern),
                                 key=lambda x: int(''.join(filter(str.isdigit, x.stem)) or 0))
                    if found:
                        frame_paths = [str(f) for f in found]
                        print(f"📁 Using frames from: {frame_dir}")
                        
                        json_file = frame_dir / "frames_data.json"
                        if json_file.exists():
                            with open(json_file, 'r') as f:
                                frames_data = json.load(f)
                            print(f"📄 Loaded frames_data.json with {len(frames_data)} entries")
                        else:
                            frames_data = [{"alert": None} for _ in frame_paths]
                        break
                if frame_paths:
                    break
        
        if not frame_paths:
            return {"error": "No frames found"}
        
        videos_dir = route_base_dir / "videos"
        videos_dir.mkdir(exist_ok=True)
        
        video_filename = f"{safe_name(req.route_id)[:30]}_dynamic_{req.fps}fps.mp4"
        video_path = videos_dir / video_filename
        
        video_stats = generate_video_with_dynamic_speed(
            frame_paths, frames_data, video_path, fps=req.fps, quality=req.quality
        )
        file_size_mb = video_path.stat().st_size / (1024 * 1024)
        
        video_stats["file_size_mb"] = round(file_size_mb, 2)
        video_stats["video_filename"] = video_filename
        
        print(f"✅ Video generated: {video_path}")
        
        return convert_numpy_types({
            "route_id": req.route_id,
            "video_path": str(video_path),
            "video_filename": video_filename,
            "video_stats": video_stats,
            "success": True
        })
    except Exception as e:
        print(f"❌ Video error: {e}")
        import traceback
        traceback.print_exc()
        return {"error": str(e), "success": False}

@app.get("/videos/{route_id}/{filename}")
def serve_video(route_id: str, filename: str):
    try:
        route_base_dir = find_route_directory(route_id)
        if not route_base_dir:
            return {"error": "Route not found"}

        video_path = route_base_dir / "videos" / filename
        if not video_path.exists():
            return {"error": "Video not found"}

        return FileResponse(
            path=str(video_path),
            media_type='video/mp4',
            filename=filename
        )
    except Exception as e:
        return {"error": str(e)}