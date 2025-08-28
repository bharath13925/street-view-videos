import cv2
import numpy as np
from pathlib import Path
import os
from typing import List, Optional

class OpticalFlowInterpolator:
    """
    Optical Flow-based frame interpolation for smooth transitions
    Uses Farneback optical flow and frame warping/blending
    """
    
    def __init__(self, interpolation_factor: int = 2):
        """
        Initialize the optical flow interpolator
        
        Args:
            interpolation_factor: Number of frames to generate between each pair (e.g., 2 = double frame rate)
        """
        self.interpolation_factor = interpolation_factor
        
        # Farneback optical flow parameters
        self.flow_params = dict(
            pyr_scale=0.5,
            levels=3,
            winsize=15,
            iterations=3,
            poly_n=5,
            poly_sigma=1.2,
            flags=0
        )
    
    def compute_optical_flow(self, frame1: np.ndarray, frame2: np.ndarray) -> np.ndarray:
        """
        Compute optical flow between two frames using Farneback method
        
        Args:
            frame1: First frame (grayscale)
            frame2: Second frame (grayscale)
            
        Returns:
            Optical flow field
        """
        return cv2.calcOpticalFlowFarneback(frame1, frame2, None, **self.flow_params)
    
    def warp_frame(self, frame: np.ndarray, flow: np.ndarray, t: float) -> np.ndarray:
        """
        Warp frame using optical flow at time t
        """
        h, w = flow.shape[:2]
        y, x = np.mgrid[0:h, 0:w].astype(np.float32)

        new_x = x + flow[..., 0] * t
        new_y = y + flow[..., 1] * t

        warped = cv2.remap(frame, new_x, new_y, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)
        return warped
    
    def blend_frames(self, frame1: np.ndarray, frame2: np.ndarray, alpha: float) -> np.ndarray:
        """
        Blend two frames with alpha blending
        """
        return cv2.addWeighted(frame1, 1 - alpha, frame2, alpha, 0)
    
    def interpolate_between_frames(self, frame1_path: str, frame2_path: str, 
                                   output_dir: Path, base_idx: int) -> List[str]:
        """
        Generate interpolated frames between two input frames
        """
        frame1_bgr = cv2.imread(frame1_path)
        frame2_bgr = cv2.imread(frame2_path)
        
        if frame1_bgr is None or frame2_bgr is None:
            print(f"❌ Could not load frames: {frame1_path}, {frame2_path}")
            return []
        
        frame1_gray = cv2.cvtColor(frame1_bgr, cv2.COLOR_BGR2GRAY)
        frame2_gray = cv2.cvtColor(frame2_bgr, cv2.COLOR_BGR2GRAY)
        
        # Compute bidirectional dense flow
        flow_forward = self.compute_optical_flow(frame1_gray, frame2_gray)
        flow_backward = self.compute_optical_flow(frame2_gray, frame1_gray)
        
        interpolated_paths = []
        
        for i in range(1, self.interpolation_factor + 1):
            t = i / (self.interpolation_factor + 1)
            
            warped_frame1 = self.warp_frame(frame1_bgr, flow_forward, t)
            warped_frame2 = self.warp_frame(frame2_bgr, flow_backward, 1 - t)
            
            interpolated = self.blend_frames(warped_frame1, warped_frame2, t)
            interpolated = cv2.bilateralFilter(interpolated, 5, 50, 50)
            
            frame1_name = Path(frame1_path).stem
            frame2_name = Path(frame2_path).stem
            is_smoothed = "smoothed" in frame1_name or "smoothed" in frame2_name
            
            if is_smoothed:
                output_filename = f"smooth_interpolated_{base_idx}_{i}.jpg"
            else:
                output_filename = f"interpolated_{base_idx}_{i}.jpg"
                
            output_path = output_dir / output_filename
            success = cv2.imwrite(str(output_path), interpolated)
            
            if success:
                interpolated_paths.append(str(output_path))
                print(f"✅ Generated interpolated frame: {output_filename} (t={t:.2f})")
            else:
                print(f"❌ Failed to save interpolated frame: {output_filename}")
        
        return interpolated_paths
    
    def process_frame_sequence(self, frame_paths: List[str], output_dir: Path) -> List[str]:
        """
        Process entire sequence of frames with optical flow interpolation
        """
        output_dir.mkdir(parents=True, exist_ok=True)
        all_frames = []
        
        for i in range(len(frame_paths) - 1):
            all_frames.append(frame_paths[i])
            
            interpolated = self.interpolate_between_frames(
                frame_paths[i], 
                frame_paths[i + 1], 
                output_dir, 
                i
            )
            
            all_frames.extend(interpolated)
        
        all_frames.append(frame_paths[-1])
        
        print(f"✅ Generated {len(all_frames)} total frames ({len(frame_paths)} original + {len(all_frames) - len(frame_paths)} interpolated)")
        return all_frames
    
    def estimate_motion_consistency(self, frame_paths: List[str]) -> List[float]:
        """
        Estimate motion consistency scores for quality assessment
        """
        if len(frame_paths) < 3:
            return [1.0] * len(frame_paths)
        
        consistency_scores = []
        
        for i in range(1, len(frame_paths) - 1):
            prev_frame = cv2.imread(frame_paths[i-1], cv2.IMREAD_GRAYSCALE)
            curr_frame = cv2.imread(frame_paths[i], cv2.IMREAD_GRAYSCALE)
            next_frame = cv2.imread(frame_paths[i+1], cv2.IMREAD_GRAYSCALE)
            
            if prev_frame is None or curr_frame is None or next_frame is None:
                consistency_scores.append(0.0)
                continue
            
            flow1 = self.compute_optical_flow(prev_frame, curr_frame)
            flow2 = self.compute_optical_flow(curr_frame, next_frame)
            
            mag1 = np.sqrt(flow1[..., 0]**2 + flow1[..., 1]**2)
            mag2 = np.sqrt(flow2[..., 0]**2 + flow2[..., 1]**2)
            
            consistency = 1.0 - np.mean(np.abs(mag1 - mag2)) / (np.mean(mag1) + np.mean(mag2) + 1e-6)
            consistency = max(0.0, min(1.0, consistency))
            
            consistency_scores.append(consistency)
        
        if consistency_scores:
            consistency_scores.insert(0, consistency_scores[0])
            consistency_scores.append(consistency_scores[-1])
        
        return consistency_scores


