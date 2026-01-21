"use client"

import { useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type OrganizationOption = {
  id: number
  name: string
  code?: string | null
}

type Props = {
  organizations: OrganizationOption[]
  selectedOrgId: number | null
  query: string
  total: number
}

export function OrganizationFilterBar({
  organizations,
  selectedOrgId,
  query,
  total,
}: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [searchValue, setSearchValue] = useState(query)
  const [isFocused, setIsFocused] = useState(false)
  const normalizedQuery = searchValue.trim().toLowerCase()

  const selectValue = selectedOrgId ? String(selectedOrgId) : "all"
  const countLabel = useMemo(
    () => `${total} organizacion${total === 1 ? "" : "es"} encontradas`,
    [total],
  )
  const filteredOrganizations = useMemo(() => {
    if (!normalizedQuery) {
      return []
    }
    return organizations
      .filter((org) => {
        const name = org.name.toLowerCase()
        const code = org.code?.toLowerCase() ?? ""
        return name.includes(normalizedQuery) || code.includes(normalizedQuery)
      })
      .slice(0, 8)
  }, [normalizedQuery, organizations])

  const updateParams = (next: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams?.toString())
    Object.entries(next).forEach(([key, value]) => {
      if (!value) {
        params.delete(key)
        return
      }
      params.set(key, value)
    })
    params.delete("page")
    router.replace(`?${params.toString()}`)
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg bg-slate-50/80 p-4 text-sm shadow-sm dark:bg-slate-900/60">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative w-full sm:max-w-xs">
            <Input
              placeholder="Buscar organizacion por nombre o codigo"
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => {
                setIsFocused(false)
                updateParams({ q: searchValue.trim() || null })
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  updateParams({ q: searchValue.trim() || null })
                }
              }}
              className="w-full"
            />
            {isFocused && filteredOrganizations.length > 0 ? (
              <div className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-md border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-950">
                <div className="max-h-56 overflow-auto py-1 text-xs">
                  {filteredOrganizations.map((org) => (
                    <button
                      key={org.id}
                      type="button"
                      className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-900"
                      onMouseDown={(event) => {
                        event.preventDefault()
                        setSearchValue(org.name)
                        setIsFocused(false)
                        updateParams({
                          q: org.name,
                          orgId: String(org.id),
                        })
                      }}
                    >
                      <span className="truncate">{org.name}</span>
                      {org.code ? (
                        <span className="shrink-0 text-[10px] text-slate-400 dark:text-slate-500">
                          {org.code}
                        </span>
                      ) : null}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
          <Select
            value={selectValue}
            onValueChange={(value) =>
              updateParams({
                orgId: value === "all" ? null : value,
              })
            }
          >
            <SelectTrigger className="w-full sm:max-w-xs">
              <SelectValue placeholder="Selecciona una organizacion" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las organizaciones</SelectItem>
              {organizations.map((org) => (
                <SelectItem key={org.id} value={String(org.id)}>
                  {org.name}
                  {org.code ? ` (${org.code})` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 dark:text-slate-300">
            {countLabel}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSearchValue("")
              router.replace("?")
            }}
          >
            Limpiar
          </Button>
        </div>
      </div>
    </div>
  )
}
