"use client"

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table } from "@/components/ui/table";

export default function ProductSeriesForm() {
  const [products, setProducts] = useState<
    { id: number; name: string; quantity: number; series: string[] }[]
  >([]);
  const [currentProduct, setCurrentProduct] = useState({
    id: 0,
    name: "",
    quantity: 1,
    series: [] as string[],
  });
  const [currentSeries, setCurrentSeries] = useState("");

  // Agregar un producto
  const addProduct = () => {
    if (!currentProduct.name || currentProduct.quantity <= 0) {
      alert("Por favor, ingresa un nombre y una cantidad válida.");
      return;
    }

    setProducts((prev) => [...prev, { ...currentProduct }]);
    setCurrentProduct({ id: 0, name: "", quantity: 1, series: [] });
  };

  // Agregar una serie al producto actual
  const addSeries = () => {
    if (!currentSeries) {
      alert("Por favor, ingresa un número de serie.");
      return;
    }

    setCurrentProduct((prev) => ({
      ...prev,
      series: [...prev.series, currentSeries],
    }));
    setCurrentSeries("");
  };

  // Eliminar una serie del producto actual
  const removeSeries = (serial: string) => {
    setCurrentProduct((prev) => ({
      ...prev,
      series: prev.series.filter((s) => s !== serial),
    }));
  };

  // Eliminar un producto
  const removeProduct = (id: number) => {
    setProducts((prev) => prev.filter((product) => product.id !== id));
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Gestión de Series de Productos</h1>

      {/* Formulario para agregar un producto */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Agregar Producto</h2>
        <div className="flex gap-4 mb-4">
          <Input
            placeholder="Nombre del producto"
            value={currentProduct.name}
            onChange={(e) =>
              setCurrentProduct((prev) => ({ ...prev, name: e.target.value }))
            }
          />
          <Input
            type="number"
            placeholder="Cantidad"
            value={currentProduct.quantity}
            onChange={(e) =>
              setCurrentProduct((prev) => ({
                ...prev,
                quantity: parseInt(e.target.value) || 1,
              }))
            }
          />
          <Button onClick={addProduct}>Agregar Producto</Button>
        </div>

        {/* Formulario para agregar series */}
        <div>
          <h3 className="text-lg font-medium mb-2">Agregar Series</h3>
          <div className="flex gap-4 mb-4">
            <Input
              placeholder="Número de serie"
              value={currentSeries}
              onChange={(e) => setCurrentSeries(e.target.value)}
            />
            <Button onClick={addSeries}>Agregar Serie</Button>
          </div>
          <ul className="list-disc pl-5">
            {currentProduct.series.map((serial, index) => (
              <li key={index} className="flex justify-between items-center">
                {serial}
                <Button
                  variant="ghost"
                  onClick={() => removeSeries(serial)}
                  className="text-red-500"
                >
                  Eliminar
                </Button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Tabla para visualizar productos y series */}
      <div>
        <h2 className="text-xl font-semibold mb-2">Productos Agregados</h2>
        <Table>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Cantidad</th>
              <th>Series</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product, index) => (
              <tr key={index}>
                <td>{product.name}</td>
                <td>{product.quantity}</td>
                <td>
                  <ul className="list-disc pl-5">
                    {product.series.map((serial, idx) => (
                      <li key={idx}>{serial}</li>
                    ))}
                  </ul>
                </td>
                <td>
                  <Button
                    variant="ghost"
                    onClick={() => removeProduct(product.id)}
                    className="text-red-500"
                  >
                    Eliminar
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
    </div>
  );
}