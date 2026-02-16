import { TablePageSkeleton } from "@/components/table-page-skeleton";

export default function ClientsLoading() {
  return <TablePageSkeleton title={true} filters={3} columns={5} rows={8} actions={true} />;
}
