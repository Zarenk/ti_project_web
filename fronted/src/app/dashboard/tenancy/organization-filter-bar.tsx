"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Search, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type Props = {
  query: string
  total: number
}

export function OrganizationFilterBar({ query, total }: Props) {
  const router = useRouter()
  const [searchValue, setSearchValue] = useState(query)

  const applySearch = () => {
    const trimmed = searchValue.trim()
    if (trimmed) {
      router.replace(`?q=${encodeURIComponent(trimmed)}`)
    } else {
      router.replace("?")
    }
  }

  const clearSearch = () => {
    setSearchValue("")
    router.replace("?")
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="relative w-full sm:max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por nombre o codigo..."
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") applySearch()
          }}
          className="pl-9 pr-9"
        />
        {searchValue && (
          <button
            type="button"
            onClick={clearSearch}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs text-muted-foreground">
          {total} resultado{total === 1 ? "" : "s"}
        </span>
        {query && (
          <Button variant="outline" size="sm" onClick={clearSearch}>
            Limpiar
          </Button>
        )}
      </div>
    </div>
  )
}
