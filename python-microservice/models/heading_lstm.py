"""
heading_lstm.py
LSTM model for heading angle smoothing using sin/cos representation
"""
import torch
import torch.nn as nn
import numpy as np


class HeadingLSTM(nn.Module):
    """LSTM network for smoothing heading angles"""
    
    def __init__(self, hidden_size=64, num_layers=2):
        super().__init__()
        self.lstm = nn.LSTM(
            input_size=2,  # sin, cos representation
            hidden_size=hidden_size,
            num_layers=num_layers,
            batch_first=True
        )
        self.head = nn.Linear(hidden_size, 2)  # Output: sin, cos

    def forward(self, x):
        """
        Forward pass
        Args:
            x: (batch, seq_len, 2) tensor of sin/cos values
        Returns:
            (batch, seq_len, 2) tensor of predicted sin/cos values
        """
        y, _ = self.lstm(x)
        return self.head(y)


def angle_to_vec(rad):
    """
    Convert angles in radians to sin/cos vector representation
    Args:
        rad: numpy array of angles in radians
    Returns:
        numpy array of shape (..., 2) with [sin, cos] values
    """
    return np.stack([np.sin(rad), np.cos(rad)], axis=-1)


def vec_to_angle(sin_cos):
    """
    Convert sin/cos vector representation back to angles
    Args:
        sin_cos: numpy array of shape (..., 2) with [sin, cos] values
    Returns:
        numpy array of angles in radians
    """
    return np.arctan2(sin_cos[..., 0], sin_cos[..., 1])