# RAFT Optical Flow Implementation (fallback uses Farneback)
class RAFTInterpolator(OpticalFlowInterpolator):
    def __init__(self, interpolation_factor: int = 2, model_path: Optional[str] = None):
        super().__init__(interpolation_factor)
        self.model_path = model_path
        self.device = 'cuda' if cv2.cuda.getCudaEnabledDeviceCount() > 0 else 'cpu'
        
    def compute_raft_flow(self, frame1: np.ndarray, frame2: np.ndarray) -> np.ndarray:
        """
        Placeholder RAFT implementation (falls back to Farneback)
        """
        print("⚠️ RAFT not implemented, using Farneback optical flow instead")
        frame1_gray = cv2.cvtColor(frame1, cv2.COLOR_BGR2GRAY) if len(frame1.shape) == 3 else frame1
        frame2_gray = cv2.cvtColor(frame2, cv2.COLOR_BGR2GRAY) if len(frame2.shape) == 3 else frame2
        return self.compute_optical_flow(frame1_gray, frame2_gray)


def create_interpolated_frames_data(original_frames_data: List[dict], 
                                    interpolated_paths: List[str],
                                    interpolation_factor: int) -> List[dict]:
    """
    Create frames data structure including interpolated frames
    """
    combined_frames = []
    path_idx = 0
    
    for i in range(len(original_frames_data) - 1):
        combined_frames.append(original_frames_data[i])
        path_idx += 1
        
        for j in range(interpolation_factor):
            if path_idx < len(interpolated_paths):
                t = (j + 1) / (interpolation_factor + 1)
                
                lat1, lon1 = original_frames_data[i]['lat'], original_frames_data[i]['lon']
                lat2, lon2 = original_frames_data[i + 1]['lat'], original_frames_data[i + 1]['lon']
                
                heading1 = original_frames_data[i].get('smoothedHeading') or original_frames_data[i]['heading']
                heading2 = original_frames_data[i + 1].get('smoothedHeading') or original_frames_data[i + 1]['heading']
                
                interp_lat = lat1 + (lat2 - lat1) * t
                interp_lon = lon1 + (lon2 - lon1) * t
                
                angle_diff = ((heading2 - heading1 + 180) % 360) - 180
                interp_heading = (heading1 + angle_diff * t) % 360
                
                interpolated_frame = {
                    'lat': interp_lat,
                    'lon': interp_lon,
                    'heading': original_frames_data[i]['heading'],
                    'smoothedHeading': interp_heading,
                    'filename': interpolated_paths[path_idx - 1],
                    'interpolated': True
                }
                
                combined_frames.append(interpolated_frame)
            path_idx += 1
    
    combined_frames.append(original_frames_data[-1])
    return combined_frames
