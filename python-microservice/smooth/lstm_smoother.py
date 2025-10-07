import numpy as np, torch
from models.heading_lstm import HeadingLSTM, angle_to_vec, vec_to_angle

def load_model(path="models/heading_lstm.pt", device="cpu"):
    model = HeadingLSTM()
    state_dict = torch.load(path, map_location=device)  # ✅ fixed
    model.load_state_dict(state_dict)
    model.eval().to(device)
    return model

def smooth_headings(raw_deg, model_path="models/heading_lstm.pt"):
    raw_rad = np.radians(raw_deg)
    model = load_model(model_path)
    with torch.no_grad():
        X = torch.from_numpy(angle_to_vec(raw_rad).astype(np.float32)).unsqueeze(0)
        Y = model(X)
        Y = Y / (Y.norm(dim=-1, keepdim=True) + 1e-8)
        y = Y.squeeze(0).cpu().numpy()
    return (np.degrees(vec_to_angle(y)) + 180) % 360 - 180
