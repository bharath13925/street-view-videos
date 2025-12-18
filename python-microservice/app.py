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
import time

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
LANDMARK_SEARCH_RADIUS = 500  # meters - INCREASED from 250m

# VIDEO SPEED CONFIGURATION - EVEN SLOWER FOR LANDMARKS
NORMAL_SPEED_MULTIPLIER = 1.0
TURN_ALERT_SPEED_MULTIPLIER = 0.05  # 5% speed = 20x slower for turns
LANDMARK_ALERT_SPEED_MULTIPLIER = 0.02  # 2% speed = 50x slower for landmarks (MUCH SLOWER!)
ALERT_SLOWDOWN_FRAMES = 40  # Extended to 40 frames before/after alert

# TURN DETECTION THRESHOLD
HEADING_CHANGE_THRESHOLD = 20  # degrees
TURN_DETECTION_WINDOW = 3  # frames

# ✅ Rate limiting configuration
PLACES_API_DELAY = 0.2  # seconds between API calls
LAST_PLACES_API_CALL = 0

# ✅ REFINED Landmark categories - Only important places
IMPORTANT_LANDMARK_TYPES = [
    'school', 
    'university', 
    'college',
    'bus_station',
    'train_station', 
    'subway_station',
    'shopping_mall',
    'hospital',
    'airport',
    'restaurant', 
    'bank', 
    'atm',
    'gas_station', 
    'parking', 
    'store', 
    'supermarket',
    'pharmacy', 
    'church', 
    'temple', 
    'mosque',
    'library'
]

# ------------------------
# Import smoothers and optical flow
# ------------------------
from smooth.lstm_smoother import smooth_headings
from optical_flow_interpolation import OpticalFlowInterpolator, create_interpolated_frames_data

# ------------------------
# FastAPI setup
# ------------------------
app = FastAPI(title="Street View Navigation - NEW Places API")

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

def interpolate_points(latlons, step_m=3):
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
# ✅ Helper to find closest point index
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
# VISUAL OVERLAY FUNCTIONS - IMPROVED TEXT DISPLAY
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
    """✅ IMPROVED: Draw landmark info at BOTTOM with FULL text display - multi-line support"""
    try:
        img = Image.open(image_path)
        draw = ImageDraw.Draw(img)
        width, height = img.size
        
        try:
            font_large = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 32)
            font_medium = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 26)
            font_small = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 22)
        except:
            try:
                font_large = ImageFont.truetype("arial.ttf", 32)
                font_medium = ImageFont.truetype("arial.ttf", 26)
                font_small = ImageFont.truetype("arial.ttf", 22)
            except:
                font_large = ImageFont.load_default()
                font_medium = ImageFont.load_default()
                font_small = ImageFont.load_default()
        
        # ✅ INCREASED box height for multi-line text
        box_height = 130
        box_y = height - box_height
        overlay = Image.new('RGBA', img.size, (0, 0, 0, 0))
        overlay_draw = ImageDraw.Draw(overlay)
        overlay_draw.rectangle([(0, box_y), (width, height)], fill=(0, 0, 0, 220))
        img = Image.alpha_composite(img.convert('RGBA'), overlay).convert('RGB')
        draw = ImageDraw.Draw(img)
        
        category_text_map = {
            'SCHOOL': 'SCHOOL',
            'UNIVERSITY': 'UNIVERSITY',
            'COLLEGE': 'COLLEGE',
            'BUS_STATION': 'BUS STATION',
            'TRAIN_STATION': 'TRAIN',
            'SUBWAY_STATION': 'METRO',
            'SHOPPING_MALL': 'MALL',
            'HOSPITAL': 'HOSPITAL',
            'AIRPORT': 'AIRPORT',
            'RESTAURANT': 'RESTAURANT',
            'BANK': 'BANK',
            'ATM': 'ATM',
            'GAS_STATION': 'GAS',
            'PARKING': 'PARKING',
            'STORE': 'STORE',
            'SUPERMARKET': 'SUPERMARKET',
            'PHARMACY': 'PHARMACY',
            'CHURCH': 'CHURCH',
            'TEMPLE': 'TEMPLE',
            'MOSQUE': 'MOSQUE',
            'LIBRARY': 'LIBRARY'
        }
        
        category_label = category_text_map.get(category.upper().replace(' ', '_'), category)
        draw.text((20, box_y + 10), category_label, fill=(100, 200, 255), font=font_large)
        
        # ✅ IMPROVED: Smart text wrapping for long landmark names
        max_width = width - 160  # Leave space for distance on right
        
        # Function to wrap text
        def wrap_text(text, font, max_width):
            words = text.split()
            lines = []
            current_line = []
            
            for word in words:
                test_line = ' '.join(current_line + [word])
                bbox = draw.textbbox((0, 0), test_line, font=font)
                text_width = bbox[2] - bbox[0]
                
                if text_width <= max_width:
                    current_line.append(word)
                else:
                    if current_line:
                        lines.append(' '.join(current_line))
                    current_line = [word]
            
            if current_line:
                lines.append(' '.join(current_line))
            
            # Limit to 2 lines maximum
            if len(lines) > 2:
                second_line = lines[1]
                if len(second_line) > 25:
                    second_line = second_line[:25] + "..."
                lines = [lines[0], second_line]
            
            return lines
        
        landmark_lines = wrap_text(landmark_name.upper(), font_medium, max_width)
        
        # Draw landmark name (with line wrapping)
        y_offset = box_y + 50
        for i, line in enumerate(landmark_lines):
            draw.text((20, y_offset + (i * 28)), line, fill=(255, 255, 255), font=font_medium)
        
        # Draw distance on the right
        distance_text = f"{distance}M"
        draw.text((width - 110, box_y + 50), distance_text, fill=(100, 200, 255), font=font_large)
        
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
# ✅ NEW PLACES API FUNCTIONS
# ------------------------
def is_important_landmark(place_types):
    """✅ Check if place is an important landmark"""
    for t in place_types:
        if t in IMPORTANT_LANDMARK_TYPES:
            return True
    return False

