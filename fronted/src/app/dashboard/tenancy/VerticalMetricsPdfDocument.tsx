"use client"

import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer"
import type { VerticalMetricsResponse } from "./tenancy.api"

interface VerticalMetricsPdfProps {
  metrics: VerticalMetricsResponse
  companyName: string
  organizationName: string
}

const BRAND_PRIMARY = "#1e3a5f"
const BRAND_ACCENT = "#2563EB"
const TEXT_MAIN = "#111827"
const TEXT_MUTED = "#64748B"
const BORDER_LIGHT = "#E2E8F0"
const SUCCESS_GREEN = "#10b981"
const WARNING_AMBER = "#f59e0b"
const ERROR_RED = "#ef4444"

const VERTICAL_LABELS: Record<string, string> = {
  GENERAL: "General",
  RESTAURANTS: "Restaurantes",
  RETAIL: "Retail",
  SERVICES: "Servicios",
  MANUFACTURING: "Manufactura",
  COMPUTERS: "Computación",
}

const s = StyleSheet.create({
  page: {
    paddingTop: 40,
    paddingBottom: 40,
    paddingHorizontal: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: TEXT_MAIN,
  },

  /* Header */
  header: {
    marginBottom: 24,
    borderBottom: `2pt solid ${BRAND_PRIMARY}`,
    paddingBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: BRAND_PRIMARY,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 11,
    color: TEXT_MUTED,
    marginBottom: 2,
  },
  metadata: {
    fontSize: 9,
    color: TEXT_MUTED,
  },

  /* Sections */
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "bold",
    color: BRAND_PRIMARY,
    marginBottom: 10,
    borderBottom: `1pt solid ${BORDER_LIGHT}`,
    paddingBottom: 4,
  },

  /* Info Grid */
  infoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  infoCard: {
    flex: 1,
    minWidth: "45%",
    padding: 10,
    backgroundColor: "#F8FAFC",
    borderRadius: 4,
    border: `1pt solid ${BORDER_LIGHT}`,
  },
  infoLabel: {
    fontSize: 8,
    color: TEXT_MUTED,
    marginBottom: 4,
    textTransform: "uppercase",
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "bold",
    color: TEXT_MAIN,
  },
  infoSubtext: {
    fontSize: 8,
    color: TEXT_MUTED,
    marginTop: 2,
  },

  /* Progress Bar */
  progressBar: {
    height: 16,
    backgroundColor: "#E2E8F0",
    borderRadius: 8,
    overflow: "hidden",
    marginTop: 6,
  },
  progressFill: {
    height: "100%",
    backgroundColor: SUCCESS_GREEN,
  },
  progressText: {
    position: "absolute",
    left: "50%",
    top: "50%",
    transform: "translate(-50%, -50%)",
    fontSize: 9,
    fontWeight: "bold",
    color: "#FFFFFF",
  },

  /* History Table */
  table: {
    marginTop: 8,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: BRAND_PRIMARY,
    color: "#FFFFFF",
    padding: 8,
    fontSize: 9,
    fontWeight: "bold",
    borderRadius: 4,
  },
  tableRow: {
    flexDirection: "row",
    padding: 8,
    borderBottom: `1pt solid ${BORDER_LIGHT}`,
  },
  tableRowAlt: {
    backgroundColor: "#F8FAFC",
  },
  col1: {
    width: "15%",
  },
  col2: {
    width: "20%",
  },
  col3: {
    width: "20%",
  },
  col4: {
    width: "15%",
  },
  col5: {
    width: "30%",
  },

  /* Status Badge */
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontSize: 8,
    fontWeight: "bold",
    textAlign: "center",
  },
  statusSuccess: {
    backgroundColor: SUCCESS_GREEN,
    color: "#FFFFFF",
  },
  statusFailed: {
    backgroundColor: ERROR_RED,
    color: "#FFFFFF",
  },

  /* Footer */
  footer: {
    position: "absolute",
    bottom: 20,
    left: 40,
    right: 40,
    fontSize: 8,
    color: TEXT_MUTED,
    borderTop: `1pt solid ${BORDER_LIGHT}`,
    paddingTop: 8,
    textAlign: "center",
  },
})

