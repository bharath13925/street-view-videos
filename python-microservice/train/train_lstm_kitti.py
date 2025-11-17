"""
train_lstm_kitti_with_viz.py
Training script for heading LSTM with comprehensive visualization
"""
import sys
import os
import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader
import matplotlib.pyplot as plt
from matplotlib.gridspec import GridSpec
import seaborn as sns

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from models.heading_lstm import HeadingLSTM, angle_to_vec


def heading_from_positions(x, z):
    """Calculate heading angles from x,z trajectory positions"""
    dx = np.diff(x, prepend=x[0])
    dz = np.diff(z, prepend=z[0])
    return np.unwrap(np.arctan2(dx, dz))


def inject_noise(clean_rad, noise_std=2.0):
    """Add Gaussian noise to clean heading angles"""
    clean_deg = np.degrees(clean_rad)
    noisy = clean_deg + np.random.randn(len(clean_deg)) * noise_std
    return np.radians(((noisy + 180) % 360) - 180)


class KittiHeadingPairs(Dataset):
    """Dataset of noisy/clean heading pairs from KITTI odometry"""
    
    def __init__(self, root, seq="00", win_len=60):
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
    """Evaluate model performance on dataset"""
    model.eval()
    total_mae = 0
    total_rmse = 0
    correct_1deg = 0
    correct_2deg = 0
    correct_5deg = 0
    correct_10deg = 0
    n_samples = 0
    
    all_errors = []
    
    with torch.no_grad():
        for xb, yb in dataloader:
            xb, yb = xb.to(device), yb.to(device)
            pred = model(xb)
            pred = pred / (pred.norm(dim=-1, keepdim=True) + 1e-8)
            
            pred_angles = torch.atan2(pred[..., 0], pred[..., 1])
            true_angles = torch.atan2(yb[..., 0], yb[..., 1])
            
            diff = pred_angles - true_angles
            diff = torch.atan2(torch.sin(diff), torch.cos(diff))
            diff_deg = torch.abs(diff) * 180 / np.pi
            
            all_errors.extend(diff_deg.flatten().cpu().numpy())
            
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
        "errors": np.array(all_errors)
    }