def get_landmark_category(place_types):
    """✅ Get category for landmark"""
    category_map = {
        'school': 'SCHOOL',
        'university': 'UNIVERSITY',
        'college': 'COLLEGE',
        'bus_station': 'BUS_STATION',
        'train_station': 'TRAIN_STATION',
        'subway_station': 'SUBWAY_STATION',
        'shopping_mall': 'SHOPPING_MALL',
        'hospital': 'HOSPITAL',
        'airport': 'AIRPORT',
        'restaurant': 'RESTAURANT',
        'bank': 'BANK',
        'atm': 'ATM',
        'gas_station': 'GAS_STATION',
        'parking': 'PARKING',
        'store': 'STORE',
        'supermarket': 'SUPERMARKET',
        'pharmacy': 'PHARMACY',
        'church': 'CHURCH',
        'temple': 'TEMPLE',
        'mosque': 'MOSQUE',
        'library': 'LIBRARY'
    }
    
    for t in place_types:
        if t in category_map:
            return category_map[t]
    
    return 'LOCATION'

def get_nearby_landmarks(lat, lon, radius=LANDMARK_SEARCH_RADIUS):
    """✅ NEW PLACES API - Fetch landmarks using Places API (New)"""
    global LAST_PLACES_API_CALL
    
    try:
        # ✅ Rate limiting
        current_time = time.time()
        time_since_last_call = current_time - LAST_PLACES_API_CALL
        if time_since_last_call < PLACES_API_DELAY:
            time.sleep(PLACES_API_DELAY - time_since_last_call)
        
        # ✅ NEW PLACES API ENDPOINT
        places_url = "https://places.googleapis.com/v1/places:searchNearby"
        
        # ✅ NEW API uses POST with JSON body
        headers = {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": GOOGLE_MAPS_API_KEY,
            "X-Goog-FieldMask": "places.displayName,places.types,places.location,places.rating"
        }
        
        body = {
            "locationRestriction": {
                "circle": {
                    "center": {
                        "latitude": lat,
                        "longitude": lon
                    },
                    "radius": radius
                }
            },
            "maxResultCount": 20
        }
        
        response = requests.post(places_url, headers=headers, json=body, timeout=10)
        LAST_PLACES_API_CALL = time.time()
        
        if response.status_code != 200:
            print(f"❌ Places API (NEW) HTTP error {response.status_code}")
            print(f"Response: {response.text[:500]}")
            return []
        
        data = response.json()
        results = data.get('places', [])
        
        landmarks = []
        filtered_count = 0
        
        for place in results:
            # ✅ NEW API format differences
            place_name = place.get('displayName', {}).get('text', 'Unknown')
            place_types = place.get('types', [])
            
            # ✅ Filter locally using important landmark list
            if not is_important_landmark(place_types):
                filtered_count += 1
                continue
            
            location = place.get('location', {})
            place_lat = location.get('latitude', lat)
            place_lon = location.get('longitude', lon)
            distance = haversine(lat, lon, place_lat, place_lon)
            
            landmarks.append({
                'name': place_name,
                'distance': distance,
                'types': place_types,
                'category': get_landmark_category(place_types),
                'rating': place.get('rating', 0),
                'location': {
                    'lat': place_lat,
                    'lng': place_lon
                }
            })
        
        # Sort by distance first, then rating
        landmarks.sort(key=lambda x: (x['distance'], -x['rating']))
        return landmarks[:3]
    
    except requests.exceptions.Timeout:
        print(f"⚠️ Places API timeout")
        return []
    except requests.exceptions.RequestException as e:
        print(f"⚠️ Places API request error: {e}")
        return []
    except Exception as e:
        print(f"❌ Landmark fetch error: {e}")
        import traceback
        traceback.print_exc()
        return []

