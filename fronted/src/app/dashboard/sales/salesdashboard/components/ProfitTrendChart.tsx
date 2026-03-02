"use client"

import { useEffect, useState } from "react"

interface MonthData {
  month: string
  profit: number
  changePercent: number
}

interface ProfitTrendChartProps {
  monthlyData: MonthData[]
}

export function ProfitTrendChart({
  monthlyData,
}: ProfitTrendChartProps) {
  const [animationKey, setAnimationKey] = useState(0)

  useEffect(() => {
    // Reiniciar animación cada 15 segundos (ciclo completo)
    const interval = setInterval(() => {
      setAnimationKey(prev => prev + 1)
    }, 15000)

    return () => clearInterval(interval)
  }, [])

  const getTrendColor = (changePercent: number) => {
    if (changePercent > 2) return '#10b981' // green-500
    if (changePercent < -2) return '#ef4444' // red-500
    return '#f97316' // orange-500
  }

  // Acortar nombres de mes
  const shortenMonth = (monthName: string) => {
    return monthName
      .replace('Enero', 'Ene')
      .replace('Febrero', 'Feb')
      .replace('Marzo', 'Mar')
      .replace('Abril', 'Abr')
      .replace('Mayo', 'May')
      .replace('Junio', 'Jun')
      .replace('Julio', 'Jul')
      .replace('Agosto', 'Ago')
      .replace('Septiembre', 'Sep')
      .replace('Octubre', 'Oct')
      .replace('Noviembre', 'Nov')
      .replace('Diciembre', 'Dic')
  }

  // Tomar los últimos 12 meses (máximo) y revertir para que el más antiguo esté primero
  const dataToShow = monthlyData.slice(0, 12).reverse()

  if (dataToShow.length === 0) {
    return <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
      Sin datos históricos
    </div>
  }

  // Calcular valores min/max para escala
  const maxValue = Math.max(...dataToShow.map(d => d.profit), 1)
  const minValue = Math.min(...dataToShow.map(d => d.profit), 0)
  const range = maxValue - minValue
  const padding = range * 0.2

  // Generar puntos distribuidos horizontalmente
  const numPoints = dataToShow.length
  const xPadding = 8
  const xRange = 100 - 2 * xPadding
  const xStep = xRange / Math.max(numPoints - 1, 1)

  const points = dataToShow.map((month, index) => {
    const x = xPadding + index * xStep
    const y = 78 - ((month.profit - minValue + padding) / (maxValue - minValue + 2 * padding)) * 58

    return {
      label: shortenMonth(month.month),
      value: month.profit,
      changePercent: month.changePercent,
      x,
      y,
      delay: index * 100,
    }
  })

  // Generar curvas suaves con bezier para todos los puntos
  const generateSmoothCurve = () => {
    if (points.length === 0) return ''
    if (points.length === 1) return `M ${points[0].x} ${points[0].y}`

    const tension = 0.4
    let path = `M ${points[0].x} ${points[0].y}`

    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[Math.max(0, i - 1)]
      const p1 = points[i]
      const p2 = points[i + 1]
      const p3 = points[Math.min(points.length - 1, i + 2)]

      // Calcular puntos de control para curva suave
      const cp1x = p1.x + (p2.x - p0.x) / 6 * tension
      const cp1y = p1.y + (p2.y - p0.y) / 6 * tension

      const cp2x = p2.x - (p3.x - p1.x) / 6 * tension
      const cp2y = p2.y - (p3.y - p1.y) / 6 * tension

      path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`
    }

    return path
  }

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <svg
        viewBox="0 0 100 100"
        className="w-full h-full"
        style={{ overflow: 'visible' }}
      >
        {/* Gradiente dinámico basado en tendencias de cada segmento */}
        <defs>
          <linearGradient id={`line-gradient-${animationKey}`} x1="0%" y1="0%" x2="100%" y2="0%">
            {points.map((point, index) => {
              if (index === 0) return null
              const color = getTrendColor(points[index - 1].changePercent)
              const offset = ((index - 1) / (points.length - 1)) * 100
              return (
                <stop key={index} offset={`${offset}%`} stopColor={color} />
              )
            })}
            {points.length > 0 && (
              <stop offset="100%" stopColor={getTrendColor(points[points.length - 1].changePercent)} />
            )}
          </linearGradient>
        </defs>

        {/* Curva ondulada con gradiente de color */}
        <path
          key={`curve-${animationKey}`}
          d={generateSmoothCurve()}
          fill="none"
          stroke={`url(#line-gradient-${animationKey})`}
          strokeWidth="2.5"
          strokeLinecap="round"
          className="animate-draw-curve"
          style={{
            strokeDasharray: 300,
          }}
        />

        {/* Puntos de datos */}
        {points.map((point, index) => {
          const trendColor = index === 0 ? '#64748b' : getTrendColor(point.changePercent)

          // Ajustar posición del texto para evitar superposición
          const textOffset = -12
          const textAnchor = 'middle'

          // Delay de animación escalonado
          const animationDelay = index * 0.1

          // Determinar si es un punto par/impar para alternar posición vertical de valores
          const isOdd = index % 2 === 1
          const valueOffset = isOdd ? textOffset - 5 : textOffset

          return (
            <g key={`${index}-${animationKey}`}>
              {/* Círculo principal simple */}
              <circle
                cx={point.x}
                cy={point.y}
                r="3.5"
                fill={trendColor}
                stroke="white"
                strokeWidth="2"
                className="animate-point-appear"
                style={{
                  transformOrigin: `${point.x}px ${point.y}px`,
                  animationDelay: `${animationDelay}s`,
                }}
              />

              {/* Etiqueta de período */}
              <text
                x={point.x}
                y="92"
                textAnchor="middle"
                className="text-[3.5px] fill-muted-foreground font-medium animate-text-appear"
                style={{
                  animationDelay: `${animationDelay + 0.05}s`,
                }}
              >
                {point.label}
              </text>

              {/* Valor */}
              <text
                x={point.x}
                y={point.y + valueOffset}
                textAnchor={textAnchor}
                className="text-[5.5px] font-bold animate-text-appear"
                fill={trendColor}
                style={{
                  animationDelay: `${animationDelay + 0.05}s`,
                }}
              >
                S/. {(point.value / 1000).toFixed(1)}k
              </text>
            </g>
          )
        })}
      </svg>

      <style jsx>{`
        @keyframes draw-curve {
          0% {
            stroke-dashoffset: 300;
            opacity: 0;
          }
          16.67% {
            stroke-dashoffset: 0;
            opacity: 0.9;
          }
          83.33% {
            stroke-dashoffset: 0;
            opacity: 0.9;
          }
          88% {
            stroke-dashoffset: -300;
            opacity: 0;
          }
          100% {
            stroke-dashoffset: -300;
            opacity: 0;
          }
        }

        @keyframes point-appear {
          0%, 16.67% {
            transform: scale(0);
            opacity: 0;
          }
          20% {
            transform: scale(1);
            opacity: 1;
          }
          83.33% {
            transform: scale(1);
            opacity: 1;
          }
          88% {
            transform: scale(0);
            opacity: 0;
          }
          100% {
            transform: scale(0);
            opacity: 0;
          }
        }

        @keyframes text-appear {
          0%, 20% {
            opacity: 0;
          }
          23% {
            opacity: 1;
          }
          83.33% {
            opacity: 1;
          }
          88% {
            opacity: 0;
          }
          100% {
            opacity: 0;
          }
        }

        .animate-draw-curve {
          animation: draw-curve 12s ease-in-out infinite;
        }

        .animate-point-appear {
          animation: point-appear 12s ease-in-out infinite;
        }

        .animate-text-appear {
          animation: text-appear 12s ease-in-out infinite;
        }
      `}</style>
    </div>
  )
}
