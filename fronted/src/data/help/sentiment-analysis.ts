/**
 * Sistema de Análisis de Sentimiento y Detección de Emociones
 * FASE 2 - MEJORA #3: Análisis de sentimiento avanzado
 *
 * Features:
 * - Detección de frustración, urgencia, satisfacción
 * - Análisis de intensidad emocional
 * - Detección de escalación necesaria
 * - Adaptación de tono de respuesta
 * - Historial de sentimiento del usuario
 */

/**
 * Tipos de sentimiento detectados
 */
export type SentimentType =
  | "positive" // Usuario satisfecho
  | "neutral" // Sin emoción clara
  | "negative" // Usuario frustrado/molesto
  | "urgent" // Urgencia alta
  | "confused" // Usuario confundido
  | "grateful" // Usuario agradecido

/**
 * Nivel de intensidad del sentimiento
 */
export type IntensityLevel = "low" | "medium" | "high" | "critical"

/**
 * Resultado del análisis de sentimiento
 */
export interface SentimentAnalysis {
  sentiment: SentimentType
  intensity: IntensityLevel
  confidence: number // 0-1
  needsEscalation: boolean // Si requiere atención humana
  suggestedTone: "formal" | "friendly" | "empathetic" | "concise"
  detectedEmotions: string[]
  score: number // -1 (muy negativo) a +1 (muy positivo)
}

/**
 * Patrones de detección de sentimiento
 */
const SENTIMENT_PATTERNS = {
  // Frustración extrema
  critical_frustration: {
    patterns: [
      /no\s+sirve\s+para\s+nada/i,
      /p[eé]simo/i,
      /horrible/i,
      /terrible/i,
      /malísimo/i,
      /un\s+asco/i,
      /una\s+mierda/i,
      /que\s+porquer[ií]a/i,
      /estoy\s+harto/i,
      /no\s+aguanto\s+m[aá]s/i,
    ],
    sentiment: "negative" as SentimentType,
    intensity: "critical" as IntensityLevel,
    score: -0.9,
  },

  // Frustración alta
  high_frustration: {
    patterns: [
      /no\s+funciona\s+nada/i,
      /siempre\s+lo\s+mismo/i,
      /otra\s+vez\s+el\s+mismo\s+error/i,
      /esto\s+no\s+puede\s+ser/i,
      /increíble/i,
      /no\s+es\s+posible/i,
      /qu[eé]\s+desastre/i,
      /pierdo\s+tiempo/i,
    ],
    sentiment: "negative" as SentimentType,
    intensity: "high" as IntensityLevel,
    score: -0.7,
  },

  // Frustración media
  medium_frustration: {
    patterns: [
      /no\s+me\s+sirve/i,
      /no\s+funciona/i,
      /no\s+entiendo\s+nada/i,
      /est[aá]\s+mal/i,
      /esto\s+no\s+va\s+bien/i,
      /complicado/i,
      /confuso/i,
      /dif[ií]cil/i,
    ],
    sentiment: "confused" as SentimentType,
    intensity: "medium" as IntensityLevel,
    score: -0.5,
  },

  // Urgencia crítica
  critical_urgency: {
    patterns: [
      /urgente/i,
      /emergencia/i,
      /ahora\s+mismo/i,
      /ya/i,
      /r[aá]pido/i,
      /inmediato/i,
      /crisis/i,
      /desesperado/i,
      /necesito\s+ayuda\s+ya/i,
    ],
    sentiment: "urgent" as SentimentType,
    intensity: "critical" as IntensityLevel,
    score: 0,
  },

  // Confusión (AHORA MÁS ESPECÍFICO)
  confusion: {
    patterns: [
      /no\s+entiendo/i,
      /no\s+comprendo/i,
      /confundido/i,
      /perdido/i,
      /no\s+s[eé]\s+(c[oó]mo|qu[eé]|d[oó]nde|cu[aá]ndo)/i,  // "no sé cómo", "no sé qué"
      /qu[eé]\s+significa/i,
      /explicaci[oó]n/i,
    ],
    sentiment: "confused" as SentimentType,
    intensity: "medium" as IntensityLevel,
    score: -0.2,
  },

  // Gratitud
  gratitude: {
    patterns: [
      /gracias/i,
      /excelente/i,
      /perfecto/i,
      /genial/i,
      /muy\s+bien/i,
      /me\s+ayud[oó]\s+(mucho|bastante)/i,  // ⭐ Más específico: "me ayudó mucho"
      /resuelto/i,
      /solucionado/i,
      /funciona\s+(bien|perfecto|excelente|genial)/i,  // ⭐ Más específico: "funciona bien"
      /agradezco/i,
      /te\s+lo\s+agradezco/i,
    ],
    sentiment: "grateful" as SentimentType,
    intensity: "low" as IntensityLevel,
    score: 0.8,
  },

  // Satisfacción positiva
  positive: {
    patterns: [
      /bien/i,
      /bueno/i,
      /vale/i,
      /listo/i,
      /ok/i,
      /entendido/i,
      /claro/i,
      /de\s+acuerdo/i,
    ],
    sentiment: "positive" as SentimentType,
    intensity: "low" as IntensityLevel,
    score: 0.5,
  },

  // Solicitud de ayuda (NEUTRAL - no es frustración)
  seeking_help: {
    patterns: [
      /ayud[aeo]/i,        // ayuda, ayudame, ayudenme
      /c[oó]mo\s+(hago|puedo|se|creo|registro|ingreso)/i,  // "como hago", "como puedo"
      /necesito\s+(hacer|crear|saber)/i,  // "necesito hacer"
      /quiero\s+(hacer|crear|saber)/i,    // "quiero hacer"
    ],
    sentiment: "neutral" as SentimentType,
    intensity: "low" as IntensityLevel,
    score: 0,
  },
}