def generate_frame_alerts(lat, lon, turns, previous_alerts=None, frame_index=0, landmark_history=None):
    """✅ FIXED: Prevents distance increases and stops showing passed landmarks"""
    alerts = []
    
    if previous_alerts is None:
        previous_alerts = set()
    
    if landmark_history is None:
        landmark_history = {}  # Store {landmark_name: last_distance}
    
    # ✅ Only alert for turns AHEAD of current frame
    for turn in turns:
        if 'turn_index' in turn and frame_index >= turn['turn_index']:
            continue
        
        turn_lat = turn['start_location']['lat']
        turn_lon = turn['start_location']['lng']
        distance = haversine(lat, lon, turn_lat, turn_lon)
        
        if distance <= TURN_ALERT_DISTANCE:
            key = f"turn_{turn['maneuver']}_{int(distance/10)*10}"
            if key not in previous_alerts:
                alerts.append({
                    'alert': f"{turn['maneuver'].replace('-', ' ').title()} in {int(distance)}m",
                    'alertType': 'turn',
                    'alertDistance': distance,
                    'alertIcon': turn['maneuver'],
                    'priority': 1
                })
                previous_alerts.add(key)
    
    # 🔥 CHECK LANDMARKS MORE FREQUENTLY (every 2 frames)
    if frame_index % 2 == 0:
        landmarks = get_nearby_landmarks(lat, lon)
        
        for lm in landmarks:
            landmark_id = lm['name']
            current_distance = lm['distance']
            
            # ✅ Check if we've seen this landmark before
            if landmark_id in landmark_history:
                last_distance = landmark_history[landmark_id]
                
                # ✅ If distance is INCREASING, we've passed it - skip!
                if current_distance > last_distance + 5:  # 5m tolerance for GPS jitter
                    continue
            
            # ✅ Update history with current distance
            landmark_history[landmark_id] = current_distance
            
            if current_distance <= LANDMARK_ALERT_DISTANCE:
                # ✅ Use landmark name + rough distance bucket for deduplication
                key = f"landmark_{landmark_id}_{int(current_distance/50)*50}"
                
                if key not in previous_alerts:
                    alerts.append({
                        'alert': f"{lm['category']}: {lm['name']} in {int(current_distance)}m",
                        'alertType': 'landmark',
                        'alertDistance': current_distance,
                        'alertIcon': 'map-pin',
                        'category': lm['category'],
                        'priority': 2
                    })
                    previous_alerts.add(key)
    
    alerts.sort(key=lambda x: (x['priority'], x['alertDistance']))
    return alerts, previous_alerts, landmark_history