def plot_training_history(history, save_path="plots/training_history.png"):
    """Plot comprehensive training history"""
    sns.set_style("darkgrid")
    fig = plt.figure(figsize=(20, 12))
    gs = GridSpec(3, 3, figure=fig, hspace=0.3, wspace=0.3)
    
    epochs = range(1, len(history['train_loss']) + 1)
    
    # 1. Training and Validation Loss
    ax1 = fig.add_subplot(gs[0, 0])
    ax1.plot(epochs, history['train_loss'], 'b-o', linewidth=2, markersize=6, label='Train Loss')
    ax1.plot(epochs, history['val_loss'], 'r-s', linewidth=2, markersize=6, label='Val Loss')
    ax1.set_xlabel('Epoch', fontsize=12, fontweight='bold')
    ax1.set_ylabel('MSE Loss', fontsize=12, fontweight='bold')
    ax1.set_title('Training & Validation Loss', fontsize=14, fontweight='bold')
    ax1.legend(fontsize=10)
    ax1.grid(True, alpha=0.3)
    
    # 2. MAE over epochs
    ax2 = fig.add_subplot(gs[0, 1])
    ax2.plot(epochs, history['val_mae'], 'g-^', linewidth=2, markersize=6, label='Val MAE')
    ax2.axhline(y=min(history['val_mae']), color='r', linestyle='--', 
                label=f'Best: {min(history["val_mae"]):.3f}°')
    ax2.set_xlabel('Epoch', fontsize=12, fontweight='bold')
    ax2.set_ylabel('MAE (degrees)', fontsize=12, fontweight='bold')
    ax2.set_title('Mean Absolute Error', fontsize=14, fontweight='bold')
    ax2.legend(fontsize=10)
    ax2.grid(True, alpha=0.3)
    
    # 3. RMSE over epochs
    ax3 = fig.add_subplot(gs[0, 2])
    ax3.plot(epochs, history['val_rmse'], 'm-d', linewidth=2, markersize=6, label='Val RMSE')
    ax3.axhline(y=min(history['val_rmse']), color='r', linestyle='--', 
                label=f'Best: {min(history["val_rmse"]):.3f}°')
    ax3.set_xlabel('Epoch', fontsize=12, fontweight='bold')
    ax3.set_ylabel('RMSE (degrees)', fontsize=12, fontweight='bold')
    ax3.set_title('Root Mean Squared Error', fontsize=14, fontweight='bold')
    ax3.legend(fontsize=10)
    ax3.grid(True, alpha=0.3)
    
    # 4. Accuracy metrics over epochs
    ax4 = fig.add_subplot(gs[1, :])
    ax4.plot(epochs, history['val_acc_1deg'], 'b-o', linewidth=2, markersize=5, label='Acc@1°')
    ax4.plot(epochs, history['val_acc_2deg'], 'g-s', linewidth=2, markersize=5, label='Acc@2°')
    ax4.plot(epochs, history['val_acc_5deg'], 'r-^', linewidth=2, markersize=5, label='Acc@5°')
    ax4.plot(epochs, history['val_acc_10deg'], 'm-d', linewidth=2, markersize=5, label='Acc@10°')
    ax4.set_xlabel('Epoch', fontsize=12, fontweight='bold')
    ax4.set_ylabel('Accuracy (%)', fontsize=12, fontweight='bold')
    ax4.set_title('Validation Accuracy at Different Thresholds', fontsize=14, fontweight='bold')
    ax4.legend(fontsize=10, ncol=4)
    ax4.grid(True, alpha=0.3)
    ax4.set_ylim([0, 105])
    
    # 5. Learning rate (if available)
    if 'learning_rate' in history:
        ax5 = fig.add_subplot(gs[2, 0])
        ax5.plot(epochs, history['learning_rate'], 'c-o', linewidth=2, markersize=6)
        ax5.set_xlabel('Epoch', fontsize=12, fontweight='bold')
        ax5.set_ylabel('Learning Rate', fontsize=12, fontweight='bold')
        ax5.set_title('Learning Rate Schedule', fontsize=14, fontweight='bold')
        ax5.set_yscale('log')
        ax5.grid(True, alpha=0.3)
    
    # 6. Error improvement
    ax6 = fig.add_subplot(gs[2, 1])
    improvement = [(history['val_mae'][0] - mae) / history['val_mae'][0] * 100 
                   for mae in history['val_mae']]
    ax6.plot(epochs, improvement, 'orange', linewidth=2, marker='o', markersize=6)
    ax6.axhline(y=0, color='k', linestyle='--', alpha=0.5)
    ax6.set_xlabel('Epoch', fontsize=12, fontweight='bold')
    ax6.set_ylabel('Improvement (%)', fontsize=12, fontweight='bold')
    ax6.set_title('MAE Improvement from Initial', fontsize=14, fontweight='bold')
    ax6.grid(True, alpha=0.3)
    
    # 7. Best epoch indicator
    ax7 = fig.add_subplot(gs[2, 2])
    best_epoch = history['val_mae'].index(min(history['val_mae'])) + 1
    metrics_at_best = {
        'MAE': history['val_mae'][best_epoch-1],
        'RMSE': history['val_rmse'][best_epoch-1],
        'Acc@5°': history['val_acc_5deg'][best_epoch-1]
    }
    bars = ax7.bar(metrics_at_best.keys(), metrics_at_best.values(), 
                   color=['#2ecc71', '#3498db', '#e74c3c'], alpha=0.8)
    ax7.set_ylabel('Value', fontsize=12, fontweight='bold')
    ax7.set_title(f'Best Model Metrics (Epoch {best_epoch})', 
                  fontsize=14, fontweight='bold')
    ax7.grid(True, alpha=0.3, axis='y')
    
    for bar in bars:
        height = bar.get_height()
        ax7.text(bar.get_x() + bar.get_width()/2., height,
                f'{height:.2f}', ha='center', va='bottom', fontweight='bold')
    
    plt.suptitle('LSTM Heading Smoothing - Training Analysis', 
                 fontsize=18, fontweight='bold', y=0.995)
    
    os.makedirs(os.path.dirname(save_path), exist_ok=True)
    plt.savefig(save_path, dpi=300, bbox_inches='tight')
    print(f"✓ Training history plot saved to: {save_path}")
    plt.close()


