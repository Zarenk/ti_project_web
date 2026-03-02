"""
B.2 - Market Basket Analysis
Discovers which products are frequently bought together.

Uses Apriori algorithm from mlxtend for association rules.

Input: exports/baskets/transactions.csv
Output: models/baskets/association_rules.json

Usage: python train_basket_analysis.py
"""

import os
import sys
import json

import pandas as pd
import numpy as np

SCRIPT_DIR = os.path.dirname(__file__)
EXPORTS_DIR = os.path.join(SCRIPT_DIR, "..", "exports", "baskets")
MODELS_DIR = os.path.join(SCRIPT_DIR, "..", "models", "baskets")

os.makedirs(MODELS_DIR, exist_ok=True)


def load_data() -> pd.DataFrame:
    path = os.path.join(EXPORTS_DIR, "transactions.csv")
    if not os.path.exists(path):
        print("ERROR: Run export_all.py first")
        sys.exit(1)
    return pd.read_csv(path)


def train_apriori(df: pd.DataFrame):
    """Run Apriori algorithm on transaction data."""
    try:
        from mlxtend.frequent_patterns import apriori, association_rules
        from mlxtend.preprocessing import TransactionEncoder
    except ImportError:
        print("ERROR: pip install mlxtend")
        sys.exit(1)

    # Build baskets: list of product IDs per sale
    baskets = df.groupby("basket_id")["productId"].apply(list).tolist()

    # Filter baskets with at least 2 items (can't find associations in single-item baskets)
    baskets = [b for b in baskets if len(b) >= 2]
    print(f"Baskets with 2+ items: {len(baskets)}")

    if len(baskets) < 10:
        print("Not enough multi-item baskets for analysis")
        return []

    # Convert to one-hot encoding
    te = TransactionEncoder()
    te_array = te.fit_transform(baskets)
    basket_df = pd.DataFrame(te_array, columns=te.columns_)

    # Find frequent itemsets (min_support adapts to data size)
    min_support = max(0.005, 5 / len(baskets))  # At least 5 occurrences
    print(f"Using min_support={min_support:.4f}")

    frequent = apriori(basket_df, min_support=min_support, use_colnames=True)
    print(f"Frequent itemsets found: {len(frequent)}")

    if len(frequent) == 0:
        print("No frequent itemsets found. Try lowering min_support.")
        return []

    # Generate association rules
    rules = association_rules(frequent, metric="lift", min_threshold=1.2)
    print(f"Association rules found: {len(rules)}")

    return rules


def build_product_name_map(df: pd.DataFrame) -> dict:
    """Build a map of productId -> product_name."""
    return df.drop_duplicates("productId").set_index("productId")["product_name"].to_dict()


def main():
    print("=" * 60)
    print("B.2 - Market Basket Analysis")
    print("=" * 60)

    df = load_data()
    name_map = build_product_name_map(df)
    rules = train_apriori(df)

    if isinstance(rules, list) and len(rules) == 0:
        print("\nNo rules to save.")
        return

    # Convert rules to serializable format
    rules_list = []
    for _, row in rules.iterrows():
        antecedents = list(row["antecedents"])
        consequents = list(row["consequents"])

        rules_list.append({
            "antecedents": [int(x) for x in antecedents],
            "antecedent_names": [name_map.get(int(x), f"Product {x}") for x in antecedents],
            "consequents": [int(x) for x in consequents],
            "consequent_names": [name_map.get(int(x), f"Product {x}") for x in consequents],
            "support": round(float(row["support"]), 4),
            "confidence": round(float(row["confidence"]), 4),
            "lift": round(float(row["lift"]), 4),
        })

    # Sort by lift (strongest associations first)
    rules_list.sort(key=lambda x: x["lift"], reverse=True)

    # Save
    out_path = os.path.join(MODELS_DIR, "association_rules.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(rules_list, f, indent=2, ensure_ascii=False)

    print(f"\nSaved {len(rules_list)} rules to: {out_path}")

    # Print top 15 rules
    print("\nTop 15 association rules (by lift):")
    for r in rules_list[:15]:
        ant = ", ".join(r["antecedent_names"])
        con = ", ".join(r["consequent_names"])
        print(f"  {ant}  =>  {con}")
        print(f"    lift={r['lift']:.2f}, confidence={r['confidence']:.2f}, support={r['support']:.4f}")


if __name__ == "__main__":
    main()