# ------------------------
# ✅ IMPROVED DYNAMIC SPEED VIDEO GENERATION - SEPARATE SPEEDS FOR TURNS AND LANDMARKS
# ------------------------
def calculate_frame_durations(frames_data: List[Dict], base_fps: int) -> List[float]:
    """✅ IMPROVED: Different slowdown speeds for turns vs landmarks - landmarks are MUCH SLOWER"""
    frame_durations = []
    base_duration = 1.0 / base_fps
    turn_slow_duration = base_duration / TURN_ALERT_SPEED_MULTIPLIER  # 20x slower for turns
    landmark_slow_duration = base_duration / LANDMARK_ALERT_SPEED_MULTIPLIER  # 50x slower for landmarks!
    
    print(f"\n🎬 ===== FRAME DURATION CALCULATION =====")
    print(f"📊 Base FPS: {base_fps}, Base duration: {base_duration:.4f}s")
    print(f"📊 Turn slowdown: {turn_slow_duration:.4f}s (20x slower)")
    print(f"📊 Landmark slowdown: {landmark_slow_duration:.4f}s (50x SLOWER!)")
    print(f"📊 Total frames to process: {len(frames_data)}")
    
    # ✅ Separate turn and landmark frames
    turn_frames = {}
    landmark_frames = {}
    
    for i, frame in enumerate(frames_data):
        has_alert = False
        alert_info = None
        
        if frame.get('alert') and frame.get('alert') not in ['', 'null', None]:
            has_alert = True
            alert_info = {
                'type': frame.get('alertType', 'unknown'),
                'text': frame.get('alert', 'unknown'),
                'distance': frame.get('alertDistance', 0)
            }
        elif frame.get('alertType') and frame.get('alertType') not in ['', None]:
            has_alert = True
            alert_info = {
                'type': frame.get('alertType'),
                'text': frame.get('alert', 'unknown'),
                'distance': frame.get('alertDistance', 0)
            }
        
        if has_alert:
            if alert_info['type'] == 'turn':
                turn_frames[i] = alert_info
                print(f"🔄 Turn at frame {i}: {alert_info['text'][:60]}")
            elif alert_info['type'] == 'landmark':
                landmark_frames[i] = alert_info
                print(f"📍 Landmark at frame {i}: {alert_info['text'][:60]}")
    
    print(f"\n📊 ALERT SUMMARY:")
    print(f"   • Turn alerts: {len(turn_frames)} frames")
    print(f"   • Landmark alerts: {len(landmark_frames)} frames")
    print(f"   • Total alerts: {len(turn_frames) + len(landmark_frames)} out of {len(frames_data)}")
    
    if len(turn_frames) + len(landmark_frames) == 0:
        print("⚠️ WARNING: No alerts found! Video will play at normal speed.")
        return [base_duration] * len(frames_data)
    
    # ✅ Apply slowdown with priority: landmarks > turns
    slowdown_count = 0
    turn_slowdowns = 0
    landmark_slowdowns = 0
    
    for i in range(len(frames_data)):
        closest_landmark_distance = float('inf')
        closest_turn_distance = float('inf')
        
        # Check for nearby landmarks (priority 1)
        for offset in range(-ALERT_SLOWDOWN_FRAMES, ALERT_SLOWDOWN_FRAMES + 1):
            check_idx = i + offset
            if check_idx in landmark_frames:
                distance = abs(offset)
                closest_landmark_distance = min(closest_landmark_distance, distance)
            
            if check_idx in turn_frames:
                distance = abs(offset)
                closest_turn_distance = min(closest_turn_distance, distance)
        
        # Priority: landmarks are slower than turns
        if closest_landmark_distance != float('inf'):
            # Near a landmark - use EXTRA SLOW speed
            slowdown_count += 1
            landmark_slowdowns += 1
            
            if closest_landmark_distance == 0:
                # AT landmark - MAXIMUM slowdown
                frame_durations.append(landmark_slow_duration)
            elif closest_landmark_distance <= 5:
                # VERY CLOSE - 90% of max slowdown
                transition_factor = 0.9
                duration = base_duration / (LANDMARK_ALERT_SPEED_MULTIPLIER * transition_factor + (1 - transition_factor))
                frame_durations.append(duration)
            elif closest_landmark_distance <= 10:
                # NEAR - 70% slowdown
                transition_factor = 0.7
                duration = base_duration / (LANDMARK_ALERT_SPEED_MULTIPLIER * transition_factor + (1 - transition_factor))
                frame_durations.append(duration)
            elif closest_landmark_distance <= 20:
                # APPROACHING - 50% slowdown
                transition_factor = 0.5
                duration = base_duration / (LANDMARK_ALERT_SPEED_MULTIPLIER * transition_factor + (1 - transition_factor))
                frame_durations.append(duration)
            else:
                # FAR APPROACH - 30% slowdown
                transition_factor = 0.3
                duration = base_duration / (LANDMARK_ALERT_SPEED_MULTIPLIER * transition_factor + (1 - transition_factor))
                frame_durations.append(duration)
                
        elif closest_turn_distance != float('inf'):
            # Near a turn - use regular slow speed
            slowdown_count += 1
            turn_slowdowns += 1
            
            if closest_turn_distance == 0:
                frame_durations.append(turn_slow_duration)
            elif closest_turn_distance <= 3:
                transition_factor = 0.9
                duration = base_duration / (TURN_ALERT_SPEED_MULTIPLIER * transition_factor + (1 - transition_factor))
                frame_durations.append(duration)
            elif closest_turn_distance <= 7:
                transition_factor = 0.6
                duration = base_duration / (TURN_ALERT_SPEED_MULTIPLIER * transition_factor + (1 - transition_factor))
                frame_durations.append(duration)
            else:
                transition_factor = 0.3
                duration = base_duration / (TURN_ALERT_SPEED_MULTIPLIER * transition_factor + (1 - transition_factor))
                frame_durations.append(duration)
        else:
            # Normal speed
            frame_durations.append(base_duration)
    
    print(f"\n✅ SLOWDOWN APPLIED:")
    print(f"   • Total slowed frames: {slowdown_count} ({(slowdown_count/len(frames_data)*100):.1f}%)")
    print(f"   • Landmark slowdowns: {landmark_slowdowns} frames (50x slower)")
    print(f"   • Turn slowdowns: {turn_slowdowns} frames (20x slower)")
    print(f"=====================================\n")
    
    return frame_durations

