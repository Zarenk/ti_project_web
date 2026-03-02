"""
B.1 - Demand Forecasting per Product
Predicts units sold per product for the next 7 days.

Uses Prophet (CPU) for products with enough history.
Falls back to simple moving average for products with sparse data.

Input: exports/demand/daily_demand.csv
Output: models/demand/forecast_models.pkl
        models/demand/forecast_results.json

Usage: python train_demand_forecast.py
"""

import os
import sys
import json
import warnings

import pandas as pd
import numpy as np
from datetime import datetime, timedelta

warnings.filterwarnings("ignore")

SCRIPT_DIR = os.path.dirname(__file__)
EXPORTS_DIR = os.path.join(SCRIPT_DIR, "..", "exports", "demand")
MODELS_DIR = os.path.join(SCRIPT_DIR, "..", "models", "demand")

os.makedirs(MODELS_DIR, exist_ok=True)


def load_data() -> pd.DataFrame:
    path = os.path.join(EXPORTS_DIR, "daily_demand.csv")
    if not os.path.exists(path):
        print("ERROR: Run export_all.py first")
        sys.exit(1)
    df = pd.read_csv(path, parse_dates=["sale_date"])
    return df


def add_peru_features(df: pd.DataFrame) -> pd.DataFrame:
    """Add Peru-specific features: quincena (payday), holidays."""
    df = df.copy()
    df["is_quincena"] = df["day_of_month"].apply(
        lambda d: 1 if d in [14, 15, 16, 28, 29, 30, 31, 1] else 0
    )
    df["is_weekend"] = df["day_of_week"].apply(lambda d: 1 if d in [0, 6] else 0)
    return df


def train_prophet_model(product_df: pd.DataFrame, product_id: int):
    """Train a Prophet model for a single product."""
    try:
        from prophet import Prophet
    except ImportError:
        print("  Prophet not installed. pip install prophet")
        return None

    # Prophet expects 'ds' and 'y' columns
    ts = product_df.groupby("sale_date")["units_sold"].sum().reset_index()
    ts.columns = ["ds", "y"]

    # Fill missing dates with 0 sales
    date_range = pd.date_range(ts["ds"].min(), ts["ds"].max(), freq="D")
    ts = ts.set_index("ds").reindex(date_range, fill_value=0).reset_index()
    ts.columns = ["ds", "y"]

    if len(ts) < 14:
        return None

    # Add Peru features
    ts["is_quincena"] = ts["ds"].dt.day.apply(
        lambda d: 1 if d in [14, 15, 16, 28, 29, 30, 31, 1] else 0
    )

    model = Prophet(
        weekly_seasonality=True,
        yearly_seasonality=len(ts) > 180,
        daily_seasonality=False,
        changepoint_prior_scale=0.05,
    )
    model.add_regressor("is_quincena")
    model.fit(ts)

    # Forecast next 7 days
    future = model.make_future_dataframe(periods=7)
    future["is_quincena"] = future["ds"].dt.day.apply(
        lambda d: 1 if d in [14, 15, 16, 28, 29, 30, 31, 1] else 0
    )
    forecast = model.predict(future)

    return {
        "product_id": product_id,
        "method": "prophet",
        "forecast": forecast.tail(7)[["ds", "yhat", "yhat_lower", "yhat_upper"]]
        .assign(ds=lambda x: x["ds"].dt.strftime("%Y-%m-%d"))
        .to_dict("records"),
        "mae": float(np.mean(np.abs(forecast["yhat"].values[:-7] - ts["y"].values))),
    }


def train_moving_average(product_df: pd.DataFrame, product_id: int):
    """Simple moving average fallback for products with sparse data."""
    ts = product_df.groupby("sale_date")["units_sold"].sum().reset_index()
    ts.columns = ["ds", "y"]

    # 7-day moving average
    avg_7d = ts["y"].tail(min(30, len(ts))).mean()
    today = datetime.now()

    forecast = []
    for i in range(1, 8):
        date = today + timedelta(days=i)
        # Quincena boost
        boost = 1.3 if date.day in [14, 15, 16, 28, 29, 30, 31, 1] else 1.0
        forecast.append({
            "ds": date.strftime("%Y-%m-%d"),
            "yhat": round(avg_7d * boost, 2),
            "yhat_lower": round(avg_7d * boost * 0.5, 2),
            "yhat_upper": round(avg_7d * boost * 1.5, 2),
        })

    return {
        "product_id": product_id,
        "method": "moving_average",
        "forecast": forecast,
        "mae": None,
    }


def main():
    print("=" * 60)
    print("B.1 - Demand Forecast Training")
    print("=" * 60)

    df = load_data()
    df = add_peru_features(df)

    # Group by product, train a model for each
    products = df.groupby("productId")
    results = {}
    prophet_count = 0
    ma_count = 0

    for product_id, product_df in products:
        n_days = product_df["sale_date"].nunique()

        if n_days >= 30:
            result = train_prophet_model(product_df, int(product_id))
            if result:
                results[str(product_id)] = result
                prophet_count += 1
                continue

        # Fallback to moving average
        result = train_moving_average(product_df, int(product_id))
        results[str(product_id)] = result
        ma_count += 1

    # Save results
    out_path = os.path.join(MODELS_DIR, "forecast_results.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2, ensure_ascii=False)

    print(f"\nTrained {len(results)} models:")
    print(f"  Prophet: {prophet_count}")
    print(f"  Moving Average: {ma_count}")
    print(f"  Saved to: {out_path}")

    # Print top products by predicted demand
    top_products = sorted(
        results.items(),
        key=lambda x: sum(d["yhat"] for d in x[1]["forecast"]),
        reverse=True,
    )[:10]

    print("\nTop 10 products by predicted weekly demand:")
    for pid, data in top_products:
        total = sum(d["yhat"] for d in data["forecast"])
        print(f"  Product {pid}: {total:.1f} units (method: {data['method']})")


if __name__ == "__main__":
    main()
