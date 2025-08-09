"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function Actividad() {
  return (
    <Card className="border-sky-100 shadow-sm transition-shadow hover:shadow-md dark:border-slate-700 dark:bg-slate-800">
      <CardHeader>
        <CardTitle className="text-slate-800 dark:text-slate-100">Actividad</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-slate-500 dark:text-slate-400">Sin actividad registrada.</p>
      </CardContent>
    </Card>
  )
}