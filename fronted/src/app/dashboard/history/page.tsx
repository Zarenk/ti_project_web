"use client"

import { jwtDecode } from 'jwt-decode';
import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';

interface HistoryEntry {
  id: number;
  action: string;
  stockChange: number;
  previousStock: number | null;
  newStock: number | null;
  createdAt: string;
  user: {
    username: string;
  };
  inventory: {
    product: {
      name: string;
    };
    storeOnInventory: {
      store: {
        name: string;
      };
      stock: number;
    }[];
  };
}

function getUserIdFromToken(): number | null {
  const token = localStorage.getItem('token'); // Obtén el token del localStorage
  if (!token) {
    console.error('No se encontró un token de autenticación');
    return null;
  }

  try {
    const decodedToken: { sub: number } = jwtDecode(token); // Decodifica el token
    return decodedToken.sub; // Retorna el userId (sub es el estándar en JWT para el ID del usuario)
  } catch (error) {
    console.error('Error al decodificar el token:', error);
    return null;
  }
}

export default function UserHistory() {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const [userId, setUserId] = useState<number | null>(null);

  // Obtener el userId al cargar el componente
  useEffect(() => {
    const id = getUserIdFromToken();
    if (!id) {
      toast.error(
        "No se pudo obtener el ID del usuario. Por favor, inicie sesión nuevamente."
      );
    }
    setUserId(id);
  }, []);

  useEffect(() => {
    async function fetchHistory() {
      if (!userId) return; // No hacer nada si no hay userId
      setLoading(true);
      try {
        const response = await fetch(`http://localhost:4000/api/inventory/history/users/${userId}`);
        if (!response.ok) {
            throw new Error("Error al obtener el historial del usuario");
        }
        const data = await response.json();
        setHistory(data);
      } catch (error) {
        console.error('Error al obtener el historial del usuario:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchHistory();
  }, [userId]);

  if (loading) {
    return <p>Cargando historial...</p>;
  }

  if (history.length === 0) {
    return <p>No hay historial disponible para este usuario.</p>;
  }

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Historial del Usuario</h2>
      <table className="table-auto w-full border-collapse border border-gray-300">
        <thead>
          <tr>
            <th className="border border-gray-300 px-4 py-2">Usuario</th>
            <th className="border border-gray-300 px-4 py-2">Acción</th>
            <th className="border border-gray-300 px-4 py-2">Producto</th>
            <th className="border border-gray-300 px-4 py-2">Tienda</th>
            <th className="border border-gray-300 px-4 py-2">Stock Anterior</th>
            <th className="border border-gray-300 px-4 py-2">Cambio</th>
            <th className="border border-gray-300 px-4 py-2">Stock Actual</th>
            <th className="border border-gray-300 px-4 py-2">Fecha</th>
          </tr>
        </thead>
        <tbody>
          {history.map((entry) => (
            <tr key={entry.id}>
            <td className="border border-gray-300 px-4 py-2">{entry.user.username}</td>
              <td className="border border-gray-300 px-4 py-2">{entry.action}</td>
              <td className="border border-gray-300 px-4 py-2">{entry.inventory.product.name}</td>
              <td className="border border-gray-300 px-4 py-2">
                {entry.inventory.storeOnInventory.map((store) => store.store.name).join(', ')}
              </td>
              <td className="border border-gray-300 px-4 py-2">
                {entry.previousStock ?? 0 > 0 ? `+${entry.previousStock}` : entry.previousStock}
              </td>
              <td className="border border-gray-300 px-4 py-2">
                {entry.stockChange > 0 ? `+${entry.stockChange}` : entry.stockChange}
              </td>
              <td className="border border-gray-300 px-4 py-2">
                    {entry.inventory.storeOnInventory.map((store) => store.stock).join(', ')} {/* Mostrar stock */}
              </td>
              <td className="border border-gray-300 px-4 py-2">
                {new Date(entry.createdAt).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
