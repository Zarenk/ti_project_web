'use client'

import { FileSpreadsheet, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useRouter } from 'next/navigation';

interface UploadSectionProps {
  register: any;
  handlePDFUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  handlePDFGuiaUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  currency: string;
  onCurrencyChange: (value: 'USD' | 'PEN') => void;
}

export function UploadSection({
  register,
  handlePDFUpload,
  handlePDFGuiaUpload,
  currency,
  onCurrencyChange,
}: UploadSectionProps) {

  const router = useRouter();

  return (
    <div className="flex-1 flex-col border rounded-md p-2">
      <div className="flex justify-start sm:justify-between gap-1 mb-2">
        <Button
          className="sm:w-auto ml-0 bg-green-700 hover:bg-green-800 text-white text-xs"
          type="button"
          onClick={() => router.push("/dashboard/entries/excel-upload")}
          title="Carga un archivo Excel para registrar múltiples productos automáticamente"
        >
          <span className="hidden sm:block">Subir Excel</span>
          <FileSpreadsheet className="w-2 h-2" />
        </Button>
        <Button
          className="sm:w-auto ml-0 bg-blue-700 hover:bg-blue-800 text-white text-xs"
          type="button"
          onClick={() => document.getElementById("pdf-upload")?.click()}
          title="Selecciona un comprobante en PDF para completar los datos de manera automática"
        >
          <span className="hidden sm:block">Subir Factura PDF</span>
          <FileText className="w-2 h-2" />
        </Button>
        <input
          type="file"
          id="pdf-upload"
          accept="application/pdf"
          className="hidden"
          onChange={handlePDFUpload}
        />
        <Button
          className="sm:w-auto ml-0 bg-yellow-700 hover:bg-yellow-800 text-white text-xs"
          type="button"
          onClick={() => document.getElementById("pdf-guia-upload")?.click()}
          title="Adjunta la guía de remisión en PDF para mantener el registro documental"
        >
          <span className="hidden sm:block">Subir Guia PDF</span>
          <FileText className="w-2 h-2" />
        </Button>
        <input
          type="file"
          id="pdf-guia-upload"
          accept="application/pdf"
          className="hidden"
          onChange={handlePDFGuiaUpload}
        />
      </div>

      <Label className="text-sm font-medium mb-2">Fecha de Emision</Label>
      <Input
        {...register("fecha_emision_comprobante")}
        readOnly
        title="Muestra la fecha de emisión detectada en el comprobante"
      />

      <div className="flex justify-start gap-1">
        <div className="flex flex-col">
        <Label className="text-sm font-medium py-2 mr-20 sm:mr-12 md:mr-0 xl:mr-12">Comprobante</Label>
        <Input
          {...register("comprobante")}
          readOnly
          title="Identifica el tipo de comprobante cargado"
        />
        </div>
        <div className="flex flex-col">
        <Label className="text-sm font-medium py-2">Serie</Label>
        <Input
          {...register("serie")}
          readOnly
          title="Serie del comprobante extraída del documento"
        />
        </div>
      </div>

      <div className="flex justify-start gap-1">
        <div className="flex flex-col">
          <Label className="text-sm font-medium py-2">Total</Label>
          <Input
            {...register("total_comprobante")}
            readOnly
            title="Importe total del comprobante identificado"
          />
        </div>
        <div className="flex flex-col">
          <Label className="text-sm font-medium py-2">Moneda</Label>
          <Select
            value={currency}
            onValueChange={(value) => onCurrencyChange(value as 'USD' | 'PEN')}
          >
            <SelectTrigger title="Selecciona la moneda con la que deseas trabajar este ingreso">
              <SelectValue placeholder="Selecciona una moneda" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PEN" title="Trabajarás el ingreso en soles peruanos">Soles (PEN)</SelectItem>
              <SelectItem value="USD" title="Trabajarás el ingreso en dólares estadounidenses">Dólares (USD)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}