def generate_video_with_dynamic_speed(frame_paths, frames_data, output_path, fps=30, quality="high"):
    """Generate video with dynamic speed - MUCH slower for landmarks"""
    if not frame_paths:
        raise ValueError("No frame paths provided")
    
    print(f"\n🎬 ===== VIDEO GENERATION =====")
    print(f"📊 Input frames: {len(frame_paths)}")
    print(f"📊 Target FPS: {fps}")
    print(f"📊 Quality: {quality}")
    print(f"📊 Landmark speed: {LANDMARK_ALERT_SPEED_MULTIPLIER*100:.1f}% (50x slower)")
    print(f"📊 Turn speed: {TURN_ALERT_SPEED_MULTIPLIER*100:.1f}% (20x slower)")
    
    first_frame = cv2.imread(frame_paths[0])
    if first_frame is None:
        raise ValueError(f"Could not read first frame: {frame_paths[0]}")
    
    height, width, _ = first_frame.shape
    print(f"📊 Resolution: {width}x{height}")
    
    # Calculate frame durations with detailed logging
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
            print(f"✅ Using codec: {c}")
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
    
    print(f"\n🎬 Writing frames with variable speed...")
    landmark_frame_count = 0
    turn_frame_count = 0
    
    for i, frame_path in enumerate(frame_paths):
        frame = cv2.imread(frame_path)
        if frame is None:
            continue
        
        if frame.shape[:2] != (height, width):
            frame = cv2.resize(frame, (width, height))
        
        target_duration = frame_durations[i] if i < len(frame_durations) else base_frame_duration
        repeat_count = max(1, int(round(target_duration / base_frame_duration)))
        
        # Track slowdowns
        if repeat_count > 30:  # Landmark threshold
            landmark_frame_count += 1
            if landmark_frame_count % 5 == 0:
                print(f"   📍 Landmark frame {i}: Repeating {repeat_count}x (duration: {target_duration:.2f}s)")
        elif repeat_count > 10:  # Turn threshold
            turn_frame_count += 1
            if turn_frame_count % 5 == 0:
                print(f"   🔄 Turn frame {i}: Repeating {repeat_count}x (duration: {target_duration:.2f}s)")
        
        for _ in range(repeat_count):
            out.write(frame)
            total_written_frames += 1
    
    out.release()
    
    actual_duration = total_written_frames / fps
    
    print(f"\n✅ VIDEO COMPLETE:")
    print(f"   • Written frames: {total_written_frames}")
    print(f"   • Duration: {actual_duration:.2f} seconds")
    print(f"   • Landmark frames processed: {landmark_frame_count}")
    print(f"   • Turn frames processed: {turn_frame_count}")
    print(f"   • File: {output_path}")
    print(f"=====================================\n")
    
    return {
        "video_path": str(output_path),
        "total_source_frames": len(frame_paths),
        "total_written_frames": total_written_frames,
        "fps": fps,
        "duration_seconds": actual_duration,
        "resolution": f"{width}x{height}",
        "speed_type": "dynamic",
        "landmark_slowdown": f"{int((1/LANDMARK_ALERT_SPEED_MULTIPLIER))}x slower",
        "turn_slowdown": f"{int((1/TURN_ALERT_SPEED_MULTIPLIER))}x slower"
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
    """✅ Generate frames with alert metadata using NEW Places API"""
    route_id = f"{safe_name(route.start)}_{safe_name(route.end)}"

    print(f"🚀 Generating frames - Using NEW Places API")
    print(f"🔑 API Key status: {'SET' if GOOGLE_MAPS_API_KEY else 'MISSING'}")

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
    points = interpolate_points(latlons, step_m=3)

    route_dir = FRAMES_DIR / route_id
    route_dir.mkdir(parents=True, exist_ok=True)

    # ✅ Build points_with_headings FIRST
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
    
    # ✅ Extract Google turns WITH turn_index
    google_turns = []
    if route.enable_alerts:
        for leg in directions_data['routes'][0]['legs']:
            for step in leg['steps']:
                if 'maneuver' in step:
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
                        'turn_index': idx,
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
    
    
    frames = []
    previous_alerts = set()
    landmark_history = {}
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
            frame_alerts, previous_alerts, landmark_history = generate_frame_alerts(
                lat, lon, all_turns, previous_alerts, frame_index=idx, landmark_history=landmark_history
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
            
            frames.append(frame_dict)

    vo_headings = compute_vo_headings(frames) if len(frames) > 1 else []

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
        
        # ✅ APPLY OVERLAYS TO ALL FINAL FRAMES
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
                
                if add_visual_overlay_to_frame(frame_path, alert_data):
                    overlays_applied += 1
                    if alert_data.get('alertType') == 'landmark':
                        print(f"🎨 Overlay {overlays_applied} (LANDMARK): {alert_data['alert']}")
        
        # ✅ SAVE frames_data.json with all metadata
        frames_data_path = interpolation_dir / "frames_data.json"
        with open(frames_data_path, 'w') as f:
            json.dump(combined_frames_data, f, indent=2)
        print(f"✅ Saved frames_data.json with {len(combined_frames_data)} frames")
        
        updated_frames = [Frame(**frame_data) for frame_data in combined_frames_data]
        
        landmark_overlays = sum(1 for f in combined_frames_data if f.get('alertType') == 'landmark')
        
        print(f"✅ Interpolation complete")
        print(f"🎨 Applied {overlays_applied} visual overlays ({landmark_overlays} landmarks)")
        
        return {
            "route_id": req.route_id,
            "frames": updated_frames,
            "interpolated_count": len(updated_frames) - len(valid_frames),
            "original_count": len(valid_frames),
            "total_count": len(updated_frames),
            "overlays_applied": overlays_applied,
            "landmark_overlays": landmark_overlays,
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
        print("🚀 Starting complete pipeline with NEW Places API")
        print(f"🔑 Google Maps API Key: {'SET ✅' if GOOGLE_MAPS_API_KEY else 'MISSING ❌'}")
        
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
                "overlays_applied": interp_result.get("overlays_applied", 0),
                "landmark_overlays": interp_result.get("landmark_overlays", 0)
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
                            
                            # ✅ DEBUG: Check alert presence
                            alerts_count = sum(1 for f in frames_data if f.get('alert'))
                            landmark_count = sum(1 for f in frames_data if f.get('alertType') == 'landmark')
                            turn_count = sum(1 for f in frames_data if f.get('alertType') == 'turn')
                            print(f"🚨 DEBUG: Found {alerts_count} frames with alerts ({landmark_count} landmarks, {turn_count} turns)")
                        else:
                            print(f"⚠️ WARNING: frames_data.json not found, creating empty alert data")
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