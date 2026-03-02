"""
B.3 - Price Anomaly Detection
Detects unusually high or low prices per product.

Uses Isolation Forest (scikit-learn) per product group.

Input: exports/prices/price_history.csv
Output: models/prices/price_models.pkl
        models/prices/price_stats.json

Usage: python train_price_anomaly.py
"""

import os
import sys
import json

import pandas as pd
import numpy as np
import joblib

SCRIPT_DIR = os.path.dirname(__file__)
EXPORTS_DIR = os.path.join(SCRIPT_DIR, "..", "exports", "prices")
MODELS_DIR = os.path.join(SCRIPT_DIR, "..", "models", "prices")

os.makedirs(MODELS_DIR, exist_ok=True)

MIN_SAMPLES = 10  # Minimum sales for a product to train a model


def load_data() -> pd.DataFrame:
    path = os.path.join(EXPORTS_DIR, "price_history.csv")
    if not os.path.exists(path):
        print("ERROR: Run export_all.py first")
        sys.exit(1)
    return pd.read_csv(path, parse_dates=["sale_date"])


def train_models(df: pd.DataFrame):
    """Train Isolation Forest per product with enough data."""
    from sklearn.ensemble import IsolationForest

    models = {}
    stats = {}
    total_anomalies = 0

    for product_id, group in df.groupby("productId"):
        # Need at least MIN_SAMPLES records
        features = group[["sale_price", "margin_pct", "discount_pct"]].dropna()
        if len(features) < MIN_SAMPLES:
            continue

        product_id = int(product_id)

        # Train Isolation Forest
        model = IsolationForest(
            contamination=0.05,  # Expect ~5% anomalies
            random_state=42,
            n_estimators=100,
        )
        predictions = model.fit_predict(features)

        # Count anomalies (-1 = anomaly, 1 = normal)
        anomaly_count = int((predictions == -1).sum())
        total_anomalies += anomaly_count

        # Save model
        models[product_id] = model

        # Compute per-product stats for the API
        stats[str(product_id)] = {
            "product_name": group["product_name"].iloc[0],
            "n_samples": len(features),
            "n_anomalies": anomaly_count,
            "price_mean": round(float(features["sale_price"].mean()), 2),
            "price_std": round(float(features["sale_price"].std()), 2),
            "price_min": round(float(features["sale_price"].min()), 2),
            "price_max": round(float(features["sale_price"].max()), 2),
            "price_p5": round(float(features["sale_price"].quantile(0.05)), 2),
            "price_p95": round(float(features["sale_price"].quantile(0.95)), 2),
            "margin_mean": round(float(features["margin_pct"].mean()), 4)
            if not features["margin_pct"].isna().all()
            else None,
        }

    return models, stats, total_anomalies


def main():
    print("=" * 60)
    print("B.3 - Price Anomaly Detection")
    print("=" * 60)

    df = load_data()
    print(f"Total price records: {len(df)}")
    print(f"Products with data: {df['productId'].nunique()}")

    models, stats, total_anomalies = train_models(df)

    # Save models
    models_path = os.path.join(MODELS_DIR, "price_models.pkl")
    joblib.dump(models, models_path)

    # Save stats
    stats_path = os.path.join(MODELS_DIR, "price_stats.json")
    with open(stats_path, "w", encoding="utf-8") as f:
        json.dump(stats, f, indent=2, ensure_ascii=False)

    print(f"\nTrained models for {len(models)} products")
    print(f"Total anomalies detected: {total_anomalies}")
    print(f"Models saved to: {models_path}")
    print(f"Stats saved to: {stats_path}")

    # Print products with most anomalies
    by_anomalies = sorted(stats.items(), key=lambda x: x[1]["n_anomalies"], reverse=True)
    print("\nTop 10 products by anomaly count:")
    for pid, s in by_anomalies[:10]:
        print(
            f"  Product {pid} ({s['product_name']}): "
            f"{s['n_anomalies']}/{s['n_samples']} anomalies, "
            f"price range S/{s['price_min']:.2f}-{s['price_max']:.2f}"
        )


if __name__ == "__main__":
    main()
