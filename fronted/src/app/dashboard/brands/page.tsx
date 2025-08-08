"use client";

import { useState, useEffect, FormEvent } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { createBrand, getBrands, uploadLogo } from './brands.api';

interface Brand {
  id: number;
  name: string;
  svgLogo?: string;
  pngLogo?: string;
}

export default function BrandsPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [name, setName] = useState('');
  const [svgFile, setSvgFile] = useState<File | null>(null);
  const [pngFile, setPngFile] = useState<File | null>(null);

  useEffect(() => {
    fetchBrands();
  }, []);

  async function fetchBrands() {
    try {
      const data = await getBrands();
      setBrands(data);
    } catch (err) {
      console.error(err);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      let svgUrl: string | undefined;
      let pngUrl: string | undefined;

      if (svgFile) {
        const res = await uploadLogo(svgFile);
        svgUrl = res.url;
      }
      if (pngFile) {
        const res = await uploadLogo(pngFile);
        pngUrl = res.url;
      }

      await createBrand({ name, svgLogo: svgUrl, pngLogo: pngUrl });
      setName('');
      setSvgFile(null);
      setPngFile(null);
      await fetchBrands();
    } catch (err) {
      console.error(err);
    }
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
          <Button type="submit">Guardar</Button>
        </form>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>SVG</TableHead>
              <TableHead>PNG</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {brands.map((brand) => (
              <TableRow key={brand.id}>
                <TableCell>{brand.name}</TableCell>
                <TableCell>
                  {brand.svgLogo && <img src={brand.svgLogo} alt={brand.name} className="h-8" />}
                </TableCell>
                <TableCell>
                  {brand.pngLogo && <img src={brand.pngLogo} alt={brand.name} className="h-8" />}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}