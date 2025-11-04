"use client"

import { useTenantSelection } from "@/context/tenant-selection-context"
import { useEffect, useMemo, useState } from "react"
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip, Legend } from "recharts"
import { getRevenueByCategoryByRange } from "../sales.api"
import { DateRange } from "react-day-picker"
import { endOfDay } from "date-fns"

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"]

export function RevenueByCategory({ dateRange }: { dateRange: DateRange }) {
  const [data, setData] = useState<{ name: string; value: number; percent: string; }[]>([])
  const [radius, setRadius] = useState(90);
  const { selection, version } = useTenantSelection()
  const selectionKey = useMemo(
    () => `${selection.orgId ?? "none"}-${selection.companyId ?? "none"}-${version}`,
    [selection.orgId, selection.companyId, version],
  )

  const calculateDataWithPercentage = (data: { name: string; value: number }[]) => {
    const total = data.reduce((acc, item) => acc + item.value, 0)
    const withPercent = data.map(item => ({
      ...item,
      percent: ((item.value / total) * 100).toFixed(1),
    }))
    // Ordenar por porcentaje descendente
    return withPercent.sort((a, b) => parseFloat(b.percent) - parseFloat(a.percent))
  }

  useEffect(() => {
    async function fetchData() {
      try {
        if (!dateRange?.from || !dateRange?.to) return;
  
        const from = dateRange.from.toISOString();
        const to = endOfDay(dateRange.to).toISOString();
  
        const revenueData = await getRevenueByCategoryByRange(from, to);
        const withPercent = calculateDataWithPercentage(revenueData);
        setData(withPercent);
      } catch (error) {
        console.error("Error al cargar ingresos por categoría:", error);
      }
    }
  
    fetchData();
  }, [dateRange, selectionKey]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 640) {
        setRadius(60); // más pequeño en móviles
      } else {
        setRadius(90);
      }
    };
  
    handleResize(); // inicial
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
      
  return (
    <div className="w-full overflow-hidden">
      <ResponsiveContainer width="100%" height={300} >
        <PieChart        >
          <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={true}
              outerRadius={radius}
              fill="#8884d8"
              dataKey="value"
              label={({ name, payload, x, y }) => (
                <text
                  x={x}
                  y={y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={11} // 👈 Cambia aquí el tamaño del 'name'
                  fill={payload?.fill || "#000"} // ✅ Usa el color correspondiente
                >
                  {`${name} ${payload?.percent}%`}
                </text>
              )}
            >
              {data.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
          </Pie>
          <Tooltip />
          <Legend
            layout="horizontal"
            align="center"
            verticalAlign="bottom"
            wrapperStyle={{
              marginTop: 16,
              fontSize: "9px",
              maxWidth: "100%",
              overflow: "visible",
              textOverflow: "ellipsis",
              whiteSpace: "normal", // <- CAMBIO CLAVE
              display: "flex",
              justifyContent: "center",
              flexWrap: "wrap",     // <- PERMITE MULTILÍNEA
              rowGap: "4px",         // <- Opcional: mejora separación entre filas
              padding: "0 8px",      // <- Opcional: evita que quede muy pegado a los bordes
            }}
            payload={data.map((entry, index) => ({
              value: `${entry.name} (${entry.percent}%)`,
              type: "square",
              id: entry.name,
              color: COLORS[index % COLORS.length],
            }))}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
