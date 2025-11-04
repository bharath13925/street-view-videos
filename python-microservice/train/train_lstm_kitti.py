"""
train_lstm_kitti.py
Training script for heading LSTM using KITTI odometry dataset
"""
import sys
import os
import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from models.heading_lstm import HeadingLSTM, angle_to_vec


def heading_from_positions(x, z):
    """
    Calculate heading angles from x,z trajectory positions
    
    Args:
        x: array of x positions
        z: array of z positions
        
    Returns:
        heading angles in radians (unwrapped)
    """
    dx = np.diff(x, prepend=x[0])
    dz = np.diff(z, prepend=z[0])
    return np.unwrap(np.arctan2(dx, dz))


def inject_noise(clean_rad, noise_std=2.0):
    """
    Add Gaussian noise to clean heading angles
    
    Args:
        clean_rad: clean heading angles in radians
        noise_std: standard deviation of noise in degrees
        
    Returns:
        noisy heading angles in radians
    """
    clean_deg = np.degrees(clean_rad)
    noisy = clean_deg + np.random.randn(len(clean_deg)) * noise_std
    return np.radians(((noisy + 180) % 360) - 180)


class KittiHeadingPairs(Dataset):
    """Dataset of noisy/clean heading pairs from KITTI odometry"""
    
    def __init__(self, root, seq="00", win_len=60):
        """
        Args:
            root: path to KITTI dataset root
            seq: KITTI sequence number (e.g., "00", "01", ...)
            win_len: window length for sequence samples
        """
        poses = np.loadtxt(os.path.join(root, "poses", f"{seq}.txt"))
        xyz = poses[:, [3, 7, 11]]
        clean = heading_from_positions(xyz[:, 0], xyz[:, 2])
        noisy = inject_noise(clean)
        self.samples = [
            (noisy[i:i+win_len], clean[i:i+win_len])
            for i in range(len(clean) - win_len)
        ]

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, i):
        n, c = self.samples[i]
        return torch.from_numpy(angle_to_vec(n).astype(np.float32)), \
               torch.from_numpy(angle_to_vec(c).astype(np.float32))


def evaluate(model, dataloader, device="cpu"):
    """
    Evaluate model performance on dataset
    
    Args:
        model: HeadingLSTM model
        dataloader: DataLoader for evaluation
        device: torch device
        
    Returns:
        dict: Dictionary containing MAE, RMSE, and accuracy metrics
    """
    model.eval()
    total_mae = 0  # Mean Absolute Error in degrees
    total_rmse = 0  # Root Mean Squared Error in degrees
    correct_1deg = 0
    correct_2deg = 0
    correct_5deg = 0
    correct_10deg = 0
    n_samples = 0
    
    with torch.no_grad():
        for xb, yb in dataloader:
            xb, yb = xb.to(device), yb.to(device)
            pred = model(xb)
            pred = pred / (pred.norm(dim=-1, keepdim=True) + 1e-8)
            
            # Convert back to angles for meaningful metrics
            pred_angles = torch.atan2(pred[..., 0], pred[..., 1])
            true_angles = torch.atan2(yb[..., 0], yb[..., 1])
            
            # Angular difference (handling wrap-around)
            diff = pred_angles - true_angles
            diff = torch.atan2(torch.sin(diff), torch.cos(diff))  # wrap to [-π, π]
            diff_deg = torch.abs(diff) * 180 / np.pi
            
            total_mae += diff_deg.sum().item()
            total_rmse += (diff_deg ** 2).sum().item()
            correct_1deg += (diff_deg < 1).sum().item()
            correct_2deg += (diff_deg < 2).sum().item()
            correct_5deg += (diff_deg < 5).sum().item()
            correct_10deg += (diff_deg < 10).sum().item()
            n_samples += diff_deg.numel()
    
    mae = total_mae / n_samples
    rmse = np.sqrt(total_rmse / n_samples)
    acc_1deg = 100 * correct_1deg / n_samples
    acc_2deg = 100 * correct_2deg / n_samples
    acc_5deg = 100 * correct_5deg / n_samples
    acc_10deg = 100 * correct_10deg / n_samples
    
    return {
        "MAE": mae,
        "RMSE": rmse,
        "Acc@1deg": acc_1deg,
        "Acc@2deg": acc_2deg,
        "Acc@5deg": acc_5deg,
        "Acc@10deg": acc_10deg,
    }


