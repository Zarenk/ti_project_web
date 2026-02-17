import React from 'react'
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
} from '@react-pdf/renderer'
import type { HelpSection } from '@/data/help/types'

interface ManualData {
  sections: HelpSection[]
  screenshots: Record<string, string>
  placeholderPath: string
  metadata: {
    generatedAt: string
    version: string
    companyLogo?: string
  }
}

const BRAND_PRIMARY = '#1e3a5f'
const BRAND_ACCENT = '#2563EB'
const TEXT_MAIN = '#1f2937'
const TEXT_MUTED = '#4b5563'
const BORDER_LIGHT = '#e5e7eb'

const styles = StyleSheet.create({
  coverPage: {
    backgroundColor: BRAND_PRIMARY,
    padding: 60,
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
  },
  coverLogo: {
    width: 120,
    height: 120,
    marginBottom: 40,
  },
  title: {
    fontSize: 42,
    color: '#ffffff',
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 24,
    color: '#93c5fd',
    marginBottom: 60,
    textAlign: 'center',
  },
  coverDate: {
    fontSize: 14,
    color: '#cbd5e1',
    textAlign: 'center',
    marginTop: 8,
  },
  coverVersion: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 4,
  },

  page: {
    paddingTop: 50,
    paddingBottom: 60,
    paddingHorizontal: 50,
    fontSize: 11,
    fontFamily: 'Helvetica',
    color: TEXT_MAIN,
  },

  sectionCoverPage: {
    paddingTop: 120,
    paddingBottom: 60,
    paddingHorizontal: 60,
    fontSize: 11,
    fontFamily: 'Helvetica',
    color: TEXT_MAIN,
  },

  sectionTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: BRAND_PRIMARY,
    marginBottom: 16,
    borderBottomWidth: 3,
    borderBottomColor: BRAND_ACCENT,
    paddingBottom: 8,
  },
  sectionDescription: {
    fontSize: 13,
    color: TEXT_MUTED,
    marginBottom: 20,
    lineHeight: 1.6,
  },

  tocItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_LIGHT,
  },
  tocText: {
    fontSize: 12,
    color: '#374151',
  },
  tocEntryCount: {
    fontSize: 10,
    color: '#9ca3af',
  },

  entryHeader: {
    backgroundColor: '#f8fafc',
    padding: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: BRAND_ACCENT,
  },
  entryQuestion: {
    fontSize: 15,
    fontWeight: 'bold',
    color: BRAND_PRIMARY,
  },
  entryAnswer: {
    marginBottom: 20,
    lineHeight: 1.8,
  },
  answerText: {
    fontSize: 11,
    color: '#374151',
    lineHeight: 1.7,
  },
  answerBold: {
    fontSize: 11,
    color: '#111827',
    fontWeight: 'bold',
  },
  answerBullet: {
    fontSize: 11,
    color: '#374151',
    marginLeft: 16,
    marginBottom: 4,
  },

  stepsContainer: {
    marginTop: 16,
    marginBottom: 20,
  },
  stepsTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: BRAND_PRIMARY,
    marginBottom: 12,
  },
  step: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 4,
  },
  stepImage: {
    width: 450,
    height: 260,
    marginBottom: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: BORDER_LIGHT,
    objectFit: 'contain' as any,
  },
  stepText: {
    fontSize: 11,
    color: TEXT_MUTED,
    lineHeight: 1.6,
  },

  relatedActions: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#eff6ff',
    borderRadius: 4,
  },
  relatedTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#1e40af',
    marginBottom: 8,
  },
  relatedItem: {
    fontSize: 10,
    color: '#3b82f6',
    marginBottom: 4,
  },

  pageNumber: {
    position: 'absolute',
    fontSize: 10,
    bottom: 30,
    left: 0,
    right: 0,
    textAlign: 'center',
    color: '#9ca3af',
  },

  separator: {
    height: 1,
    backgroundColor: BORDER_LIGHT,
    marginVertical: 16,
  },
})

/**
 * Renderizar texto con markdown básico (negritas, viñetas, enlaces)
 * Limpia emojis y tokens markdown para el PDF
 */
