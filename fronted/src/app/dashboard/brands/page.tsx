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
import { BrandLogo } from '@/components/BrandLogo';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';

const JPEG_MIME_TYPES = new Set(['image/jpeg', 'image/jpg']);

async function convertJpegFileToPng(file: File): Promise<File> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('No se pudo cargar la imagen JPEG seleccionada.'));
      img.src = objectUrl;
    });

    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth || image.width;
    canvas.height = image.naturalHeight || image.height;
    const context = canvas.getContext('2d');

    if (!context) {
      throw new Error('El navegador no soporta canvas para convertir la imagen JPEG.');
    }

    context.drawImage(image, 0, 0);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (result) => {
          if (result) {
            resolve(result);
          } else {
            reject(new Error('No se pudo convertir la imagen JPEG a PNG.'));
          }
        },
        'image/png',
      );
    });

    const filename = file.name.replace(/\.[^.]+$/, '.png');
    return new File([blob], filename, { type: 'image/png' });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function normalizeRasterLogo(file: File | null): Promise<File | null> {
  if (!file) return null;
  if (!JPEG_MIME_TYPES.has(file.type)) return file;
  return convertJpegFileToPng(file);
}

interface Brand {
  id: number;
  name: string;
  logoSvg?: string;
  logoPng?: string;
  createdAt?: string;
  updatedAt?: string;
}

export default function BrandsPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [allBrands, setAllBrands] = useState<Brand[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sortByNewest, setSortByNewest] = useState(false);
  const [name, setName] = useState('');
  const [svgFile, setSvgFile] = useState<File | null>(null);
  const [pngFile, setPngFile] = useState<File | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [editing, setEditing] = useState<Brand | null>(null);

  useEffect(() => {
    fetchBrands();
  }, []);

  useEffect(() => {
    const handler = window.setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
    }, 300);

    return () => {
      window.clearTimeout(handler);
    };
  }, [searchTerm]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, sortByNewest]);

  useEffect(() => {
    const normalizedSearch = debouncedSearch.toLowerCase();
    let filtered = [...allBrands];

    if (normalizedSearch) {
      filtered = filtered.filter((brand) =>
        brand.name.toLowerCase().includes(normalizedSearch),
      );
    }

    if (sortByNewest) {
      filtered.sort((a, b) => {
        const aDate = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bDate = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bDate - aDate;
      });
    } else {
      filtered.sort((a, b) =>
        a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }),
      );
    }

    const totalItems = filtered.length;
    setTotal(totalItems);

    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    if (page > totalPages) {
      setPage(totalPages);
      return;
    }

    const start = (page - 1) * pageSize;
    setBrands(filtered.slice(start, start + pageSize));
  }, [allBrands, debouncedSearch, sortByNewest, page, pageSize]);

  async function fetchBrands() {
    try {
      const batchSize = Math.max(pageSize, 50);
      let currentPage = 1;
      let aggregated: Brand[] = [];
      let totalItems = 0;

      while (true) {
        const { data, total } = await getBrands(currentPage, batchSize);
        totalItems = total;
        aggregated = aggregated.concat(data);
        if (aggregated.length >= totalItems || data.length === 0) {
          break;
        }
        currentPage += 1;
      }

      setAllBrands(aggregated);
    } catch (err) {
      console.error(err);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    let processedPngFile: File | null = pngFile;

    try {
      processedPngFile = await normalizeRasterLogo(pngFile);
    } catch (conversionError) {
      console.error(conversionError);
      return;
    }
    try {
      if (editing) {
        await updateBrand(editing.id, {
          name,
          logoSvg: svgFile || undefined,
          logoPng: processedPngFile || undefined,
        });
        toast.success('Marca actualizada correctamente');
      } else {
        await createBrand({
          name,
          logoSvg: svgFile || undefined,
          logoPng: processedPngFile || undefined,
        });
        toast.success('Marca creada correctamente');
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

        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-2">
            <Label htmlFor="brandSearch">Buscar por nombre</Label>
            <Input
              id="brandSearch"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar marca..."
              className="w-full sm:w-64"
            />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="sortNewest"
              checked={sortByNewest}
              onCheckedChange={(checked) => setSortByNewest(checked === true)}
            />
            <Label htmlFor="sortNewest" className="text-sm font-medium">
              Ordenar por última marca ingresada
            </Label>
          </div>
        </div>

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
            <Label htmlFor="png">Logo PNG/JPEG</Label>
            <Input
              id="png"
              type="file"
              accept="image/png, image/jpeg"
              onChange={(e) => setPngFile(e.target.files?.[0] || null)}
            />
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
                    <BrandLogo
                      src={getImageUrl(brand.logoSvg)}
                      alt={brand.name}
                      className="h-8"
                    />
                  )}
                </TableCell>
                <TableCell>
                  {brand.logoPng && (
                    <BrandLogo
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
