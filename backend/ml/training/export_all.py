"""
Export all training data from PostgreSQL for ML models.
Run: python export_all.py

Exports:
  - exports/demand/daily_demand.csv
  - exports/baskets/transactions.csv
  - exports/prices/price_history.csv
  - exports/products/products_categories.csv
  - exports/clients/rfm.csv
"""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from db_connection import query_to_df, get_org_id

EXPORTS_DIR = os.path.join(os.path.dirname(__file__), "..", "exports")


def ensure_dir(subdir: str) -> str:
    path = os.path.join(EXPORTS_DIR, subdir)
    os.makedirs(path, exist_ok=True)
    return path


def export_daily_demand():
    """B.1 - Export daily demand per product for forecasting."""
    org_id = get_org_id()
    df = query_to_df(
        """
        SELECT
            sd."productId",
            p.name AS product_name,
            p."categoryId",
            c.name AS category_name,
            s."storeId",
            DATE(s."createdAt") AS sale_date,
            EXTRACT(DOW FROM s."createdAt") AS day_of_week,
            EXTRACT(DAY FROM s."createdAt") AS day_of_month,
            EXTRACT(MONTH FROM s."createdAt") AS month,
            SUM(sd.quantity) AS units_sold,
            SUM(sd.price * sd.quantity) AS revenue
        FROM "SalesDetail" sd
        JOIN "Sales" s ON sd."salesId" = s.id
        JOIN "Product" p ON sd."productId" = p.id
        LEFT JOIN "Category" c ON p."categoryId" = c.id
        WHERE s."organizationId" = %s
        GROUP BY sd."productId", p.name, p."categoryId", c.name,
                 s."storeId", DATE(s."createdAt"),
                 EXTRACT(DOW FROM s."createdAt"),
                 EXTRACT(DAY FROM s."createdAt"),
                 EXTRACT(MONTH FROM s."createdAt")
        ORDER BY sale_date
        """,
        (org_id,),
    )
    out = os.path.join(ensure_dir("demand"), "daily_demand.csv")
    df.to_csv(out, index=False)
    print(f"[Demand] {len(df)} rows, {df['productId'].nunique()} products")
    print(f"  Date range: {df['sale_date'].min()} to {df['sale_date'].max()}")
    return df


def export_baskets():
    """B.2 - Export basket transactions for market basket analysis."""
    org_id = get_org_id()
    df = query_to_df(
        """
        SELECT
            s.id AS basket_id,
            sd."productId",
            p.name AS product_name,
            p."categoryId",
            sd.quantity,
            sd.price,
            s."clientId",
            s.source,
            s."storeId",
            DATE(s."createdAt") AS sale_date
        FROM "Sales" s
        JOIN "SalesDetail" sd ON sd."salesId" = s.id
        JOIN "Product" p ON sd."productId" = p.id
        WHERE s."organizationId" = %s
        """,
        (org_id,),
    )
    out = os.path.join(ensure_dir("baskets"), "transactions.csv")
    df.to_csv(out, index=False)
    print(f"[Baskets] {len(df)} items in {df['basket_id'].nunique()} baskets")
    return df


def export_prices():
    """B.3 - Export price data for anomaly detection."""
    org_id = get_org_id()
    df = query_to_df(
        """
        SELECT
            sd."productId",
            p.name AS product_name,
            sd.price AS sale_price,
            p."priceSell" AS configured_price,
            ed.price AS cost_price,
            CASE WHEN ed.price > 0
                 THEN (sd.price - ed.price) / ed.price
                 ELSE NULL END AS margin_pct,
            CASE WHEN p."priceSell" > 0
                 THEN (p."priceSell" - sd.price) / p."priceSell"
                 ELSE NULL END AS discount_pct,
            DATE(s."createdAt") AS sale_date
        FROM "SalesDetail" sd
        JOIN "Sales" s ON sd."salesId" = s.id
        JOIN "Product" p ON sd."productId" = p.id
        LEFT JOIN "EntryDetail" ed ON sd."entryDetailId" = ed.id
        WHERE s."organizationId" = %s
        """,
        (org_id,),
    )
    out = os.path.join(ensure_dir("prices"), "price_history.csv")
    df.to_csv(out, index=False)
    print(f"[Prices] {len(df)} price records for {df['productId'].nunique()} products")
    return df


def export_products():
    """B.4 - Export products with categories for classification."""
    org_id = get_org_id()
    df = query_to_df(
        """
        SELECT
            p.id AS product_id,
            p.name AS product_name,
            p.description,
            p."categoryId",
            c.name AS category_name,
            p."brandId",
            b.name AS brand_name,
            p."priceSell",
            p.price AS "priceCost"
        FROM "Product" p
        LEFT JOIN "Category" c ON p."categoryId" = c.id
        LEFT JOIN "Brand" b ON p."brandId" = b.id
        WHERE p."organizationId" = %s
          AND p."categoryId" IS NOT NULL
        """,
        (org_id,),
    )
    out = os.path.join(ensure_dir("products"), "products_categories.csv")
    df.to_csv(out, index=False)
    print(f"[Products] {len(df)} products with categories ({df['categoryId'].nunique()} categories)")
    return df


def export_rfm():
    """B.5 - Export RFM metrics per client for segmentation."""
    org_id = get_org_id()
    df = query_to_df(
        """
        SELECT
            c.id AS client_id,
            c.name AS client_name,
            c.type AS client_type,
            COUNT(s.id) AS frequency,
            SUM(s.total) AS monetary,
            MAX(s."createdAt") AS last_purchase,
            MIN(s."createdAt") AS first_purchase,
            AVG(s.total) AS avg_order_value,
            COUNT(DISTINCT sd."productId") AS product_breadth
        FROM "Client" c
        JOIN "Sales" s ON s."clientId" = c.id
        JOIN "SalesDetail" sd ON sd."salesId" = s.id
        WHERE c."organizationId" = %s
        GROUP BY c.id, c.name, c.type
        HAVING COUNT(s.id) >= 1
        """,
        (org_id,),
    )
    out = os.path.join(ensure_dir("clients"), "rfm.csv")
    df.to_csv(out, index=False)
    print(f"[RFM] {len(df)} clients with purchase history")
    return df


if __name__ == "__main__":
    print("=" * 60)
    print("Exporting training data...")
    print("=" * 60)
    export_daily_demand()
    export_baskets()
    export_prices()
    export_products()
    export_rfm()
    print("=" * 60)
    print("Done! Check backend/ml/exports/")
