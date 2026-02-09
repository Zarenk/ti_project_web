import { getAllPurchasePrices, getInventoryWithCurrency, getProductEntries, getSeriesByProductAndStore, getStockDetailsByStoreAndCurrency } from "../../inventory.api";
import ProductDetailsPage from "../ProductDetailsPage";

export const dynamicParams = true;
export const dynamic = "force-dynamic"; // ensure fresh data on each request

interface Props {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ [key: string]: string }>;
}

export default async function ProductDetails({ params, searchParams }: Props) {

  const resolvedParams = await params; // ??? igual que en categor??as
  const id = resolvedParams.id;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const idNumber = parseInt(id, 10);

  const [inventoryData, stockDetailsData, purchasePrices] = await Promise.all([
    getInventoryWithCurrency(),
    getStockDetailsByStoreAndCurrency(),
    getAllPurchasePrices(),
  ]);

  const selectedInventory = inventoryData.find((item: any) => item.id === idNumber);
  const fallbackInventories = selectedInventory
    ? []
    : inventoryData.filter((item: any) => item.product?.id === idNumber);
  const productId =
    selectedInventory?.product?.id ??
    (fallbackInventories.length ? fallbackInventories[0].product?.id : null);
  const productEntries = productId != null ? await getProductEntries(productId) : [];

  // Reunir todos los registros de inventario que correspondan al producto
  const productInventories =
    productId != null
      ? inventoryData.filter((item: any) => item.product?.id === productId)
      : [];

  const product = productInventories[0] ?? selectedInventory;
  const stockDetails =
    productId != null
      ? stockDetailsData.find((item: any) => item.productId === productId)
      : null;
  const priceInfo =
    productId != null
      ? purchasePrices.find((p: any) => p.productId === productId)
      : null;

  // Validar si los datos existen
   if (!product) {
    return (
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-4">Producto no encontrado</h1>
        <p className="text-muted-foreground">No se encontraron datos para este producto.</p>
      </div>
    );
  }

  // Calcular el precio m??nimo y m??ximo en soles
  const lowestPurchasePrice = priceInfo?.lowestPurchasePrice || 0;
  const highestPurchasePrice = priceInfo?.highestPurchasePrice || 0;

  // Obtener las series por tienda
  const series = stockDetails
    ? await Promise.all(
        Object.keys(stockDetails.stockByStoreAndCurrency).map(async (storeId) => {
          const storeSeries = await getSeriesByProductAndStore(
            parseInt(storeId, 10),
            productId ?? 0
          );
          return { storeId: parseInt(storeId, 10), series: storeSeries };
        })
      )
  : [];

  const aggregatedStoreOnInventory = productInventories.length
    ? productInventories.flatMap((inv: any) => inv.storeOnInventory)
    : (product?.storeOnInventory ?? []);

  const totalStock = aggregatedStoreOnInventory.reduce(
    (acc: number, store: any) => acc + store.stock,
    0
  );

  const createdAt = productInventories.length
    ? productInventories.reduce(
        (earliest: Date, inv: any) =>
          new Date(inv.createdAt) < new Date(earliest) ? inv.createdAt : earliest,
        productInventories[0].createdAt
      )
    : product.createdAt;

  const updateAt = productInventories.length
    ? productInventories.reduce(
        (latest: Date, inv: any) =>
          new Date(inv.updatedAt) > new Date(latest) ? inv.updatedAt : latest,
        productInventories[0].updatedAt
      )
    : product.updatedAt;

  const productFormatted = {
    id: product.product.id,
    inventoryId: product.id,
    name: product.product.name,
    category: product.product.category.name,
    categoryId: product.product.category.id,
    priceSell: product.product.priceSell,
    createdAt,
    updateAt,
    stock: totalStock,
    highestPurchasePrice,
    lowestPurchasePrice,
    storeOnInventory: aggregatedStoreOnInventory,
  };

  return (
    <ProductDetailsPage
      product={productFormatted}
      stockDetails={stockDetails}
      entries={productEntries}
      series={series}
      searchParams={resolvedSearchParams}
    />
  );
}
