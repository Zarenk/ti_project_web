'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Lightbulb } from 'lucide-react';

export function ContextualHelpCard() {
  return (
    <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-200 dark:border-blue-900">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <CardTitle className="text-base font-semibold">
            Entiende tu contabilidad
          </CardTitle>
        </div>
        <CardDescription>
          Tu negocio explicado en términos simples
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100">
            ¿Qué significan estos números?
          </h4>
          <p className="text-sm text-blue-800 dark:text-blue-200 leading-relaxed">
            Este dashboard te muestra el estado financiero de tu negocio de forma automática.
            Cada vez que haces una venta o compra, el sistema actualiza estas cifras
            siguiendo las normas contables de Perú (SUNAT).
          </p>
        </div>

        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100">
            💡 Consejos rápidos
          </h4>
          <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1.5">
            <li className="flex items-start gap-2">
              <span className="text-blue-600 dark:text-blue-400 mt-0.5">•</span>
              <span>
                <strong>Dinero disponible:</strong> Es lo que puedes gastar ahora. Si baja mucho,
                necesitas vender más o gastar menos.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 dark:text-blue-400 mt-0.5">•</span>
              <span>
                <strong>Inventario:</strong> Es dinero "guardado" en productos. Si crece mucho,
                considera vender antes de comprar más.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 dark:text-blue-400 mt-0.5">•</span>
              <span>
                <strong>Impuestos:</strong> Es dinero que debes separar para SUNAT. No es tuyo,
                aunque esté en tu caja.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 dark:text-blue-400 mt-0.5">•</span>
              <span>
                <strong>Ganancia:</strong> Es lo que realmente ganaste este mes. Si el margen es
                bajo (&lt;20%), ajusta tus precios.
              </span>
            </li>
          </ul>
        </div>

        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100">
            🔍 ¿Tienes dudas?
          </h4>
          <p className="text-sm text-blue-800 dark:text-blue-200">
            Pasa el mouse sobre el ícono{' '}
            <span className="inline-flex items-center">
              <Lightbulb className="h-3.5 w-3.5 mx-1" />
            </span>{' '}
            junto a cada métrica para ver una explicación simple. Haz click para más detalles.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
