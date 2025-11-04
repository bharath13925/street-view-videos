"""
lstm_smoother.py
Inference module for smoothing noisy heading measurements using trained LSTM
"""
import numpy as np
import torch
from models.heading_lstm import HeadingLSTM, angle_to_vec, vec_to_angle


def load_model(path="models/heading_lstm.pt", device="cpu"):
    """
    Load trained LSTM model from checkpoint
    
    Args:
        path: path to saved model weights (.pt file)
        device: torch device ('cpu' or 'cuda')
        
    Returns:
        model: loaded HeadingLSTM model in eval mode
    """
    model = HeadingLSTM()
    state_dict = torch.load(path, map_location=device)
    model.load_state_dict(state_dict)
    model.eval().to(device)
    return model


def smooth_headings(raw_deg, model_path="models/heading_lstm.pt", device="cpu"):
    """
    Smooth noisy heading measurements using trained LSTM model
    
    Args:
        raw_deg: numpy array of raw heading angles in degrees
        model_path: path to trained model checkpoint
        device: torch device ('cpu' or 'cuda')
        
    Returns:
        smoothed_deg: numpy array of smoothed heading angles in degrees [-180, 180]
    """
    # Convert to radians
    raw_rad = np.radians(raw_deg)
    
    # Load model
    model = load_model(model_path, device)
    
    with torch.no_grad():
        # Convert angles to sin/cos representation
        X = torch.from_numpy(angle_to_vec(raw_rad).astype(np.float32)).unsqueeze(0)
        X = X.to(device)
        
        # Run through model
        Y = model(X)
        
        # Normalize output vectors
        Y = Y / (Y.norm(dim=-1, keepdim=True) + 1e-8)
        
        # Convert back to numpy
        y = Y.squeeze(0).cpu().numpy()
    
    # Convert sin/cos back to angles and wrap to [-180, 180]
    smoothed_rad = vec_to_angle(y)
    smoothed_deg = (np.degrees(smoothed_rad) + 180) % 360 - 180
    
    return smoothed_deg