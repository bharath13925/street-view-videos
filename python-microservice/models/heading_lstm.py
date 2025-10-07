import torch
import torch.nn as nn
import numpy as np

class HeadingLSTM(nn.Module):
    def __init__(self, hidden_size=64, num_layers=2):
        super().__init__()
        self.lstm = nn.LSTM(input_size=2, hidden_size=hidden_size,
                            num_layers=num_layers, batch_first=True)
        self.head = nn.Linear(hidden_size, 2)

    def forward(self, x):
        y, _ = self.lstm(x)
        return self.head(y)

def angle_to_vec(rad):
    return np.stack([np.sin(rad), np.cos(rad)], axis=-1)

def vec_to_angle(sin_cos):
    return np.arctan2(sin_cos[...,0], sin_cos[...,1])