export function VerticalMetricsPdfDocument({
  metrics,
  companyName,
  organizationName,
}: VerticalMetricsPdfProps) {
  const currentDate = new Date().toLocaleDateString("es-PE", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.header}>
          <Text style={s.title}>Reporte de Métricas de Vertical</Text>
          <Text style={s.subtitle}>
            {companyName} - {organizationName}
          </Text>
          <Text style={s.metadata}>
            Generado el {currentDate} | Vertical actual:{" "}
            {VERTICAL_LABELS[metrics.currentVertical] || metrics.currentVertical}
          </Text>
        </View>

        {/* Migration Progress Section */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Progreso de Migración</Text>
          <View style={s.infoGrid}>
            <View style={s.infoCard}>
              <Text style={s.infoLabel}>Total de Productos</Text>
              <Text style={s.infoValue}>{metrics.migration.total}</Text>
            </View>
            <View style={s.infoCard}>
              <Text style={s.infoLabel}>Migrados</Text>
              <Text style={s.infoValue}>{metrics.migration.migrated}</Text>
              <Text style={s.infoSubtext}>
                {metrics.migration.percentage}% completado
              </Text>
            </View>
            <View style={s.infoCard}>
              <Text style={s.infoLabel}>Pendientes</Text>
              <Text style={s.infoValue}>{metrics.migration.legacy}</Text>
            </View>
          </View>
        </View>

        {/* Statistics Section */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Estadísticas de Cambios</Text>
          <View style={s.infoGrid}>
            <View style={s.infoCard}>
              <Text style={s.infoLabel}>Total de Cambios</Text>
              <Text style={s.infoValue}>{metrics.statistics.totalChanges}</Text>
            </View>
            <View style={s.infoCard}>
              <Text style={s.infoLabel}>Exitosos</Text>
              <Text style={s.infoValue} style={{ color: SUCCESS_GREEN }}>
                {metrics.statistics.successfulChanges}
              </Text>
            </View>
            <View style={s.infoCard}>
              <Text style={s.infoLabel}>Fallidos</Text>
              <Text style={s.infoValue} style={{ color: ERROR_RED }}>
                {metrics.statistics.failedChanges}
              </Text>
            </View>
            <View style={s.infoCard}>
              <Text style={s.infoLabel}>Tasa de Éxito</Text>
              <Text style={s.infoValue}>{metrics.statistics.successRate}%</Text>
            </View>
          </View>
        </View>

        {/* Recent History Section */}
        {metrics.recentHistory.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>
              Historial Reciente (Últimos {metrics.recentHistory.length} cambios)
            </Text>
            <View style={s.table}>
              <View style={s.tableHeader}>
                <Text style={s.col1}>ID</Text>
                <Text style={s.col2}>Fecha</Text>
                <Text style={s.col3}>De → A</Text>
                <Text style={s.col4}>Estado</Text>
              </View>
              {metrics.recentHistory.map((entry, index) => (
                <View
                  key={entry.id}
                  style={[s.tableRow, index % 2 === 0 && s.tableRowAlt]}
                >
                  <Text style={s.col1}>#{entry.id}</Text>
                  <Text style={s.col2}>
                    {new Date(entry.createdAt).toLocaleDateString("es-PE", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </Text>
                  <Text style={s.col3}>
                    {VERTICAL_LABELS[entry.oldVertical]} →{" "}
                    {VERTICAL_LABELS[entry.newVertical]}
                  </Text>
                  <View style={s.col4}>
                    <Text
                      style={[
                        s.statusBadge,
                        entry.success ? s.statusSuccess : s.statusFailed,
                      ]}
                    >
                      {entry.success ? "Exitoso" : "Fallido"}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Rollback Info */}
        {metrics.rollbackAvailable && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Información de Rollback</Text>
            <View style={s.infoCard}>
              <Text style={s.infoLabel}>Estado de Rollback</Text>
              <Text style={[s.infoValue, { color: WARNING_AMBER }]}>
                Disponible
              </Text>
              {metrics.rollbackExpiresAt && (
                <Text style={s.infoSubtext}>
                  Expira el{" "}
                  {new Date(metrics.rollbackExpiresAt).toLocaleDateString("es-PE", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Text>
              )}
            </View>
          </View>
        )}

        {/* Footer */}
        <Text style={s.footer}>
          Este reporte fue generado automáticamente por el sistema TI Projecto Web
          {"\n"}
          {new Date().toLocaleString("es-PE")}
        </Text>
      </Page>
    </Document>
  )
}
