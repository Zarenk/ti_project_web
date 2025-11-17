import ProductReportClient, { ProductOption } from "./product-report-client";
import { getProductReportOptions } from "../sales.api";

export const dynamic = "force-dynamic";

export default async function ProductReportPage() {
  const products = await getProductReportOptions();

  const options: ProductOption[] = Array.isArray(products)
    ? products
        .map((product: any) => {
          const id = Number(product?.id);
          if (!Number.isFinite(id)) {
            return null;
          }

          const price =
            typeof product?.price === "number"
              ? product.price
              : Number(product?.price) || 0;

          const numericStock = Number(product?.stock);
          const stock =
            typeof product?.stock === "number"
              ? product.stock
              : Number.isFinite(numericStock)
              ? numericStock
              : null;

          const categoryName =
            typeof product?.categoryName === "string"
              ? product.categoryName
              : product?.category?.name ?? null;

          const normalizedSearch =
            typeof product?.searchKey === "string"
              ? product.searchKey
              : [product?.name ?? "", categoryName ?? ""]
                  .join(" ")
                  .toLowerCase()
                  .normalize("NFD")
                  .replace(/\p{Diacritic}/gu, "");

          return {
            id,
            name: product?.name ?? "Producto sin nombre",
            price,
            stock,
            categoryName,
            searchKey: normalizedSearch,
          } satisfies ProductOption;
        })
        .filter((value): value is ProductOption => value !== null)
    : [];

  return (
    <div className="p-6">
      <ProductReportClient products={options} />
    </div>
  );
}