/**
 * Intensificadores emocionales
 */
const INTENSIFIERS = {
  high: [
    /muy/i,
    /much[ío]simo/i,
    /extremadamente/i,
    /totalmente/i,
    /completamente/i,
    /demasiado/i,
    /!!!/,
    /¡¡¡/,
  ],
  critical: [/!!!+/, /¡¡¡+/, /MAYÚSCULAS/, /urgente/i, /ya/i],
}

/**
 * Historial de sentimiento del usuario
 */
class SentimentHistory {
  private history: Map<string, SentimentAnalysis[]> = new Map()
  private readonly MAX_HISTORY = 10

  add(userId: string, analysis: SentimentAnalysis): void {
    if (!this.history.has(userId)) {
      this.history.set(userId, [])
    }

    const userHistory = this.history.get(userId)!
    userHistory.push(analysis)

    // Mantener solo las últimas MAX_HISTORY entries
    if (userHistory.length > this.MAX_HISTORY) {
      userHistory.shift()
    }
  }

  get(userId: string): SentimentAnalysis[] {
    return this.history.get(userId) || []
  }

  /**
   * Detecta si un usuario está en escalación (frustración creciente)
   */
  isEscalating(userId: string): boolean {
    const userHistory = this.get(userId)
    if (userHistory.length < 3) return false

    // Analizar últimas 3 interacciones
    const recent = userHistory.slice(-3)

    // Contar interacciones negativas
    const negativeCount = recent.filter(
      (a) => a.sentiment === "negative" || a.sentiment === "confused"
    ).length

    // Si 2+ de las últimas 3 son negativas, está escalando
    return negativeCount >= 2
  }

  /**
   * Obtiene el sentimiento promedio del usuario
   */
  getAverageSentiment(userId: string): number {
    const userHistory = this.get(userId)
    if (userHistory.length === 0) return 0

    const sum = userHistory.reduce((acc, analysis) => acc + analysis.score, 0)
    return sum / userHistory.length
  }

  clear(userId: string): void {
    this.history.delete(userId)
  }
}

// Singleton
export const sentimentHistory = new SentimentHistory()

/**
 * Analiza el sentimiento de un texto
 */
export function analyzeSentiment(
  text: string,
  userId?: string
): SentimentAnalysis {
  const normalized = text.toLowerCase()

  // Detectar mayúsculas (indica urgencia/emoción)
  const hasUpperCase = text !== normalized && text.toUpperCase() === text
  const hasExclamation = /!{2,}|¡{2,}/.test(text)
  const hasRepeatedChars = /(.)\1{3,}/.test(text)

  // Detectar patrones de sentimiento
  let bestMatch: {
    sentiment: SentimentType
    intensity: IntensityLevel
    score: number
    confidence: number
  } | null = null

  // PRIORIDAD 1: Verificar solicitudes de ayuda (neutral, no es frustración)
  if (SENTIMENT_PATTERNS.seeking_help) {
    const seekingHelpMatches = SENTIMENT_PATTERNS.seeking_help.patterns.filter((p) => p.test(normalized)).length
    if (seekingHelpMatches > 0) {
      bestMatch = {
        sentiment: "neutral",
        intensity: "low",
        score: 0,
        confidence: 1.0,  // Máxima confianza para evitar confusión con frustración
      }
    }
  }

  // PRIORIDAD 2: Si no es solicitud de ayuda, verificar otros sentimientos
  if (!bestMatch) {
    Object.entries(SENTIMENT_PATTERNS).forEach(([key, pattern]) => {
      if (key === 'seeking_help') return // Ya verificado arriba

      const matchCount = pattern.patterns.filter((p) => p.test(normalized)).length

      if (matchCount > 0) {
        const confidence = Math.min(matchCount / pattern.patterns.length, 1)

        if (!bestMatch || confidence > bestMatch.confidence) {
          bestMatch = {
            sentiment: pattern.sentiment,
            intensity: pattern.intensity,
            score: pattern.score,
            confidence,
          }
        }
      }
    })
  }

  // Si no hay match, usar neutral
  if (!bestMatch) {
    bestMatch = {
      sentiment: "neutral",
      intensity: "low",
      score: 0,
      confidence: 0.5,
    }
  }

  // Ajustar intensidad si hay intensificadores
  if (hasUpperCase || hasExclamation || hasRepeatedChars) {
    const intensityMap: Record<IntensityLevel, IntensityLevel> = {
      low: "medium",
      medium: "high",
      high: "critical",
      critical: "critical",
    }
    bestMatch.intensity = intensityMap[bestMatch.intensity]
  }

  // Determinar si necesita escalación
  const needsEscalation =
    bestMatch.intensity === "critical" ||
    (bestMatch.sentiment === "negative" && bestMatch.intensity === "high") ||
    (userId ? sentimentHistory.isEscalating(userId) : false)

  // Determinar tono sugerido de respuesta
  const suggestedTone = getSuggestedTone(
    bestMatch.sentiment,
    bestMatch.intensity
  )

  // Detectar emociones específicas
  const detectedEmotions = detectEmotions(text)

  const analysis: SentimentAnalysis = {
    sentiment: bestMatch.sentiment,
    intensity: bestMatch.intensity,
    confidence: bestMatch.confidence,
    needsEscalation,
    suggestedTone,
    detectedEmotions,
    score: bestMatch.score,
  }

  // Guardar en historial si hay userId
  if (userId) {
    sentimentHistory.add(userId, analysis)
  }

  return analysis
}

