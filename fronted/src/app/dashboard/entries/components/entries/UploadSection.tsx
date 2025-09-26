'use client'

import { FileSpreadsheet, FileText, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

interface UploadSectionProps {
  register: any;
  handlePDFUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  handlePDFGuiaUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  currency: string;
  onCurrencyChange: (value: 'USD' | 'PEN') => void;
  onToggleCurrency: () => void;
  isConvertingCurrency: boolean;
}

export function UploadSection({
  register,
  handlePDFUpload,
  handlePDFGuiaUpload,
  currency,
  onCurrencyChange,
  onToggleCurrency,
  isConvertingCurrency,
}: UploadSectionProps) {

  const router = useRouter();

  return (
    <div className="flex-1 flex-col border rounded-md p-2">                       
      <div className="flex justify-between gap-1 mb-2">
        <Button
          className="sm:w-auto ml-0 bg-green-700 hover:bg-green-800 text-white text-xs"
          type="button"
          onClick={() => router.push("/dashboard/entries/excel-upload")}
        >
          <span className="hidden sm:block">Subir Excel</span>
          <FileSpreadsheet className="w-2 h-2" />
        </Button>
        <Button
          className="sm:w-auto ml-0 bg-blue-700 hover:bg-blue-800 text-white text-xs"
          type="button"
          onClick={() => document.getElementById("pdf-upload")?.click()}
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
      <Input {...register("fecha_emision_comprobante")} readOnly />

      <div className="flex justify-start gap-1">
        <div className="flex flex-col">
        <Label className="text-sm font-medium py-2 mr-20 sm:mr-12 md:mr-0 xl:mr-12">Comprobante</Label>
        <Input {...register("comprobante")} readOnly />
        </div>
        <div className="flex flex-col">
        <Label className="text-sm font-medium py-2">Serie</Label>
        <Input {...register("serie")} readOnly />
        </div>
      </div>

      <div className="flex justify-start gap-1">
        <div className="flex flex-col">
          <Label className="text-sm font-medium py-2">Total</Label>
          <Input {...register("total_comprobante")} readOnly />
        </div>
        <div className="flex flex-col">
          <Label className="text-sm font-medium py-2">Moneda</Label>
          <Select
            value={currency}
            onValueChange={(value) => onCurrencyChange(value as 'USD' | 'PEN')}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecciona una moneda" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PEN">Soles (PEN)</SelectItem>
              <SelectItem value="USD">Dólares (USD)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <Button
        type="button"
        onClick={onToggleCurrency}
        disabled={isConvertingCurrency}
        className={cn(
          'mt-3 flex w-full items-center justify-center gap-2 rounded-md bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-600 py-2 text-sm font-semibold text-white',
          'shadow-[0_10px_20px_-12px_rgba(59,130,246,0.7)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_20px_35px_-15px_rgba(59,130,246,0.8)]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-400 disabled:cursor-not-allowed disabled:opacity-70'
        )}
      >
        <RefreshCcw className={`h-4 w-4 transition-transform duration-200 ${isConvertingCurrency ? 'animate-spin' : ''}`} />
        {isConvertingCurrency
          ? 'Convirtiendo...'
          : `Convertir a ${currency === 'PEN' ? 'USD' : 'PEN'}`}
      </Button>
    </div>
  );
}