def train(root, out="models/heading_lstm.pt", epochs=5, device="cpu"):
    """
    Train heading LSTM model with train/val/test split
    
    Args:
        root: path to KITTI dataset root directory
        out: output path for trained model
        epochs: number of training epochs
        device: torch device (cpu or cuda)
        
    Returns:
        model: trained model
        test_metrics: dictionary of test set metrics
    """
    print("="*70)
    print("TRAINING HEADING LSTM ON KITTI DATASET")
    print("="*70)
    
    # Create full dataset
    print("\n[1/5] Loading dataset...")
    ds = KittiHeadingPairs(root)
    print(f"      Total samples: {len(ds)}")
    
    # Split into train/val/test (70/15/15)
    n = len(ds)
    train_size = int(0.7 * n)
    val_size = int(0.15 * n)
    test_size = n - train_size - val_size
    
    train_ds, val_ds, test_ds = torch.utils.data.random_split(
        ds, [train_size, val_size, test_size],
        generator=torch.Generator().manual_seed(42)
    )
    
    print(f"      Train: {train_size} | Val: {val_size} | Test: {test_size}")
    
    train_dl = DataLoader(train_ds, batch_size=32, shuffle=True)
    val_dl = DataLoader(val_ds, batch_size=32, shuffle=False)
    test_dl = DataLoader(test_ds, batch_size=32, shuffle=False)
    
    # Initialize model
    print("\n[2/5] Initializing model...")
    model = HeadingLSTM().to(device)
    opt = torch.optim.AdamW(model.parameters(), lr=1e-3)
    loss_fn = nn.MSELoss()
    print(f"      Device: {device}")
    print(f"      Parameters: {sum(p.numel() for p in model.parameters()):,}")
    
    best_val_mae = float('inf')
    
    print(f"\n[3/5] Training for {epochs} epochs...")
    print("-"*70)
    
    for ep in range(epochs):
        # Training phase
        model.train()
        loss_sum = 0
        for xb, yb in train_dl:
            xb, yb = xb.to(device), yb.to(device)
            pred = model(xb)
            pred = pred / (pred.norm(dim=-1, keepdim=True) + 1e-8)
            loss = loss_fn(pred, yb)
            opt.zero_grad()
            loss.backward()
            opt.step()
            loss_sum += loss.item() * xb.size(0)
        
        train_loss = loss_sum / len(train_ds)
        
        # Validation phase
        val_metrics = evaluate(model, val_dl, device)
        
        print(f"Epoch {ep+1}/{epochs}:")
        print(f"  Train Loss:  {train_loss:.6f}")
        print(f"  Val MAE:     {val_metrics['MAE']:.3f}°")
        print(f"  Val RMSE:    {val_metrics['RMSE']:.3f}°")
        print(f"  Val Acc@5°:  {val_metrics['Acc@5deg']:.2f}%")
        
        # Save best model
        if val_metrics['MAE'] < best_val_mae:
            best_val_mae = val_metrics['MAE']
            os.makedirs(os.path.dirname(out), exist_ok=True)
            torch.save(model.state_dict(), out)
            print(f"  ✓ Best model saved! (MAE: {best_val_mae:.3f}°)")
        print()
    
    # Load best model for testing
    print("[4/5] Loading best model for final evaluation...")
    model.load_state_dict(torch.load(out, map_location=device))
    
    # Final test evaluation
    print("\n[5/5] Final Test Set Evaluation")
    print("="*70)
    test_metrics = evaluate(model, test_dl, device)
    
    print(f"Test MAE:              {test_metrics['MAE']:.3f}°")
    print(f"Test RMSE:             {test_metrics['RMSE']:.3f}°")
    print(f"Test Accuracy @1°:     {test_metrics['Acc@1deg']:.2f}%")
    print(f"Test Accuracy @2°:     {test_metrics['Acc@2deg']:.2f}%")
    print(f"Test Accuracy @5°:     {test_metrics['Acc@5deg']:.2f}%")
    print(f"Test Accuracy @10°:    {test_metrics['Acc@10deg']:.2f}%")
    print("="*70)
    print(f"\n✓ Training complete! Model saved to: {out}")
    
    return model, test_metrics


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Train Heading LSTM on KITTI")
    parser.add_argument("--data", default="data/kitti", 
                        help="Path to KITTI dataset root")
    parser.add_argument("--out", default="models/heading_lstm.pt", 
                        help="Output model path")
    parser.add_argument("--epochs", type=int, default=5, 
                        help="Number of training epochs")
    parser.add_argument("--device", default="cpu", 
                        help="Device (cpu or cuda)")
    
    args = parser.parse_args()
    
    # Check if CUDA is available
    if args.device == "cuda" and not torch.cuda.is_available():
        print("Warning: CUDA not available, using CPU")
        args.device = "cpu"
    
    train(args.data, args.out, args.epochs, args.device)