"""
B.4 - Product Category Classifier
Auto-suggests category when creating a new product.

Uses TF-IDF + LinearSVC pipeline (scikit-learn, CPU).

Input: exports/products/products_categories.csv
Output: models/products/category_classifier.pkl
        models/products/category_map.json

Usage: python train_product_classifier.py
"""

import os
import sys
import json

import pandas as pd
import numpy as np
import joblib

SCRIPT_DIR = os.path.dirname(__file__)
EXPORTS_DIR = os.path.join(SCRIPT_DIR, "..", "exports", "products")
MODELS_DIR = os.path.join(SCRIPT_DIR, "..", "models", "products")

os.makedirs(MODELS_DIR, exist_ok=True)

MIN_CATEGORY_SAMPLES = 3  # Minimum products per category to include


def load_data() -> pd.DataFrame:
    path = os.path.join(EXPORTS_DIR, "products_categories.csv")
    if not os.path.exists(path):
        print("ERROR: Run export_all.py first")
        sys.exit(1)
    return pd.read_csv(path)


def preprocess_text(text: str) -> str:
    """Normalize product name for training."""
    if pd.isna(text):
        return ""
    text = str(text).lower().strip()
    # Remove common noise words in Spanish product names
    for noise in ["unid", "und", "pza", "paq", "cja", "x "]:
        text = text.replace(noise, " ")
    return " ".join(text.split())


def train_classifier(df: pd.DataFrame):
    """Train TF-IDF + SVM pipeline."""
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.svm import LinearSVC
    from sklearn.pipeline import Pipeline
    from sklearn.model_selection import cross_val_score

    # Filter categories with enough samples
    category_counts = df["categoryId"].value_counts()
    valid_categories = category_counts[category_counts >= MIN_CATEGORY_SAMPLES].index
    df_filtered = df[df["categoryId"].isin(valid_categories)].copy()

    print(f"Categories with >= {MIN_CATEGORY_SAMPLES} products: {len(valid_categories)}")
    print(f"Products in training set: {len(df_filtered)}")

    if len(valid_categories) < 2:
        print("ERROR: Need at least 2 categories with enough products")
        return None, None

    # Preprocess
    df_filtered["text"] = df_filtered["product_name"].apply(preprocess_text)

    # Add description if available
    if "description" in df_filtered.columns:
        df_filtered["text"] = df_filtered["text"] + " " + df_filtered["description"].fillna("")

    X = df_filtered["text"].values
    y = df_filtered["categoryId"].values

    # Build pipeline
    pipeline = Pipeline([
        ("tfidf", TfidfVectorizer(
            ngram_range=(1, 2),
            max_features=5000,
            sublinear_tf=True,
            strip_accents="unicode",
        )),
        ("clf", LinearSVC(C=1.0, max_iter=10000)),
    ])

    # Cross-validation
    if len(df_filtered) >= 10:
        n_splits = min(5, len(valid_categories))
        scores = cross_val_score(pipeline, X, y, cv=n_splits, scoring="accuracy")
        print(f"\nCross-validation accuracy: {scores.mean():.3f} (+/- {scores.std():.3f})")
    else:
        print("\nToo few samples for cross-validation")

    # Train on full data
    pipeline.fit(X, y)

    # Build category ID -> name map
    category_map = (
        df_filtered.drop_duplicates("categoryId")
        .set_index("categoryId")["category_name"]
        .to_dict()
    )

    return pipeline, category_map


def main():
    print("=" * 60)
    print("B.4 - Product Category Classifier")
    print("=" * 60)

    df = load_data()
    print(f"Total products with categories: {len(df)}")
    print(f"Total categories: {df['categoryId'].nunique()}")

    pipeline, category_map = train_classifier(df)

    if pipeline is None:
        print("\nTraining failed - not enough data")
        return

    # Save model
    model_path = os.path.join(MODELS_DIR, "category_classifier.pkl")
    joblib.dump(pipeline, model_path)

    # Save category map
    map_path = os.path.join(MODELS_DIR, "category_map.json")
    with open(map_path, "w", encoding="utf-8") as f:
        json.dump({str(k): v for k, v in category_map.items()}, f, indent=2, ensure_ascii=False)

    print(f"\nModel saved to: {model_path}")
    print(f"Category map saved to: {map_path}")

    # Test predictions
    test_names = [
        "LAPTOP LENOVO IDEAPAD 15 I5",
        "SHAMPOO PANTENE 400ML",
        "ARROZ EXTRA COSTEÑO 5KG",
        "MOUSE INALAMBRICO LOGITECH",
        "ACEITE VEGETAL PRIMOR 1L",
    ]

    print("\nTest predictions:")
    for name in test_names:
        processed = preprocess_text(name)
        pred = pipeline.predict([processed])[0]
        cat_name = category_map.get(pred, f"Category {pred}")
        print(f"  '{name}' => {cat_name} (id={pred})")


if __name__ == "__main__":
    main()