def plot_error_distribution(test_errors, save_path="plots/error_distribution.png"):
    """Plot error distribution analysis"""
    sns.set_style("darkgrid")
    fig, axes = plt.subplots(2, 2, figsize=(16, 12))
    
    # 1. Histogram with KDE
    ax1 = axes[0, 0]
    ax1.hist(test_errors, bins=50, alpha=0.7, color='steelblue', edgecolor='black', density=True)
    from scipy import stats
    kde = stats.gaussian_kde(test_errors)
    x_range = np.linspace(0, max(test_errors), 200)
    ax1.plot(x_range, kde(x_range), 'r-', linewidth=2, label='KDE')
    ax1.axvline(np.mean(test_errors), color='orange', linestyle='--', 
                linewidth=2, label=f'Mean: {np.mean(test_errors):.3f}°')
    ax1.axvline(np.median(test_errors), color='green', linestyle='--', 
                linewidth=2, label=f'Median: {np.median(test_errors):.3f}°')
    ax1.set_xlabel('Absolute Error (degrees)', fontsize=12, fontweight='bold')
    ax1.set_ylabel('Density', fontsize=12, fontweight='bold')
    ax1.set_title('Error Distribution with KDE', fontsize=14, fontweight='bold')
    ax1.legend(fontsize=10)
    ax1.grid(True, alpha=0.3)
    
    # 2. Cumulative distribution
    ax2 = axes[0, 1]
    sorted_errors = np.sort(test_errors)
    cumulative = np.arange(1, len(sorted_errors) + 1) / len(sorted_errors) * 100
    ax2.plot(sorted_errors, cumulative, 'b-', linewidth=2)
    ax2.axhline(y=50, color='r', linestyle='--', alpha=0.5, label='50th percentile')
    ax2.axhline(y=90, color='g', linestyle='--', alpha=0.5, label='90th percentile')
    ax2.axhline(y=95, color='orange', linestyle='--', alpha=0.5, label='95th percentile')
    ax2.set_xlabel('Absolute Error (degrees)', fontsize=12, fontweight='bold')
    ax2.set_ylabel('Cumulative Percentage (%)', fontsize=12, fontweight='bold')
    ax2.set_title('Cumulative Error Distribution', fontsize=14, fontweight='bold')
    ax2.legend(fontsize=10)
    ax2.grid(True, alpha=0.3)
    
    # 3. Box plot with statistics
    ax3 = axes[1, 0]
    bp = ax3.boxplot([test_errors], vert=True, patch_artist=True, widths=0.5)
    bp['boxes'][0].set_facecolor('lightblue')
    bp['boxes'][0].set_alpha(0.7)
    ax3.set_ylabel('Absolute Error (degrees)', fontsize=12, fontweight='bold')
    ax3.set_title('Error Statistics', fontsize=14, fontweight='bold')
    ax3.set_xticklabels(['Test Set'])
    ax3.grid(True, alpha=0.3, axis='y')
    
    # Add statistics text
    stats_text = f"""Statistics:
Mean: {np.mean(test_errors):.3f}°
Median: {np.median(test_errors):.3f}°
Std: {np.std(test_errors):.3f}°
Min: {np.min(test_errors):.3f}°
Max: {np.max(test_errors):.3f}°
Q1: {np.percentile(test_errors, 25):.3f}°
Q3: {np.percentile(test_errors, 75):.3f}°"""
    ax3.text(1.3, np.median(test_errors), stats_text, fontsize=10,
             bbox=dict(boxstyle='round', facecolor='wheat', alpha=0.5))
    
    # 4. Percentile bars
    ax4 = axes[1, 1]
    percentiles = [50, 75, 90, 95, 99]
    values = [np.percentile(test_errors, p) for p in percentiles]
    bars = ax4.bar([f'{p}th' for p in percentiles], values, 
                   color=['#2ecc71', '#3498db', '#f39c12', '#e74c3c', '#9b59b6'], 
                   alpha=0.8)
    ax4.set_ylabel('Error (degrees)', fontsize=12, fontweight='bold')
    ax4.set_xlabel('Percentile', fontsize=12, fontweight='bold')
    ax4.set_title('Error at Different Percentiles', fontsize=14, fontweight='bold')
    ax4.grid(True, alpha=0.3, axis='y')
    
    for bar in bars:
        height = bar.get_height()
        ax4.text(bar.get_x() + bar.get_width()/2., height,
                f'{height:.2f}°', ha='center', va='bottom', fontweight='bold')
    
    plt.suptitle('Test Set Error Analysis', fontsize=18, fontweight='bold', y=0.995)
    plt.tight_layout()
    
    os.makedirs(os.path.dirname(save_path), exist_ok=True)
    plt.savefig(save_path, dpi=300, bbox_inches='tight')
    print(f"✓ Error distribution plot saved to: {save_path}")
    plt.close()


