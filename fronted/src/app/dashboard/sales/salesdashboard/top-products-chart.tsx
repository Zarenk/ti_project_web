"use client"

import { useEffect, useState } from "react"
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts"
import { getTopProducts } from "../sales.api"
import { DateRange } from "react-day-picker"
import { useTheme } from "next-themes"

interface Props {
  dateRange: DateRange
}

export function TopProductsChart({ dateRange }: Props) {
  const [data, setData] = useState<{ name: string; sales: number }[]>([])
  const [yAxisWidth, setYAxisWidth] = useState<number>(120)
  const [yAxisFontSize, setYAxisFontSize] = useState<number>(12);
  const { theme } = useTheme()
  const textColor = theme === "dark" ? "#FFFFFF" : "#000000"

  useEffect(() => {
    // Solo se ejecuta en cliente
    const handleResize = () => {
      if (typeof window !== "undefined") {
        setYAxisWidth(window.innerWidth < 640 ? 80 : 120)
      }
    }

    handleResize() // inicial
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  useEffect(() => {
    const fetchData = async () => {
      try {
        let topProducts

        if (dateRange?.from && dateRange?.to) {
          const from = dateRange.from.toISOString()
          const to = dateRange.to.toISOString()
          topProducts = await getTopProducts({ from, to })
        } else {
          topProducts = await getTopProducts({ type: "month" })
        }

        setData(topProducts)
      } catch (error) {
        console.error("Error al obtener productos más vendidos:", error)
      }
    }

    fetchData()
  }, [dateRange])

  useEffect(() => {
    const handleResize = () => {
      if (typeof window !== "undefined") {
        const isMobile = window.innerWidth < 640;
        setYAxisWidth(isMobile ? 80 : 120);
        setYAxisFontSize(isMobile ? 10 : 12); // Aquí reduces el tamaño en móviles
      }
    };
  
    handleResize(); // Ejecuta al cargar
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        barCategoryGap={20} // 👈 Aquí separas más verticalmente las barras
      >
        <XAxis
          type="number"
          tickLine={false}
          axisLine={false}
          style={{ fontSize: "12px" }}
        />
        <YAxis
          dataKey="name"
          type="category"
          tickLine={false}
          axisLine={false}
          width={yAxisWidth}
          tick={({ x, y, payload }) => {
            const isMobile = typeof window !== "undefined" && window.innerWidth < 640;
            const text = payload.value;
          
            if (isMobile) {
              // En móviles, truncamos
              const displayText = text.length > 12 ? text.slice(0, 10) + "..." : text;
              return (
                <text
                  x={x}
                  y={y + 4}
                  fill={textColor}
                  fontSize={yAxisFontSize}
                  textAnchor="end"
                >
                  {displayText}
                </text>
              );
            } else {
              // En pantallas grandes, dividimos en líneas cada 14 caracteres aprox.
              const words = text.match(/.{1,14}/g) || [];
          
              return (
                <text
                  x={x}
                  y={y - (words.length - 1) * 6} // ajustar vertical según cantidad de líneas
                  fill={textColor}
                  fontSize={yAxisFontSize}
                  textAnchor="end"
                >
                  {words.map((line:any, index:any) => (
                    <tspan key={index} x={x} dy={index === 0 ? "1em" : "1.1em"}>
                      {line}
                    </tspan>
                  ))}
                </text>
              );
            }
          }}
        />
        <Tooltip
          content={({ active, payload, label }) => {
            if (active && payload && payload.length) {
              return (
                <div className="rounded-lg border bg-background p-2 shadow-sm">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col">
                      <span className="text-[0.70rem] uppercase text-muted-foreground">Producto</span>
                      <span className="font-bold text-muted-foreground">{label}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[0.70rem] uppercase text-muted-foreground">Unidades</span>
                      <span className="font-bold">{payload[0].value}</span>
                    </div>
                  </div>
                </div>
              )
            }
            return null
          }}
        />
        <Bar dataKey="sales" radius={[4, 4, 4, 4]} fill="#4FC3F7" barSize={20} />
      </BarChart>
    </ResponsiveContainer>
  )
}
