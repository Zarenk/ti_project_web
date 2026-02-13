import React from 'react'
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
  Link,
} from '@react-pdf/renderer'
import type { HelpSection, HelpEntry } from '@/data/help/types'

interface ManualData {
  sections: HelpSection[]
  screenshots: Record<string, string>
  metadata: {
    generatedAt: string
    version: string
    companyLogo?: string
  }
}

// Estilos del documento
const styles = StyleSheet.create({
  // Portada
  coverPage: {
    backgroundColor: '#1e3a5f',
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
  date: {
    fontSize: 14,
    color: '#cbd5e1',
    position: 'absolute',
    bottom: 40,
  },

  // Páginas normales
  page: {
    padding: 50,
    fontSize: 11,
    fontFamily: 'Helvetica',
    color: '#1f2937',
  },

  // Encabezados de sección
  sectionTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1e3a5f',
    marginBottom: 16,
    borderBottom: '3px solid #2563EB',
    paddingBottom: 8,
  },
  sectionDescription: {
    fontSize: 13,
    color: '#4b5563',
    marginBottom: 20,
    lineHeight: 1.6,
  },

  // Índice
  tocItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 4,
    borderBottom: '1px solid #e5e7eb',
  },
  tocText: {
    fontSize: 12,
    color: '#374151',
  },
  tocPage: {
    fontSize: 11,
    color: '#6b7280',
  },

  // Entry (pregunta/respuesta)
  entryHeader: {
    backgroundColor: '#f8fafc',
    padding: 12,
    marginBottom: 16,
    borderLeft: '4px solid #2563EB',
  },
  entryQuestion: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e3a5f',
  },
  entryAnswer: {
    marginBottom: 20,
    lineHeight: 1.8,
  },
  answerText: {
    fontSize: 11,
    color: '#374151',
  },

  // Pasos
  stepsContainer: {
    marginTop: 16,
    marginBottom: 20,
  },
  stepsTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#1e3a5f',
    marginBottom: 12,
  },
  step: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 4,
  },
  stepImage: {
    width: '100%',
    maxWidth: 450,
    height: 'auto',
    marginBottom: 8,
    borderRadius: 4,
    border: '1px solid #e5e7eb',
  },
  stepText: {
    fontSize: 11,
    color: '#4b5563',
    lineHeight: 1.6,
  },

  // Acciones relacionadas
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

  // Footer
  pageNumber: {
    position: 'absolute',
    fontSize: 10,
    bottom: 30,
    left: 0,
    right: 0,
    textAlign: 'center',
    color: '#9ca3af',
  },

  // Utilidades
  separator: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 16,
  },
})