function renderAnswerText(text: string): React.ReactNode[] {
  const lines = text.split('\n')
  const nodes: React.ReactNode[] = []

  lines.forEach((line, lineIdx) => {
    const trimmed = line.trim()

    // Línea vacía
    if (!trimmed) {
      nodes.push(<Text key={`empty-${lineIdx}`}>{'\n'}</Text>)
      return
    }

    // Limpiar emojis comunes y markdown links
    let cleanLine = trimmed
      .replace(/\[.*?\]\(.*?\)/g, '') // Remover links markdown
      .replace(/[📥✅📘📋🔗📧📞💬]/g, '') // Remover emojis
      .replace(/\*\*(.*?)\*\*/g, '$1') // Remover negritas markdown (texto plano)
      .trim()

    if (!cleanLine) return

    // Viñetas
    if (cleanLine.startsWith('- ') || cleanLine.startsWith('* ') || cleanLine.startsWith('• ')) {
      nodes.push(
        <Text key={lineIdx} style={styles.answerBullet}>
          {'  • '}{cleanLine.slice(2)}
        </Text>
      )
      return
    }

    // Texto normal
    nodes.push(
      <Text key={lineIdx} style={styles.answerText}>
        {cleanLine}
      </Text>
    )
  })

  return nodes
}

/**
 * Obtener el label de una sección de forma segura.
 * Algunas secciones usan 'title' en vez de 'label' (reports, hardware, api-integrations).
 */
function getSectionLabel(section: HelpSection): string {
  return section.label || (section as any).title || section.id
}

