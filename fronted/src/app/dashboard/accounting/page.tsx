import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const links = [
  { title: "Plan de Cuentas", href: "/dashboard/accounting/chart" },
  { title: "Diarios", href: "/dashboard/accounting/journals" },
  { title: "Asientos", href: "/dashboard/accounting/entries" },
  { title: "Libro Mayor", href: "/dashboard/accounting/reports/ledger" },
  { title: "Balance de Comprobación", href: "/dashboard/accounting/reports/trial-balance" },
]

export default function AccountingDashboard() {
  return (
    <div className="grid gap-4 md:gap-8">
      {links.map((link) => (
        <Card key={link.href}>
          <CardHeader>
            <CardTitle>{link.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <Link href={link.href} className="text-sm text-primary hover:underline">
              Ir a {link.title}
            </Link>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}