/**
 * Determina el tono sugerido de respuesta basado en sentimiento
 */
function getSuggestedTone(
  sentiment: SentimentType,
  intensity: IntensityLevel
): "formal" | "friendly" | "empathetic" | "concise" {
  if (sentiment === "negative" || sentiment === "confused") {
    return intensity === "critical" || intensity === "high"
      ? "empathetic"
      : "friendly"
  }

  if (sentiment === "urgent") {
    return "concise"
  }

  if (sentiment === "grateful" || sentiment === "positive") {
    return "friendly"
  }

  return "formal"
}

/**
 * Detecta emociones específicas en el texto
 */
function detectEmotions(text: string): string[] {
  const emotions: string[] = []
  const normalized = text.toLowerCase()

  const emotionPatterns: Record<string, RegExp[]> = {
    anger: [/maldita/i, /odio/i, /rabia/i, /enfado/i, /molesto/i],
    frustration: [/frustr[oa]/i, /harto/i, /cansado/i, /agotado/i],
    confusion: [/confund/i, /perdid/i, /no\s+entiendo/i, /no\s+s[eé]/i],
    anxiety: [/preocup/i, /nervios/i, /ansied/i, /estres/i],
    satisfaction: [/satisfech/i, /content/i, /feliz/i, /alegr/i],
    gratitude: [/gracias/i, /agradec/i, /amable/i],
  }

  Object.entries(emotionPatterns).forEach(([emotion, patterns]) => {
    if (patterns.some((p) => p.test(normalized))) {
      emotions.push(emotion)
    }
  })

  return emotions
}

/**
 * Adapta una respuesta según el sentimiento detectado
 */
export function adaptResponseToSentiment(
  baseResponse: string,
  sentiment: SentimentAnalysis
): string {
  const { suggestedTone, sentiment: sentimentType, needsEscalation } = sentiment

  let adapted = baseResponse

  // Agregar prefijo empático si es necesario
  if (suggestedTone === "empathetic") {
    const empatheticPrefixes = [
      "Entiendo que esto puede ser frustrante. ",
      "Lamento que estés teniendo dificultades. ",
      "Comprendo tu situación. ",
      "Puedo ver que esto es urgente para ti. ",
    ]
    const prefix =
      empatheticPrefixes[
        Math.floor(Math.random() * empatheticPrefixes.length)
      ]
    adapted = prefix + adapted
  }

  // Agregar CTA de escalación si es necesario
  if (needsEscalation) {
    adapted +=
      "\n\n**¿Necesitas ayuda inmediata?** Puedes contactar al equipo de soporte desde la sección 'Mensajes' para asistencia personalizada."
  }

  // Para tono conciso (urgencia), resumir respuesta
  if (suggestedTone === "concise") {
    // Quitar explicaciones largas, mantener solo lo esencial
    const lines = adapted.split("\n")
    const essential = lines.filter((line) => {
      return (
        line.includes("**") ||
        line.includes("1.") ||
        line.includes("2.") ||
        line.length < 100
      )
    })
    adapted = essential.join("\n")
  }

  // Para gratitud, agregar mensaje positivo
  if (sentimentType === "grateful") {
    adapted +=
      "\n\n✨ Me alegra haberte ayudado! Si tienes otra pregunta, aquí estaré."
  }

  return adapted
}

/**
 * Detecta si el usuario está experimentando frustración creciente
 */
export function detectFrustrationEscalation(
  userId: string,
  currentSentiment: SentimentAnalysis
): boolean {
  return (
    currentSentiment.sentiment === "negative" &&
    currentSentiment.intensity === "high" &&
    sentimentHistory.isEscalating(userId)
  )
}
