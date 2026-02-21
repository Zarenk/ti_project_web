"use client"

import { useState } from "react"
import { Zap, ClipboardList } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { SalesForm } from "./sales-form"
import { QuickSaleView } from "./quick-sale-view"
import { PageGuideButton } from "@/components/page-guide-dialog"
import { SALE_FORM_GUIDE_STEPS } from "./sale-form-guide-steps"

type SaleTabsProps = {
  categories: any
}

const activeStyle: React.CSSProperties = {
  color: "rgb(59, 130, 246)",
  boxShadow:
    "0 0 10px rgba(59, 130, 246, 0.35), 0 0 2px rgba(59, 130, 246, 0.2)",
}

export function SaleTabs({ categories }: SaleTabsProps) {
  const [activeTab, setActiveTab] = useState("quick")

  return (
    <Tabs
      defaultValue="quick"
      className="mx-auto w-full max-w-7xl"
      onValueChange={setActiveTab}
    >
      <TooltipProvider delayDuration={200}>
        <TabsList className="mb-4">
          <Tooltip>
            <TooltipTrigger asChild>
              <TabsTrigger
                value="quick"
                className="cursor-pointer gap-1.5 px-4 transition-all duration-200"
                style={activeTab === "quick" ? activeStyle : undefined}
              >
                <Zap className="h-4 w-4" />
                <span className="hidden sm:inline">Rapida</span>
              </TabsTrigger>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              Venta rapida con grid visual
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <TabsTrigger
                value="full"
                className="cursor-pointer gap-1.5 px-4 transition-all duration-200"
                style={activeTab === "full" ? activeStyle : undefined}
              >
                <ClipboardList className="h-4 w-4" />
                <span className="hidden sm:inline">Formulario</span>
              </TabsTrigger>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              Formulario completo con todos los campos
            </TooltipContent>
          </Tooltip>
        </TabsList>
      </TooltipProvider>

      <TabsContent
        value="quick"
        forceMount
        className="data-[state=inactive]:hidden"
      >
        <QuickSaleView categories={categories} />
      </TabsContent>

      <TabsContent
        value="full"
        forceMount
        className="data-[state=inactive]:hidden"
      >
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-center gap-2 pt-5">
              <CardTitle className="text-center text-xl font-bold">
                Registrar nueva venta
              </CardTitle>
              <PageGuideButton steps={SALE_FORM_GUIDE_STEPS} tooltipLabel="Guía del formulario" />
            </div>
          </CardHeader>
          <CardContent className="w-full">
            <SalesForm sales={null} categories={categories} />
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}