def plot_sample_predictions(model, test_dl, device, save_path="plots/sample_predictions.png"):
    """Plot sample predictions showing noisy input, ground truth, and prediction"""
    sns.set_style("darkgrid")
    model.eval()
    
    # Get a batch
    xb, yb = next(iter(test_dl))
    xb, yb = xb.to(device), yb.to(device)
    
    with torch.no_grad():
        pred = model(xb)
        pred = pred / (pred.norm(dim=-1, keepdim=True) + 1e-8)
    
    # Convert to angles
    noisy_angles = torch.atan2(xb[..., 0], xb[..., 1]).cpu().numpy() * 180 / np.pi
    true_angles = torch.atan2(yb[..., 0], yb[..., 1]).cpu().numpy() * 180 / np.pi
    pred_angles = torch.atan2(pred[..., 0], pred[..., 1]).cpu().numpy() * 180 / np.pi
    
    # Plot 4 samples
    fig, axes = plt.subplots(2, 2, figsize=(18, 12))
    axes = axes.flatten()
    
    for i in range(min(4, xb.size(0))):
        ax = axes[i]
        timesteps = range(len(noisy_angles[i]))
        
        ax.plot(timesteps, noisy_angles[i], 'r-', alpha=0.5, linewidth=1, 
                label='Noisy Input', marker='o', markersize=3)
        ax.plot(timesteps, true_angles[i], 'g-', linewidth=2, 
                label='Ground Truth', marker='s', markersize=3)
        ax.plot(timesteps, pred_angles[i], 'b--', linewidth=2, 
                label='LSTM Prediction', marker='^', markersize=3)
        
        # Calculate error
        error = np.abs(pred_angles[i] - true_angles[i])
        mae = np.mean(error)
        
        ax.set_xlabel('Time Step', fontsize=11, fontweight='bold')
        ax.set_ylabel('Heading (degrees)', fontsize=11, fontweight='bold')
        ax.set_title(f'Sample {i+1} - MAE: {mae:.3f}°', fontsize=13, fontweight='bold')
        ax.legend(fontsize=9, loc='best')
        ax.grid(True, alpha=0.3)
        
        # Add shaded error region
        ax.fill_between(timesteps, pred_angles[i] - error, pred_angles[i] + error, 
                        alpha=0.2, color='orange', label='Error Range')
    
    plt.suptitle('Sample Predictions: Noisy Input → LSTM Smoothing', 
                 fontsize=18, fontweight='bold')
    plt.tight_layout()
    
    os.makedirs(os.path.dirname(save_path), exist_ok=True)
    plt.savefig(save_path, dpi=300, bbox_inches='tight')
    print(f"✓ Sample predictions plot saved to: {save_path}")
    plt.close()


