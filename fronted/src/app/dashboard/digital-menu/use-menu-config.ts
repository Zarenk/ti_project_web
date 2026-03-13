"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useTenantSelection } from "@/context/tenant-selection-context"
import { queryKeys } from "@/lib/query-keys"
import { toast } from "sonner"
import {
  getMenuConfig,
  updateMenuConfig,
  type MenuConfigData,
  type MenuConfigResponse,
} from "./digital-menu.api"

export function useMenuConfig() {
  const { selection } = useTenantSelection()
  const queryClient = useQueryClient()
  const qk = queryKeys.menuConfig.detail(selection.orgId, selection.companyId)

  const query = useQuery<MenuConfigResponse>({
    queryKey: qk,
    queryFn: getMenuConfig,
    enabled: selection.orgId !== null,
  })

  const mutation = useMutation({
    mutationFn: (data: Partial<MenuConfigData>) =>
      updateMenuConfig(data, query.data?.updatedAt),
    onSuccess: (result) => {
      queryClient.setQueryData(qk, result)
      toast.success("Menu actualizado")
    },
    onError: (err: Error) => {
      toast.error(err.message || "Error al guardar")
    },
  })

  return {
    config: query.data?.data ?? null,
    updatedAt: query.data?.updatedAt ?? null,
    isLoading: query.isLoading,
    isSaving: mutation.isPending,
    save: mutation.mutate,
    refetch: query.refetch,
  }
}
