import sys, os, numpy as np, torch, torch.nn as nn
from torch.utils.data import Dataset, DataLoader
from models.heading_lstm import HeadingLSTM, angle_to_vec

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

def heading_from_positions(x, z):
    dx = np.diff(x, prepend=x[0])
    dz = np.diff(z, prepend=z[0])
    return np.unwrap(np.arctan2(dx, dz))

def inject_noise(clean_rad):
    clean_deg = np.degrees(clean_rad)
    noisy = clean_deg + np.random.randn(len(clean_deg)) * 2.0
    return np.radians(((noisy + 180) % 360) - 180)

class KittiHeadingPairs(Dataset):
    def __init__(self, root, seq="00", win_len=60):
        poses = np.loadtxt(os.path.join(root, "poses", f"{seq}.txt"))
        xyz = poses[:, [3,7,11]]
        clean = heading_from_positions(xyz[:,0], xyz[:,2])
        noisy = inject_noise(clean)
        self.samples = [
            (noisy[i:i+win_len], clean[i:i+win_len])
            for i in range(len(clean)-win_len)
        ]

    def __len__(self): return len(self.samples)

    def __getitem__(self, i):
        n, c = self.samples[i]
        return torch.from_numpy(angle_to_vec(n).astype(np.float32)), \
               torch.from_numpy(angle_to_vec(c).astype(np.float32))

def train(root, out="models/heading_lstm.pt"):
    ds = KittiHeadingPairs(root)
    dl = DataLoader(ds, batch_size=32, shuffle=True)
    model = HeadingLSTM()
    opt = torch.optim.AdamW(model.parameters(), 1e-3)
    loss_fn = nn.MSELoss()

    for ep in range(5):
        loss_sum = 0
        for xb, yb in dl:
            pred = model(xb)
            pred = pred / (pred.norm(dim=-1, keepdim=True) + 1e-8)
            loss = loss_fn(pred, yb)
            opt.zero_grad(); loss.backward(); opt.step()
            loss_sum += loss.item() * xb.size(0)
        print(f"Epoch {ep+1}: {loss_sum/len(ds):.6f}")

    torch.save(model.state_dict(), out)
    print("Saved", out)

if __name__=="__main__":
    train("data/kitti")
