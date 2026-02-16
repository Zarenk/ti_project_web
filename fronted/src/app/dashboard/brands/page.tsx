"use client";

import { useState, useEffect, FormEvent, useMemo, useRef } from 'react';
import { CheckCircle2, Info } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import {
  createBrand,
  getBrands,
  updateBrand,
  deleteBrand,
  convertBrandPngToSvg,
} from './brands.api';
import { BACKEND_URL } from '@/lib/utils';
import { BrandLogo } from '@/components/BrandLogo';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTenantSelection } from '@/context/tenant-selection-context';
import { DeleteActionsGuard } from '@/components/delete-actions-guard';

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
  const [showErrors, setShowErrors] = useState(false);
  const [svgPreviewUrl, setSvgPreviewUrl] = useState<string | null>(null);
  const [pngPreviewUrl, setPngPreviewUrl] = useState<string | null>(null);
  const svgPreviewRef = useRef<string | null>(null);
  const pngPreviewRef = useRef<string | null>(null);
  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat('es-ES', {
        dateStyle: 'medium',
      }),
    [],
  );
  const { version } = useTenantSelection();

  const hasName = Boolean(name.trim());

  const renderFieldChip = (filled: boolean, required?: boolean) => (
    <span
      className={`ml-1 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
        filled
          ? "border-emerald-200/70 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200"
          : required
            ? "border-rose-200/70 bg-rose-50 text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200"
            : "border-border/60 bg-muted/30 text-muted-foreground"
      }`}
    >
      {filled ? <CheckCircle2 className="h-3 w-3" /> : null}
      {filled ? "Listo" : required ? "Requerido" : "Opcional"}
    </span>
  );
  useEffect(() => {
    return () => {
      if (svgPreviewRef.current) {
        URL.revokeObjectURL(svgPreviewRef.current);
      }
      if (pngPreviewRef.current) {
        URL.revokeObjectURL(pngPreviewRef.current);
      }
    };
  }, []);

  const handleSvgFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    setSvgFile(file);
  };

  const handlePngFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    setPngFile(file);
  };

  useEffect(() => {
    if (svgPreviewRef.current) {
      URL.revokeObjectURL(svgPreviewRef.current);
      svgPreviewRef.current = null;
    }
    if (svgFile) {
      const url = URL.createObjectURL(svgFile);
      svgPreviewRef.current = url;
      setSvgPreviewUrl(url);
    } else {
      setSvgPreviewUrl(null);
    }
  }, [svgFile]);

  useEffect(() => {
    if (pngPreviewRef.current) {
      URL.revokeObjectURL(pngPreviewRef.current);
      pngPreviewRef.current = null;
    }
    if (pngFile) {
      const url = URL.createObjectURL(pngFile);
      pngPreviewRef.current = url;
      setPngPreviewUrl(url);
    } else {
      setPngPreviewUrl(null);
    }
  }, [pngFile]);


  useEffect(() => {
    setPage(1);
    setAllBrands([]);
    setBrands([]);
    setTotal(0);
    fetchBrands();
  }, [version]);

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
    setShowErrors(true);
    if (!name.trim()) {
      toast.error('El nombre de la marca es obligatorio');
      return;
    }
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
      if (svgPreviewRef.current) {
        URL.revokeObjectURL(svgPreviewRef.current);
        svgPreviewRef.current = null;
      }
      if (pngPreviewRef.current) {
        URL.revokeObjectURL(pngPreviewRef.current);
        pngPreviewRef.current = null;
      }
      setSvgPreviewUrl(null);
      setPngPreviewUrl(null);
      setEditing(null);
      setShowErrors(false);
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
    if (svgPreviewRef.current) {
      URL.revokeObjectURL(svgPreviewRef.current);
      svgPreviewRef.current = null;
    }
    if (pngPreviewRef.current) {
      URL.revokeObjectURL(pngPreviewRef.current);
      pngPreviewRef.current = null;
    }
    setSvgPreviewUrl(null);
    setPngPreviewUrl(null);
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

  function getFormattedDate(date?: string) {
    if (!date) return 'Sin fecha';
    try {
      return dateFormatter.format(new Date(date));
    } catch (error) {
      return 'Sin fecha';
    }
  }

  return (
    <section className="py-2 sm:py-6">
      <div className="mx-auto w-full max-w-5xl px-3 sm:px-6 lg:px-8">
        <div className="mb-6 space-y-3">
          <h1 className="text-2xl font-bold sm:text-3xl lg:text-4xl">Marcas</h1>

          <Card className="border-muted/60 bg-card/70 backdrop-blur-sm">
            <CardContent className="flex flex-col gap-4 py-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex w-full flex-col gap-2 sm:max-w-xs">
                <Label htmlFor="brandSearch">Buscar por nombre</Label>
                <Input
                  id="brandSearch"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar marca..."
                  className="w-full"
                />
              </div>
              <div className="flex items-center gap-3 rounded-lg border border-border/80 px-3 py-2">
                <Checkbox
                  id="sortNewest"
                  checked={sortByNewest}
                  onCheckedChange={(checked) => setSortByNewest(checked === true)}
                  className="cursor-pointer"
                />
                <Label htmlFor="sortNewest" className="cursor-pointer text-sm font-medium leading-tight">
                  Ordenar por última marca ingresada
                </Label>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-8 border-muted/60 bg-card/70 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold">{editing ? 'Editar marca' : 'Agregar nueva marca'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="name">
                  Nombre
                  {renderFieldChip(hasName, true)}
                </Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  aria-invalid={showErrors && !name.trim()}
                  className={
                    showErrors && !name.trim()
                      ? "border-rose-400 ring-1 ring-rose-200/70 dark:border-rose-500 dark:ring-rose-500/20"
                      : ""
                  }
                />
                {showErrors && !name.trim() ? (
                  <div className="flex items-center gap-2 rounded-lg border border-rose-200/70 bg-rose-50/70 px-3 py-2 text-xs text-rose-700 shadow-sm dark:border-rose-900/40 dark:bg-rose-950/40 dark:text-rose-200">
                    <Info className="size-4 text-rose-500" />
                    Completa este campo para continuar.
                  </div>
                ) : null}
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="svg">
                  Logo SVG
                  {renderFieldChip(Boolean(svgFile))}
                </Label>
                <Input
                  id="svg"
                  type="file"
                  accept="image/svg+xml"
                  onChange={handleSvgFileChange}
                  className="cursor-pointer"
                />
                <div className="flex items-center gap-3 rounded-lg border border-border/60 bg-muted/30 p-3">
                  <div className="flex h-14 w-14 items-center justify-center rounded-lg border border-dashed border-border/60 bg-background/80">
                    {svgPreviewUrl ? (
                      <img
                        src={svgPreviewUrl}
                        alt="Vista previa SVG"
                        className="h-12 w-12 rounded bg-white object-contain p-1 shadow-sm"
                      />
                    ) : (
                      <span className="text-[10px] text-muted-foreground">Sin vista</span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {svgPreviewUrl
                      ? "Vista previa del SVG seleccionado."
                      : "Selecciona un SVG para ver la previsualización."}
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="png">
                  Logo PNG/JPEG
                  {renderFieldChip(Boolean(pngFile))}
                </Label>
                <Input
                  id="png"
                  type="file"
                  accept="image/png, image/jpeg"
                  onChange={handlePngFileChange}
                  className="cursor-pointer"
                />
                <div className="flex items-center gap-3 rounded-lg border border-border/60 bg-muted/30 p-3">
                  <div className="flex h-14 w-14 items-center justify-center rounded-lg border border-dashed border-border/60 bg-background/80">
                    {pngPreviewUrl ? (
                      <img
                        src={pngPreviewUrl}
                        alt="Vista previa PNG"
                        className="h-12 w-12 rounded bg-white object-contain p-1 shadow-sm"
                      />
                    ) : (
                      <span className="text-[10px] text-muted-foreground">Sin vista</span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {pngPreviewUrl
                      ? "Vista previa del PNG/JPEG seleccionado."
                      : "Selecciona un PNG/JPEG para ver la previsualización."}
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
                {editing && (
                  <Button type="button" variant="secondary" onClick={() => setEditing(null)} className="cursor-pointer">
                    Cancelar
                  </Button>
                  )}
                <Button type="submit" className="sm:min-w-[8rem] cursor-pointer">
                  {editing ? 'Actualizar' : 'Guardar'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <div className="space-y-3 md:hidden">
            {brands.map((brand) => (
              <Card key={brand.id} className="border-muted/60 bg-card/80 shadow-sm">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between gap-3">
                    <CardTitle className="text-lg font-semibold text-foreground">
                      {brand.name}
                    </CardTitle>
                    <div className="flex shrink-0 items-center gap-2">
                      {brand.logoSvg && (
                        <BrandLogo
                          src={getImageUrl(brand.logoSvg)}
                          alt={`${brand.name} logo svg`}
                          className="h-10 w-10 rounded border border-border/60 bg-background object-contain p-1"
                        />
                      )}
                      {brand.logoPng && (
                        <BrandLogo
                          src={getImageUrl(brand.logoPng)}
                          alt={`${brand.name} logo png`}
                          className="h-10 w-10 rounded border border-border/60 bg-background object-contain p-1"
                        />
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <div className="flex flex-wrap gap-4 text-muted-foreground">
                    <div className="flex flex-col">
                      <span className="text-xs uppercase tracking-wide">Creada</span>
                      <span className="font-medium text-foreground">
                        {getFormattedDate(brand.createdAt)}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs uppercase tracking-wide">Actualizada</span>
                      <span className="font-medium text-foreground">
                        {getFormattedDate(brand.updatedAt)}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" size="sm" onClick={() => handleEdit(brand)} className="cursor-pointer">
                      Editar
                    </Button>
                  {brand.logoPng && !brand.logoSvg && (
                      <Button type="button" size="sm" variant="secondary" onClick={() => handleConvert(brand.id)} className="cursor-pointer">
                        PNG a SVG
                      </Button>
                    )}
                    <DeleteActionsGuard>
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(brand.id)}
                        className="cursor-pointer"
                      >
                        Eliminar
                      </Button>
                    </DeleteActionsGuard>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="hidden overflow-hidden rounded-xl border border-border/70 bg-card/70 shadow-sm md:block">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[200px]">Nombre</TableHead>
                    <TableHead className="min-w-[120px]">SVG</TableHead>
                    <TableHead className="min-w-[120px]">PNG</TableHead>
                    <TableHead className="min-w-[220px]">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {brands.map((brand) => (
                    <TableRow key={brand.id}>
                      <TableCell className="font-medium">{brand.name}</TableCell>
                      <TableCell>
                        {brand.logoSvg && (
                          <BrandLogo
                            src={getImageUrl(brand.logoSvg)}
                            alt={`${brand.name} logo svg`}
                            className="h-10"
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        {brand.logoPng && (
                          <BrandLogo
                            src={getImageUrl(brand.logoPng)}
                            alt={`${brand.name} logo png`}
                            className="h-10"
                          />
                        )}
                      </TableCell>
                      <TableCell className="space-x-2 text-right">
                        <Button type="button" size="sm" onClick={() => handleEdit(brand)} className="cursor-pointer">
                          Editar
                        </Button>
                        {brand.logoPng && !brand.logoSvg && (
                          <Button type="button" size="sm" variant="secondary" onClick={() => handleConvert(brand.id)} className="cursor-pointer">
                            PNG a SVG
                          </Button>
                        )}
                        <DeleteActionsGuard>
                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDelete(brand.id)}
                          >
                            Eliminar
                          </Button>
                        </DeleteActionsGuard>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-4 rounded-xl border border-border/70 bg-card/70 p-4 shadow-sm md:flex-row md:items-center md:justify-between">
          <div className="flex items-center justify-between gap-2 md:justify-start">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="cursor-pointer"
            >
              Anterior
            </Button>
            <span className="text-sm font-medium text-muted-foreground">
              Página {page} de {Math.ceil(total / pageSize) || 1}
            </span>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() =>
                setPage((p) =>
                  p < Math.ceil(total / pageSize) ? p + 1 : p,
                )
              }
              disabled={page >= Math.ceil(total / pageSize)}
              className="cursor-pointer"
            >
              Siguiente
            </Button>
          </div>
          <div className="flex flex-col gap-2 text-sm text-muted-foreground sm:flex-row sm:items-center">
            <Label htmlFor="pageSize" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Por página
            </Label>
            <select
              id="pageSize"
              value={pageSize}
              onChange={(e) => {
                setPageSize(parseInt(e.target.value));
                setPage(1);
              }}
              className="w-full cursor-pointer rounded-lg border border-border/70 bg-background px-3 py-2 text-sm text-foreground shadow-sm sm:w-32"
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
