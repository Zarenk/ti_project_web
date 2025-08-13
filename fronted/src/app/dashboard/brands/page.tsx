"use client";

import { useState, useEffect, FormEvent } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import {
  createBrand,
  getBrands,
  updateBrand,
  deleteBrand,
  BACKEND_URL,
  convertBrandPngToSvg,
} from './brands.api';

interface Brand {
  id: number;
  name: string;
  logoSvg?: string;
  logoPng?: string;
}

export default function BrandsPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [name, setName] = useState('');
  const [svgFile, setSvgFile] = useState<File | null>(null);
  const [pngFile, setPngFile] = useState<File | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [editing, setEditing] = useState<Brand | null>(null);

  useEffect(() => {
    fetchBrands();
  }, [page, pageSize]);

  async function fetchBrands() {
    try {
      const { data, total } = await getBrands(page, pageSize);
      setBrands(data);
      setTotal(total);
    } catch (err) {
      console.error(err);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      if (editing) {
        await updateBrand(editing.id, {
          name,
          logoSvg: svgFile || undefined,
          logoPng: pngFile || undefined,
        });
      } else {
        await createBrand({
          name,
          logoSvg: svgFile || undefined,
          logoPng: pngFile || undefined,
        });
      }
      setName('');
      setSvgFile(null);
      setPngFile(null);
      setEditing(null);
      await fetchBrands();
    } catch (err) {
      console.error(err);
    }
  }

  function handleEdit(brand: Brand) {
    setEditing(brand);
    setName(brand.name);
    setSvgFile(null);
    setPngFile(null);
  }

  async function handleDelete(id: number) {
    if (!confirm('¿Eliminar marca?')) return;
    try {
      await deleteBrand(id);
      await fetchBrands();
    } catch (err) {
      console.error(err);
    }
  }

  async function handleConvert(id: number) {
    try {
      await convertBrandPngToSvg(id);
      await fetchBrands();
    } catch (err) {
      console.error(err);
    }
  }

  function getImageUrl(path?: string) {
    if (!path) return '';
    return path.startsWith('http') ? path : `${BACKEND_URL}${path}`;
  }

  return (
    <section className="py-2 sm:py-6">
      <div className="container mx-auto px-1 sm:px-6 lg:px-8">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-4">Marcas</h1>

        <form onSubmit={handleSubmit} className="space-y-4 mb-8">
          <div>
            <Label htmlFor="name">Nombre</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="svg">Logo SVG</Label>
            <Input id="svg" type="file" accept="image/svg+xml" onChange={(e) => setSvgFile(e.target.files?.[0] || null)} />
          </div>
          <div>
            <Label htmlFor="png">Logo PNG</Label>
            <Input id="png" type="file" accept="image/png" onChange={(e) => setPngFile(e.target.files?.[0] || null)} />
          </div>
          <Button type="submit">{editing ? 'Actualizar' : 'Guardar'}</Button>
        </form>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>SVG</TableHead>
              <TableHead>PNG</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {brands.map((brand) => (
              <TableRow key={brand.id}>
                <TableCell>{brand.name}</TableCell>
                <TableCell>
                  {brand.logoSvg && (
                    <img
                      src={getImageUrl(brand.logoSvg)}
                      alt={brand.name}
                      className="h-8"
                    />
                  )}
                </TableCell>
                <TableCell>
                  {brand.logoPng && (
                    <img
                      src={getImageUrl(brand.logoPng)}
                      alt={brand.name}
                      className="h-8"
                    />
                  )}
                </TableCell>
                <TableCell className="space-x-2">
                  <Button type="button" onClick={() => handleEdit(brand)}>
                    Editar
                  </Button>
                  {brand.logoPng && !brand.logoSvg && (
                    <Button type="button" onClick={() => handleConvert(brand.id)}>
                      PNG a SVG
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => handleDelete(brand.id)}
                  >
                    Eliminar
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="flex items-center justify-between mt-4">
          <div className="space-x-2">
            <Button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Anterior
            </Button>
            <span>
              Página {page} de {Math.ceil(total / pageSize) || 1}
            </span>
            <Button
              type="button"
              onClick={() =>
                setPage((p) =>
                  p < Math.ceil(total / pageSize) ? p + 1 : p,
                )
              }
              disabled={page >= Math.ceil(total / pageSize)}
            >
              Siguiente
            </Button>
          </div>
          <div className="flex items-center space-x-2">
            <Label htmlFor="pageSize">Por página:</Label>
            <select
              id="pageSize"
              value={pageSize}
              onChange={(e) => {
                setPageSize(parseInt(e.target.value));
                setPage(1);
              }}
              className="border rounded p-1"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
            </select>
          </div>
        </div>
      </div>
    </section>
  );
}