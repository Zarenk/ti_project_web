"""
B.5 - Client RFM Segmentation
Groups clients by value using Recency, Frequency, Monetary (RFM) analysis.

Uses K-Means clustering (scikit-learn, CPU).

Input: exports/clients/rfm.csv
Output: models/clients/segmentation_model.pkl
        models/clients/segments.json

Usage: python train_client_segmentation.py
"""

import os
import sys
import json

import pandas as pd
import numpy as np
import joblib
from datetime import datetime

SCRIPT_DIR = os.path.dirname(__file__)
EXPORTS_DIR = os.path.join(SCRIPT_DIR, "..", "exports", "clients")
MODELS_DIR = os.path.join(SCRIPT_DIR, "..", "models", "clients")

os.makedirs(MODELS_DIR, exist_ok=True)

SEGMENT_NAMES = {
    0: "VIP",
    1: "Frecuente",
    2: "En riesgo",
    3: "Perdido",
}

N_CLUSTERS = 4


def load_data() -> pd.DataFrame:
    path = os.path.join(EXPORTS_DIR, "rfm.csv")
    if not os.path.exists(path):
        print("ERROR: Run export_all.py first")
        sys.exit(1)
    return pd.read_csv(path, parse_dates=["last_purchase", "first_purchase"])


def compute_rfm(df: pd.DataFrame) -> pd.DataFrame:
    """Compute RFM features."""
    df = df.copy()
    now = datetime.now()

    # Recency: days since last purchase
    df["recency_days"] = (now - df["last_purchase"]).dt.days

    # Frequency is already in the data
    # Monetary is already in the data

    # Lifetime: days since first purchase
    df["lifetime_days"] = (now - df["first_purchase"]).dt.days

    # Average order value is already in the data
    return df


def train_segmentation(df: pd.DataFrame):
    """Train K-Means clustering on RFM features."""
    from sklearn.cluster import KMeans
    from sklearn.preprocessing import StandardScaler
    from sklearn.metrics import silhouette_score

    # Select features
    feature_cols = ["recency_days", "frequency", "monetary", "avg_order_value"]
    features = df[feature_cols].copy()

    # Handle NaN
    features = features.fillna(0)

    if len(features) < N_CLUSTERS:
        print(f"ERROR: Need at least {N_CLUSTERS} clients, got {len(features)}")
        return None, None, None

    # Scale features
    scaler = StandardScaler()
    X = scaler.fit_transform(features)

    # Find optimal number of clusters (2-6) using silhouette score
    best_k = N_CLUSTERS
    best_score = -1

    if len(features) > 10:
        for k in range(2, min(7, len(features))):
            kmeans = KMeans(n_clusters=k, random_state=42, n_init=10)
            labels = kmeans.fit_predict(X)
            score = silhouette_score(X, labels)
            print(f"  k={k}: silhouette={score:.3f}")
            if score > best_score:
                best_score = score
                best_k = k

    print(f"\nBest k={best_k} (silhouette={best_score:.3f})")

    # Train final model
    kmeans = KMeans(n_clusters=best_k, random_state=42, n_init=10)
    df["segment"] = kmeans.fit_predict(X)

    # Label segments based on cluster centroids
    # Sort by monetary value (descending) to assign meaningful labels
    centroids = pd.DataFrame(
        scaler.inverse_transform(kmeans.cluster_centers_),
        columns=feature_cols,
    )
    centroids["cluster"] = range(best_k)
    centroids = centroids.sort_values("monetary", ascending=False)

    # Map cluster IDs to segment names
    label_map = {}
    names = list(SEGMENT_NAMES.values())[:best_k]
    for i, (_, row) in enumerate(centroids.iterrows()):
        label_map[int(row["cluster"])] = names[i] if i < len(names) else f"Grupo {i + 1}"

    df["segment_name"] = df["segment"].map(label_map)

    return kmeans, scaler, label_map


def main():
    print("=" * 60)
    print("B.5 - Client RFM Segmentation")
    print("=" * 60)

    df = load_data()
    print(f"Total clients: {len(df)}")

    df = compute_rfm(df)
    kmeans, scaler, label_map = train_segmentation(df)

    if kmeans is None:
        print("\nTraining failed - not enough clients")
        return

    # Save model + scaler
    model_path = os.path.join(MODELS_DIR, "segmentation_model.pkl")
    joblib.dump({"kmeans": kmeans, "scaler": scaler, "label_map": label_map}, model_path)

    # Save segment results
    segments = {}
    for segment_id, segment_name in label_map.items():
        segment_df = df[df["segment"] == segment_id]
        segments[segment_name] = {
            "count": int(len(segment_df)),
            "avg_recency_days": round(float(segment_df["recency_days"].mean()), 1),
            "avg_frequency": round(float(segment_df["frequency"].mean()), 1),
            "avg_monetary": round(float(segment_df["monetary"].mean()), 2),
            "avg_order_value": round(float(segment_df["avg_order_value"].mean()), 2),
            "clients": segment_df[["client_id", "client_name", "frequency", "monetary", "recency_days"]]
            .sort_values("monetary", ascending=False)
            .head(20)
            .to_dict("records"),
        }

    segments_path = os.path.join(MODELS_DIR, "segments.json")
    with open(segments_path, "w", encoding="utf-8") as f:
        json.dump(segments, f, indent=2, ensure_ascii=False, default=str)

    print(f"\nModel saved to: {model_path}")
    print(f"Segments saved to: {segments_path}")

    print("\nSegment summary:")
    for name, data in segments.items():
        print(
            f"  {name}: {data['count']} clients, "
            f"avg S/{data['avg_monetary']:.2f} total, "
            f"{data['avg_frequency']:.1f} purchases, "
            f"{data['avg_recency_days']:.0f} days since last"
        )


if __name__ == "__main__":
    main()
