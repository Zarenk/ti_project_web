import { getAllPurchasePrices, getInventoryWithCurrency, getProductEntries, getSeriesByProductAndStore, getStockDetailsByStoreAndCurrency } from "../../inventory.api";
import ProductDetailsPage from "../ProductDetailsPage";

export const dynamicParams = true;
export const dynamic = "force-static"; // o "auto"

interface Props {
  params: Promise<{ id: string }>;
  searchParams?: { [key: string]: string };
}

export default async function ProductDetails({ params, searchParams }: Props) {

  const resolvedParams = await params; // ✅ igual que en categorías
  const id = resolvedParams.id;

  const [inventoryData, stockDetailsData, purchasePrices, productEntries] = await Promise.all([
    getInventoryWithCurrency(),
    getStockDetailsByStoreAndCurrency(),
    getAllPurchasePrices(),
    getProductEntries(parseInt(id, 10)), // Obtener las entradas del producto
  ]);

  // Buscar el producto por ID
  const product = inventoryData.find((item: any) => item.product.id === parseInt(id, 10));
  const stockDetails = stockDetailsData.find((item: any) => item.productId === parseInt(id, 10));
  const priceInfo = purchasePrices.find((p: any) => p.productId === parseInt(id, 10));

  // Validar si los datos existen
  if (!product || !priceInfo) {
    return (
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-4">Producto no encontrado</h1>
        <p className="text-muted-foreground">No se encontraron datos para este producto.</p>
      </div>
    );
  }

  // Calcular el precio mínimo y máximo en soles
  const lowestPurchasePrice = priceInfo.lowestPurchasePrice || 0;
  const highestPurchasePrice = priceInfo.highestPurchasePrice || 0;

  // Obtener las series por tienda
  const series = stockDetails
    ? await Promise.all(
        Object.keys(stockDetails.stockByStoreAndCurrency).map(async (storeId) => {
          const storeSeries = await getSeriesByProductAndStore(parseInt(storeId, 10), parseInt(id, 10));
          return { storeId: parseInt(storeId, 10), series: storeSeries };
        })
      )
  : [];

  const productFormatted = {
    id: product.product.id,
    name: product.product.name,
    category: product.product.category.name,
    priceSell: product.product.priceSell,
    createdAt: product.createdAt,
    updateAt: product.updatedAt,
    stock: product.storeOnInventory.reduce((acc: number, store: any) => acc + store.stock, 0),
    highestPurchasePrice,
    lowestPurchasePrice,
    ...product,
  };

  return <ProductDetailsPage 
  product={productFormatted} 
  stockDetails={stockDetails} 
  entries={productEntries} 
  series={series}
  searchParams={searchParams}
  />;
}