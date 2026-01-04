import VerticalMigrationClient from "./vertical-migration-client"

export const dynamic = "force-dynamic"

export default function VerticalMigrationPage() {
  return (
    <section className="py-2 sm:py-6">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
        <div>
          <p className="text-sm text-muted-foreground">
            Migra tus productos al esquema de variantes requerido por el vertical Retail.
          </p>
        </div>
        <VerticalMigrationClient />
      </div>
    </section>
  )
}
