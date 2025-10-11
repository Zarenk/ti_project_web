import ProductReportClient, { ProductOption } from "./product-report-client";
import { getProducts } from "../../products/products.api";
import { BACKEND_URL } from "@/lib/utils";

async function getProductStockTotals() {
  try {
    const response = await fetch(`${BACKEND_URL}/api/inventory/with-currency`, {
      cache: "no-store",
    });

    if (!response.ok) {
      console.error("Failed to fetch inventory stock totals", response.statusText);
      return new Map<number, number>();
    }

    const data = await response.json();
    if (!Array.isArray(data)) {
      return new Map<number, number>();
    }

    return data.reduce((acc: Map<number, number>, item: any) => {
      const productId = Number(item?.productId ?? item?.product?.id);
      if (!Number.isFinite(productId)) {
        return acc;
      }

      const totalStock = Array.isArray(item?.storeOnInventory)
        ? item.storeOnInventory.reduce((sum: number, store: any) => {
            const stockValue = typeof store?.stock === "number" ? store.stock : 0;
            return sum + stockValue;
          }, 0)
        : 0;

      const current = acc.get(productId) ?? 0;
      acc.set(productId, current + totalStock);
      return acc;
    }, new Map<number, number>());
  } catch (error) {
    console.error("Unexpected error while fetching inventory stock", error);
    return new Map<number, number>();
  }
}

export const dynamic = "force-dynamic";

export default async function ProductReportPage() {
  const [products, stockTotals] = await Promise.all([getProducts(), getProductStockTotals()]);

  const options: ProductOption[] = Array.isArray(products)
    ? products.map((product: any) => {
        const priceSell = typeof product?.priceSell === "number" ? product.priceSell : undefined;
        const basePrice = typeof product?.price === "number" ? product.price : 0;
        const resolvedPrice = priceSell ?? basePrice;
        const categoryName = product?.category?.name ?? product?.categoryName ?? null;
        const stockValue =
          typeof product?.stock === "number"
            ? product.stock
            : typeof product?.totalStock === "number"
            ? product.totalStock
            : null;

        const aggregatedStock = stockTotals.get(Number(product?.id));
        const resolvedStock =
          typeof aggregatedStock === "number"
            ? aggregatedStock
            : stockValue;

        const searchPieces = [
          product?.name ?? "",
          categoryName ?? "",
          product?.barcode ?? "",
          product?.qrCode ?? "",
        ];

        return {
          id: Number(product?.id),
          name: product?.name ?? "Producto sin nombre",
          price: resolvedPrice,
          stock: resolvedStock,
          categoryName,
          searchKey: searchPieces
            .join(" ")
            .toLowerCase()
            .normalize("NFD")
            .replace(/\p{Diacritic}/gu, ""),
        } satisfies ProductOption;
      })
    : [];

  return (
    <div className="p-6">
      <ProductReportClient products={options} />
    </div>
  );
}