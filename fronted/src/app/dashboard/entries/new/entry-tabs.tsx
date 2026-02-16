"use client"

import { useState, useEffect } from "react"
import { Zap, ClipboardList } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import EntriesForm from "./entries.form"
import { QuickEntryView } from "./quick-entry-view"

type EntryTabsProps = {
  categories: any
}

const activeStyle: React.CSSProperties = {
  color: "rgb(59, 130, 246)",
  boxShadow: "0 0 10px rgba(59, 130, 246, 0.35), 0 0 2px rgba(59, 130, 246, 0.2)",
}

const ENTRY_TAB_PREFERENCE_KEY = "entries-tab-preference"

export function EntryTabs({ categories }: EntryTabsProps) {
  // Initialize with "quick" to match server-side render
  const [activeTab, setActiveTab] = useState<string>("quick")
  const [isHydrated, setIsHydrated] = useState(false)

  // Load saved preference from localStorage after hydration
  useEffect(() => {
    const saved = localStorage.getItem(ENTRY_TAB_PREFERENCE_KEY)
    if (saved) {
      setActiveTab(saved)
    }
    setIsHydrated(true)
  }, [])

  // Save preference when tab changes
  const handleTabChange = (value: string) => {
    setActiveTab(value)
    if (typeof window !== "undefined") {
      localStorage.setItem(ENTRY_TAB_PREFERENCE_KEY, value)
    }
  }

  return (
    <Tabs
      value={activeTab}
      className="mx-auto w-full max-w-7xl"
      onValueChange={handleTabChange}
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
              Entrada rapida con grid visual
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

      <TabsContent value="quick" forceMount className="data-[state=inactive]:hidden">
        <QuickEntryView categories={categories} />
      </TabsContent>

      <TabsContent value="full" forceMount className="data-[state=inactive]:hidden">
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="pt-5 text-center text-xl font-bold">
              Ingresar nuevo registro
            </CardTitle>
          </CardHeader>
          <CardContent className="px-0 sm:px-6">
            <EntriesForm entries={null} categories={categories} />
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}
