'use client'

import { useState } from 'react';
import { createTipoCambio } from '../exchange.api';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export default function TipoCambioForm() {
  const [fecha, setFecha] = useState<Date | undefined>(new Date());
  const [moneda, setMoneda] = useState('USD');
  const [valor, setValor] = useState('');
  const router = useRouter(); // ✅

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fecha) return;
    try {
      await createTipoCambio({
        fecha: fecha.toISOString().split('T')[0],
        moneda,
        valor: parseFloat(valor),
      });
      toast.success('✅ Tipo de cambio registrado correctamente');
      router.push('/dashboard/exchange'); // ✅ Redirección
    } catch (error) {
      toast.error('❌ Error al registrar el tipo de cambio');
    }
  };

  return (
    <Card className="max-w-md mx-auto mt-10 shadow-xl">
      <CardContent className="p-6">
        <h2 className="text-xl font-bold mb-6">Registrar Tipo de Cambio</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Fecha:</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                >
                  {fecha ? format(fecha, 'yyyy-MM-dd') : <span>Selecciona una fecha</span>}
                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar mode="single" selected={fecha} onSelect={setFecha} initialFocus />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label>Moneda:</Label>
            <select
              value={moneda}
              onChange={(e) => setMoneda(e.target.value)}
              className="w-full p-2 border rounded bg-background"
            >
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label>Valor en Soles:</Label>
            <Input
              type="number"
              step="0.0001"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              required
            />
          </div>

          <Button type="submit" className="w-full">
            Registrar
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}