def train(root, out="models/heading_lstm.pt", epochs=5, device="cpu"):
    """Train heading LSTM model with comprehensive visualization"""
    print("="*70)
    print("TRAINING HEADING LSTM ON KITTI DATASET")
    print("="*70)
    
    # Create dataset
    print("\n[1/6] Loading dataset...")
    ds = KittiHeadingPairs(root)
    print(f"      Total samples: {len(ds)}")
    
    # Split into train/val/test
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
    print("\n[2/6] Initializing model...")
    model = HeadingLSTM().to(device)
    opt = torch.optim.AdamW(model.parameters(), lr=1e-3)
    loss_fn = nn.MSELoss()
    print(f"      Device: {device}")
    print(f"      Parameters: {sum(p.numel() for p in model.parameters()):,}")
    
    # Training history
    history = {
        'train_loss': [],
        'val_loss': [],
        'val_mae': [],
        'val_rmse': [],
        'val_acc_1deg': [],
        'val_acc_2deg': [],
        'val_acc_5deg': [],
        'val_acc_10deg': []
    }
    
    best_val_mae = float('inf')
    
    print(f"\n[3/6] Training for {epochs} epochs...")
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
        model.eval()
        val_loss_sum = 0
        with torch.no_grad():
            for xb, yb in val_dl:
                xb, yb = xb.to(device), yb.to(device)
                pred = model(xb)
                pred = pred / (pred.norm(dim=-1, keepdim=True) + 1e-8)
                loss = loss_fn(pred, yb)
                val_loss_sum += loss.item() * xb.size(0)
        
        val_loss = val_loss_sum / len(val_ds)
        val_metrics = evaluate(model, val_dl, device)
        
        # Store history
        history['train_loss'].append(train_loss)
        history['val_loss'].append(val_loss)
        history['val_mae'].append(val_metrics['MAE'])
        history['val_rmse'].append(val_metrics['RMSE'])
        history['val_acc_1deg'].append(val_metrics['Acc@1deg'])
        history['val_acc_2deg'].append(val_metrics['Acc@2deg'])
        history['val_acc_5deg'].append(val_metrics['Acc@5deg'])
        history['val_acc_10deg'].append(val_metrics['Acc@10deg'])
        
        print(f"Epoch {ep+1}/{epochs}:")
        print(f"  Train Loss:  {train_loss:.6f}")
        print(f"  Val Loss:    {val_loss:.6f}")
        print(f"  Val MAE:     {val_metrics['MAE']:.3f}°")
        print(f"  Val RMSE:    {val_metrics['RMSE']:.3f}°")
        print(f"  Val Acc@5°:  {val_metrics['Acc@5deg']:.2f}%")
        
        if val_metrics['MAE'] < best_val_mae:
            best_val_mae = val_metrics['MAE']
            os.makedirs(os.path.dirname(out), exist_ok=True)
            torch.save(model.state_dict(), out)
            print(f"  ✓ Best model saved! (MAE: {best_val_mae:.3f}°)")
        print()
    
    # Load best model
    print("[4/6] Loading best model for final evaluation...")
    model.load_state_dict(torch.load(out, map_location=device))
    
    # Final test evaluation
    print("\n[5/6] Final Test Set Evaluation")
    print("="*70)
    test_metrics = evaluate(model, test_dl, device)
    
    print(f"Test MAE:              {test_metrics['MAE']:.3f}°")
    print(f"Test RMSE:             {test_metrics['RMSE']:.3f}°")
    print(f"Test Accuracy @1°:     {test_metrics['Acc@1deg']:.2f}%")
    print(f"Test Accuracy @2°:     {test_metrics['Acc@2deg']:.2f}%")
    print(f"Test Accuracy @5°:     {test_metrics['Acc@5deg']:.2f}%")
    print(f"Test Accuracy @10°:    {test_metrics['Acc@10deg']:.2f}%")
    print("="*70)
    
    # Generate visualizations
    print("\n[6/6] Generating visualizations...")
    plot_training_history(history)
    plot_error_distribution(test_metrics['errors'])
    plot_sample_predictions(model, test_dl, device)
    
    print(f"\n✓ Training complete! Model saved to: {out}")
    print("✓ All visualization plots saved to: plots/")
    
    return model, test_metrics


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Train Heading LSTM with Visualization")
    parser.add_argument("--data", default="data/kitti", 
                        help="Path to KITTI dataset root")
    parser.add_argument("--out", default="models/heading_lstm.pt", 
                        help="Output model path")
    parser.add_argument("--epochs", type=int, default=5, 
                        help="Number of training epochs")
    parser.add_argument("--device", default="cpu", 
                        help="Device (cpu or cuda)")
    
    args = parser.parse_args()
    
    if args.device == "cuda" and not torch.cuda.is_available():
        print("Warning: CUDA not available, using CPU")
        args.device = "cpu"
    
    train(args.data, args.out, args.epochs, args.device)