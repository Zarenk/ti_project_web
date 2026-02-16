import { TablePageSkeleton } from "@/components/table-page-skeleton"

export default function TenancyLoading() {
  return (
    <TablePageSkeleton
      title
      filters={1}
      columns={7}
      rows={6}
      actions={false}
    />
  )
}
