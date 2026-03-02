import {
  Activity,
  BarChart3,
  Brain,
  ShieldCheck,
  Users,
} from "lucide-react"
import type { GuideStep } from "@/components/page-guide-dialog"

export const mlAnalyticsGuideSteps: GuideStep[] = [
  {
    icon: <Brain className="h-5 w-5" />,
    title: "Estado de Modelos",
    description:
      "Visualiza el estado de los 5 modelos de inteligencia artificial entrenados. Cada tarjeta muestra si el modelo esta cargado y cuantos registros tiene disponibles.",
    tips: [
      "Los modelos se entrenan localmente con scripts de Python y se cargan automaticamente al iniciar el servidor.",
      "Usa el boton 'Recargar modelos' despues de reentrenar para actualizar sin reiniciar.",
      "Un badge rojo indica que el modelo no tiene datos — ejecuta los scripts de entrenamiento primero.",
    ],
  },
  {
    icon: <Activity className="h-5 w-5" />,
    title: "Prediccion de Demanda",
    description:
      "Consulta la prediccion de demanda para los proximos 7 dias de cualquier producto. El grafico muestra la demanda esperada con bandas de confianza.",
    tips: [
      "Ingresa el ID del producto para obtener su forecast.",
      "Prophet se usa cuando hay suficientes datos historicos; si no, se usa media movil.",
      "Las bandas sombreadas representan el intervalo de confianza (yhat_lower / yhat_upper).",
    ],
  },
  {
    icon: <BarChart3 className="h-5 w-5" />,
    title: "Productos Relacionados",
    description:
      "Descubre que productos se compran frecuentemente juntos usando analisis de canasta de mercado (Market Basket Analysis).",
    tips: [
      "El 'lift' indica cuanto mas probable es comprar ambos juntos vs. independiente.",
      "La 'confianza' es la probabilidad de comprar el producto B dado que ya compro A.",
      "Util para armar promociones de paquetes o sugerencias de cross-selling.",
    ],
  },
  {
    icon: <ShieldCheck className="h-5 w-5" />,
    title: "Detector de Precios",
    description:
      "Verifica si un precio es normal o anomalo para un producto dado. El sistema usa rangos estadisticos (percentiles 5-95) para detectar valores fuera de lo comun.",
    tips: [
      "Ingresa el ID del producto y el precio a verificar.",
      "Verde = precio normal. Rojo = anomalia detectada con explicacion.",
      "La barra visual muestra donde cae el precio dentro del rango historico.",
    ],
  },
  {
    icon: <Users className="h-5 w-5" />,
    title: "Segmentos de Clientes",
    description:
      "Visualiza la segmentacion de clientes basada en el modelo RFM (Recencia, Frecuencia, Monto). Los clientes se agrupan automaticamente por su comportamiento de compra.",
    tips: [
      "El grafico circular muestra la distribucion de clientes por segmento.",
      "Cada segmento incluye metricas promedio de recencia, frecuencia y monto.",
      "Identifica clientes VIP, frecuentes, en riesgo y perdidos para acciones de marketing.",
    ],
  },
]
