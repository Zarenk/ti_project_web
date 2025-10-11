import ProductReportClient, { ProductOption } from "./product-report-client";
import { getProducts } from "../../products/products.api";

export const dynamic = "force-dynamic";

export default async function ProductReportPage() {
  const products = await getProducts();

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
          stock: stockValue,
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