export function UserManualDocument({ data }: { data: ManualData }) {
  const { sections, screenshots, metadata } = data

  // Helper para resolver screenshots (usa placeholder si no existe)
  const resolveScreenshot = (imagePath?: string): string => {
    if (!imagePath) return '/help/placeholder-screenshot.png'
    return screenshots[imagePath] || '/help/placeholder-screenshot.png'
  }

  // Helper para buscar título de entry relacionada
  const getRelatedTitle = (actionId: string): string => {
    for (const section of sections) {
      const entry = section.entries.find((e) => e.id === actionId)
      if (entry) return entry.question
    }
    return actionId
  }

  // Renderizar texto con saltos de línea preservados
  const renderText = (text: string) => {
    const lines = text.split('\n')
    return lines.map((line, idx) => (
      <Text key={idx} style={styles.answerText}>
        {line}
        {'\n'}
      </Text>
    ))
  }

  return (
    <Document
      title="Manual de Usuario - ADSLab"
      author="ADSLab Sistema de Gestión"
      subject="Documentación completa del sistema"
      keywords="manual, usuario, documentación, ADSLab"
    >
      {/* PORTADA */}
      <Page size="A4" style={styles.coverPage}>
        {metadata.companyLogo && (
          <Image
            src={metadata.companyLogo}
            style={styles.coverLogo}
            cache={false}
          />
        )}
        <Text style={styles.title}>Manual de Usuario</Text>
        <Text style={styles.subtitle}>Sistema de Gestión ADSLab</Text>
        <Text style={styles.date}>Generado el {metadata.generatedAt}</Text>
        <Text style={styles.date}>Versión {metadata.version}</Text>
      </Page>

      {/* ÍNDICE */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.sectionTitle}>Índice</Text>
        <View style={{ marginTop: 20 }}>
          {sections.map((section, idx) => (
            <View key={section.id} style={styles.tocItem}>
              <Text style={styles.tocText}>
                {idx + 1}. {section.label} ({section.entries.length} temas)
              </Text>
            </View>
          ))}
        </View>
        <View style={{ marginTop: 40, padding: 16, backgroundColor: '#f0f9ff' }}>
          <Text style={{ fontSize: 10, color: '#0369a1', marginBottom: 8 }}>
            📘 Cómo usar este manual:
          </Text>
          <Text style={{ fontSize: 9, color: '#075985', lineHeight: 1.6 }}>
            • Navega por el índice para encontrar la sección que necesitas{'\n'}
            • Cada tema incluye una pregunta, respuesta detallada y pasos ilustrados{'\n'}
            • Los screenshots te guiarán visualmente en cada proceso{'\n'}
            • Al final de cada tema encontrarás acciones relacionadas para profundizar
          </Text>
        </View>
      </Page>

      {/* SECCIONES Y CONTENIDO */}
      {sections.map((section) => (
        <React.Fragment key={section.id}>
          {/* Portada de Sección */}
          <Page size="A4" style={styles.page}>
            <Text style={styles.sectionTitle}>{section.label}</Text>
            <Text style={styles.sectionDescription}>
              {section.description}
            </Text>
            <View style={styles.separator} />
            <Text style={{ fontSize: 10, color: '#6b7280', marginTop: 16 }}>
              Esta sección contiene {section.entries.length} temas relacionados con {section.label.toLowerCase()}.
            </Text>
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
                {renderText(entry.answer)}
              </View>

              {/* Pasos (si existen) */}
              {entry.steps && entry.steps.length > 0 && (
                <View style={styles.stepsContainer} wrap={false}>
                  <Text style={styles.stepsTitle}>
                    📋 Pasos a seguir:
                  </Text>
                  {entry.steps.map((step, idx) => (
                    <View key={idx} style={styles.step} wrap={false}>
                      {step.image && (
                        <Image
                          src={resolveScreenshot(step.image)}
                          style={styles.stepImage}
                          cache={false}
                        />
                      )}
                      <Text style={styles.stepText}>
                        {idx + 1}. {step.text}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Acciones relacionadas */}
              {entry.relatedActions && entry.relatedActions.length > 0 && (
                <View style={styles.relatedActions} wrap={false}>
                  <Text style={styles.relatedTitle}>
                    🔗 Ver también:
                  </Text>
                  {entry.relatedActions.map((actionId) => (
                    <Text key={actionId} style={styles.relatedItem}>
                      → {getRelatedTitle(actionId)}
                    </Text>
                  ))}
                </View>
              )}

              {/* Número de página */}
              <Text
                style={styles.pageNumber}
                render={({ pageNumber, totalPages }) =>
                  `Página ${pageNumber} de ${totalPages}`
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
            ¿Necesitas ayuda adicional?
          </Text>
          <Text style={{ fontSize: 10, lineHeight: 1.8, marginBottom: 16 }}>
            Si no encontraste respuesta a tu pregunta en este manual, nuestro equipo de soporte está disponible para ayudarte.
          </Text>
          <View style={{ backgroundColor: '#f0f9ff', padding: 16, borderRadius: 4 }}>
            <Text style={{ fontSize: 11, color: '#0369a1', marginBottom: 8 }}>
              📧 Correo de soporte: soporte@adslab.pe
            </Text>
            <Text style={{ fontSize: 11, color: '#0369a1', marginBottom: 8 }}>
              📞 Teléfono: +51 XXX XXX XXX
            </Text>
            <Text style={{ fontSize: 11, color: '#0369a1', marginBottom: 8 }}>
              💬 Chat en vivo: Disponible en el asistente de ayuda dentro del sistema
            </Text>
          </View>
          <Text style={{ fontSize: 9, color: '#6b7280', marginTop: 20 }}>
            Este manual fue generado automáticamente el {metadata.generatedAt} y siempre refleja la última versión del sistema.
          </Text>
        </View>
      </Page>
    </Document>
  )
}