export function UserManualDocument({ data }: { data: ManualData }) {
  const { sections, screenshots, placeholderPath, metadata } = data

  // Resolver screenshot: retorna base64 data URL para @react-pdf/renderer v4
  const resolveScreenshot = (imagePath?: string): string | null => {
    if (!imagePath) return null
    const resolved = screenshots[imagePath]
    if (resolved) return resolved
    // Fallback al placeholder
    return placeholderPath || null
  }

  // Buscar título de entry relacionada
  const getRelatedTitle = (actionId: string): string => {
    for (const section of sections) {
      const entry = section.entries.find((e) => e.id === actionId)
      if (entry) return entry.question
    }
    return actionId
  }

  return (
    <Document
      title="Manual de Usuario - ADSLab"
      author="ADSLab Sistema de Gestion"
      subject="Documentacion completa del sistema"
    >
      {/* PORTADA */}
      <Page size="A4" style={styles.coverPage}>
        {metadata.companyLogo && (
          <Image
            src={metadata.companyLogo}
            style={styles.coverLogo}
          />
        )}
        <Text style={styles.title}>Manual de Usuario</Text>
        <Text style={styles.subtitle}>Sistema de Gestion ADSLab</Text>
        <View style={{ marginTop: 40 }}>
          <Text style={styles.coverDate}>Generado el {metadata.generatedAt}</Text>
          <Text style={styles.coverVersion}>Version {metadata.version}</Text>
        </View>
      </Page>

      {/* ÍNDICE */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.sectionTitle}>Indice</Text>
        <View style={{ marginTop: 20 }}>
          {sections.map((section, idx) => (
            <View key={section.id} style={styles.tocItem}>
              <Text style={styles.tocText}>
                {idx + 1}. {getSectionLabel(section)}
              </Text>
              <Text style={styles.tocEntryCount}>
                {section.entries.length} temas
              </Text>
            </View>
          ))}
        </View>
        <View style={{ marginTop: 40, padding: 16, backgroundColor: '#f0f9ff', borderRadius: 4 }}>
          <Text style={{ fontSize: 11, color: '#0369a1', marginBottom: 8, fontWeight: 'bold' }}>
            Como usar este manual:
          </Text>
          <Text style={{ fontSize: 10, color: '#075985', lineHeight: 1.6 }}>
            {'  • Navega por el indice para encontrar la seccion que necesitas\n'}
            {'  • Cada tema incluye una pregunta, respuesta detallada y pasos ilustrados\n'}
            {'  • Los screenshots te guiaran visualmente en cada proceso\n'}
            {'  • Al final de cada tema encontraras acciones relacionadas para profundizar'}
          </Text>
        </View>
        <Text
          style={styles.pageNumber}
          render={({ pageNumber, totalPages }) =>
            `Pagina ${pageNumber} de ${totalPages}`
          }
          fixed
        />
      </Page>

      {/* SECCIONES Y CONTENIDO */}
      {sections.map((section) => (
        <React.Fragment key={section.id}>
          {/* Portada de Sección */}
          <Page size="A4" style={styles.sectionCoverPage}>
            <Text style={styles.sectionTitle}>{getSectionLabel(section)}</Text>
            <Text style={styles.sectionDescription}>
              {section.description}
            </Text>
            <View style={styles.separator} />
            <Text style={{ fontSize: 10, color: '#6b7280', marginTop: 16 }}>
              Esta seccion contiene {section.entries.length} temas relacionados con {getSectionLabel(section).toLowerCase()}.
            </Text>
            <Text
              style={styles.pageNumber}
              render={({ pageNumber, totalPages }) =>
                `Pagina ${pageNumber} de ${totalPages}`
              }
              fixed
            />
          </Page>

          {/* Entries de la sección */}
          {section.entries.map((entry) => (
            <Page key={entry.id} size="A4" style={styles.page} wrap>
              {/* Pregunta */}
              <View style={styles.entryHeader} wrap={false}>
                <Text style={styles.entryQuestion}>{entry.question}</Text>
              </View>

              {/* Respuesta */}
              <View style={styles.entryAnswer}>
                {renderAnswerText(entry.answer)}
              </View>

              {/* Pasos (si existen) */}
              {entry.steps && entry.steps.length > 0 && (
                <View style={styles.stepsContainer}>
                  <Text style={styles.stepsTitle}>
                    Pasos a seguir:
                  </Text>
                  {entry.steps.map((step, idx) => {
                    const imgSrc = resolveScreenshot(step.image)
                    return (
                      <View key={idx} style={styles.step} wrap={false}>
                        <Text style={styles.stepText}>
                          {idx + 1}. {step.text}
                        </Text>
                        {imgSrc && (
                          <Image
                            src={imgSrc}
                            style={styles.stepImage}
                          />
                        )}
                      </View>
                    )
                  })}
                </View>
              )}

              {/* Acciones relacionadas */}
              {entry.relatedActions && entry.relatedActions.length > 0 && (
                <View style={styles.relatedActions} wrap={false}>
                  <Text style={styles.relatedTitle}>
                    Ver tambien:
                  </Text>
                  {entry.relatedActions.map((actionId) => (
                    <Text key={actionId} style={styles.relatedItem}>
                      {'-> '}{getRelatedTitle(actionId)}
                    </Text>
                  ))}
                </View>
              )}

              {/* Número de página */}
              <Text
                style={styles.pageNumber}
                render={({ pageNumber, totalPages }) =>
                  `Pagina ${pageNumber} de ${totalPages}`
                }
                fixed
              />
            </Page>
          ))}
        </React.Fragment>
      ))}

      {/* APÉNDICE - SOPORTE Y CONTACTO */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.sectionTitle}>Soporte y Contacto</Text>
        <View style={{ marginTop: 20 }}>
          <Text style={{ fontSize: 12, marginBottom: 12, fontWeight: 'bold' }}>
            Necesitas ayuda adicional?
          </Text>
          <Text style={{ fontSize: 10, lineHeight: 1.8, marginBottom: 16 }}>
            Si no encontraste respuesta a tu pregunta en este manual, nuestro equipo de soporte esta disponible para ayudarte.
          </Text>
          <View style={{ backgroundColor: '#f0f9ff', padding: 16, borderRadius: 4 }}>
            <Text style={{ fontSize: 11, color: '#0369a1', marginBottom: 8 }}>
              Correo de soporte: soporte@adslab.pe
            </Text>
            <Text style={{ fontSize: 11, color: '#0369a1', marginBottom: 8 }}>
              Chat en vivo: Disponible en el asistente de ayuda dentro del sistema
            </Text>
          </View>
          <Text style={{ fontSize: 9, color: '#6b7280', marginTop: 20 }}>
            Este manual fue generado automaticamente el {metadata.generatedAt} y siempre refleja la ultima version del sistema.
          </Text>
        </View>
        <Text
          style={styles.pageNumber}
          render={({ pageNumber, totalPages }) =>
            `Pagina ${pageNumber} de ${totalPages}`
          }
          fixed
        />
      </Page>
    </Document>
  )
}
