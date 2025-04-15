"use client";

interface Store {
  id: number;
  stock: number;
  store: {
    name: string;
  };
}

interface Product {
  product: {
    name: string;
  };
  storeOnInventory: Store[];
}

interface InventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
}

export default function InventoryModal({ isOpen, onClose, product }: InventoryModalProps) {
  if (!isOpen || !product) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="rounded-lg shadow-lg p-6 w-96">
        <h2 className="text-xl font-bold mb-4">Tiendas para:</h2>
        <h2 className="text-xl font-bold mb-4">{product.product.name}</h2>
        <table className="table-auto w-full border-collapse border border-gray-300">
          <thead>
            <tr>
              <th className="border border-gray-300 px-4 py-2">Tienda</th>
              <th className="border border-gray-300 px-4 py-2">Stock</th>
            </tr>
          </thead>
          <tbody>
            {product.storeOnInventory.map((store) => (
              <tr key={store.id}>
                <td className="border border-gray-300 px-4 py-2">{store.store.name}</td>
                <td className="border border-gray-300 px-4 py-2">
                  {store.stock > 0 ? store.stock : "Sin stock"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <button
          className="mt-4 bg-red-500 text-white px-4 py-2 rounded"
          onClick={onClose}
        >
          Cerrar
        </button>
      </div>
    </div>
  );
}