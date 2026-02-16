/**
 * Sistema de guía progresiva paso a paso
 * Proporciona asistencia contextual y adaptativa según el progreso del usuario
 */

import type { HelpEntry, HelpStep } from "./types"

export interface ProgressiveStep extends HelpStep {
  stepNumber: number
  totalSteps: number
  completed?: boolean
  isCurrentStep?: boolean
  estimatedTime?: string // "30 seg", "2 min"
  difficulty?: "easy" | "medium" | "hard"
  tips?: string[]
  commonErrors?: string[]
  nextStepPreview?: string
}

export interface GuideProgress {
  entryId: string
  currentStep: number
  totalSteps: number
  startedAt: Date
  completedSteps: number[]
  skippedSteps: number[]
  timeSpent: number // segundos
}

/**
 * Convierte steps simples en steps progresivos enriquecidos
 */
export function enrichSteps(
  entry: HelpEntry,
  userProgress?: GuideProgress,
): ProgressiveStep[] {
  if (!entry.steps || entry.steps.length === 0) {
    return []
  }

  const enrichedSteps: ProgressiveStep[] = entry.steps.map((step, index) => {
    const stepNumber = index + 1
    const totalSteps = entry.steps!.length

    // Determinar si está completado
    const completed = userProgress?.completedSteps.includes(stepNumber) ?? false
    const isCurrentStep = userProgress?.currentStep === stepNumber

    // Estimar tiempo basado en la longitud del texto
    const textLength = step.text.length
    let estimatedTime = "30 seg"
    if (textLength > 100) estimatedTime = "1 min"
    if (textLength > 200) estimatedTime = "2 min"

    // Determinar dificultad basada en keywords
    let difficulty: "easy" | "medium" | "hard" = "easy"
    if (step.text.includes("configura") || step.text.includes("ajusta")) {
      difficulty = "medium"
    }
    if (
      step.text.includes("API") ||
      step.text.includes("código") ||
      step.text.includes("comando")
    ) {
      difficulty = "hard"
    }

    // Tips contextuales
    const tips: string[] = []
    if (step.text.toLowerCase().includes("busca")) {
      tips.push("Puedes usar el buscador con Ctrl+F")
    }
    if (step.text.toLowerCase().includes("haz clic")) {
      tips.push("También puedes usar atajos de teclado")
    }
    if (step.text.toLowerCase().includes("selecciona")) {
      tips.push("Usa las flechas del teclado para navegar")
    }

    // Errores comunes
    const commonErrors: string[] = []
    if (step.text.toLowerCase().includes("guardar")) {
      commonErrors.push("No olvides guardar antes de salir")
    }
    if (step.text.toLowerCase().includes("confirma")) {
      commonErrors.push("Revisa todos los datos antes de confirmar")
    }

    // Preview del siguiente paso
    const nextStepPreview =
      index < entry.steps!.length - 1
        ? `Siguiente: ${entry.steps![index + 1].text.substring(0, 50)}...`
        : undefined

    return {
      ...step,
      stepNumber,
      totalSteps,
      completed,
      isCurrentStep,
      estimatedTime,
      difficulty,
      tips: tips.length > 0 ? tips : undefined,
      commonErrors: commonErrors.length > 0 ? commonErrors : undefined,
      nextStepPreview,
    }
  })

  return enrichedSteps
}

/**
 * Genera contexto adicional basado en el paso actual
 */
export function getStepContext(step: ProgressiveStep, entry: HelpEntry): {
  title: string;
  motivation: string;
  relatedQuestions: string[];
} {
  const motivation = generateMotivation(step.stepNumber, step.totalSteps)

  const relatedQuestions: string[] = []
  if (step.stepNumber === 1) {
    relatedQuestions.push("¿Qué hago si no encuentro el botón?")
    relatedQuestions.push("¿Puedo hacer esto más rápido?")
  } else if (step.stepNumber === step.totalSteps) {
    relatedQuestions.push("¿Cómo verifico que funcionó?")
    relatedQuestions.push("¿Qué hago si algo salió mal?")
  } else {
    relatedQuestions.push("¿Puedo saltar este paso?")
    relatedQuestions.push("¿Qué pasa si cometo un error?")
  }

  return {
    title: `Paso ${step.stepNumber} de ${step.totalSteps}`,
    motivation,
    relatedQuestions,
  }
}

/**
 * Genera mensajes motivacionales según el progreso
 */
function generateMotivation(currentStep: number, totalSteps: number): string {
  const progress = currentStep / totalSteps

  if (currentStep === 1) {
    return "¡Excelente! Comencemos paso a paso."
  }

  if (progress < 0.3) {
    return "Vas muy bien, sigue así."
  }

  if (progress < 0.6) {
    return "Ya estás a mitad de camino, ¡ánimo!"
  }

  if (progress < 0.9) {
    return "Casi terminas, solo quedan algunos pasos."
  }

  if (currentStep === totalSteps) {
    return "¡Último paso! Ya casi lo logras."
  }

  return "Continúa con el siguiente paso."
}

/**
 * Detecta problemas comunes según el tiempo que lleva en un paso
 */
export function detectStuckness(progress: GuideProgress): {
  isStuck: boolean;
  reason?: string;
  suggestion?: string;
} {
  const avgTimePerStep = progress.timeSpent / Math.max(progress.currentStep, 1)

  // Si lleva más de 5 minutos en un paso
  if (avgTimePerStep > 300) {
    return {
      isStuck: true,
      reason: "Estás tardando más de lo esperado en este paso",
      suggestion: "¿Necesitas ayuda adicional? Puedo mostrarte un video o conectarte con soporte.",
    }
  }

  // Si ha saltado muchos pasos
  if (progress.skippedSteps.length > progress.totalSteps / 2) {
    return {
      isStuck: true,
      reason: "Has saltado varios pasos",
      suggestion: "Algunos pasos son opcionales, pero otros son necesarios. ¿Quieres revisar cuáles son importantes?",
    }
  }

  return { isStuck: false }
}

/**
 * Genera un resumen de progreso
 */
export function generateProgressSummary(progress: GuideProgress): string {
  const completed = progress.completedSteps.length
  const total = progress.totalSteps
  const percentage = Math.round((completed / total) * 100)

  const timeMinutes = Math.round(progress.timeSpent / 60)

  let summary = `Has completado ${completed} de ${total} pasos (${percentage}%).`

  if (timeMinutes > 0) {
    summary += ` Llevas ${timeMinutes} ${timeMinutes === 1 ? "minuto" : "minutos"}.`
  }

  if (percentage >= 100) {
    summary += " ¡Felicidades, has terminado!"
  } else if (percentage >= 75) {
    summary += " ¡Ya casi terminas!"
  } else if (percentage >= 50) {
    summary += " Vas por la mitad."
  }

  return summary
}

/**
 * Sugiere el próximo paso basado en el contexto
 */
export function suggestNextAction(
  progress: GuideProgress,
  availableEntries: HelpEntry[],
): {
  type: "continue" | "restart" | "related" | "support";
  message: string;
  relatedEntry?: HelpEntry;
} {
  // Si completó todo
  if (progress.completedSteps.length === progress.totalSteps) {
    // Buscar tarea relacionada
    const currentEntry = availableEntries.find(e => e.id === progress.entryId)
    if (currentEntry?.relatedActions && currentEntry.relatedActions.length > 0) {
      const relatedId = currentEntry.relatedActions[0]
      const relatedEntry = availableEntries.find(e => e.id === relatedId)

      if (relatedEntry) {
        return {
          type: "related",
          message: `¡Excelente trabajo! ¿Quieres aprender: "${relatedEntry.question}"?`,
          relatedEntry,
        }
      }
    }

    return {
      type: "continue",
      message: "¡Perfecto! ¿Hay algo más en lo que pueda ayudarte?",
    }
  }

  // Si está atascado
  const stuckness = detectStuckness(progress)
  if (stuckness.isStuck) {
    return {
      type: "support",
      message: stuckness.suggestion || "¿Necesitas ayuda adicional?",
    }
  }

  // Continuar con el flujo normal
  const remaining = progress.totalSteps - progress.completedSteps.length
  return {
    type: "continue",
    message: `Te ${remaining === 1 ? "queda" : "quedan"} ${remaining} ${remaining === 1 ? "paso" : "pasos"}. ¿Continuamos?`,
  }
}

/**
 * Adaptación de la explicación según el nivel del usuario
 */
export function adaptExplanation(
  step: HelpStep,
  userLevel: "beginner" | "intermediate" | "advanced",
): string {
  const baseText = step.text

  switch (userLevel) {
    case "beginner":
      // Agregar más contexto y detalles
      return `${baseText}\n\n💡 Tip: Tómate tu tiempo y lee cada paso cuidadosamente.`

    case "intermediate":
      // Texto estándar
      return baseText

    case "advanced":
      // Versión más concisa
      const shortText = baseText.split(".")[0] // Primera oración
      return `${shortText}. (Atajo disponible)`

    default:
      return baseText
  }
}

/**
 * Genera recordatorios contextuales
 */
export function generateReminders(step: ProgressiveStep): string[] {
  const reminders: string[] = []

  if (step.stepNumber === 1) {
    reminders.push("Asegúrate de tener los datos necesarios antes de comenzar")
  }

  if (step.text.toLowerCase().includes("guardar")) {
    reminders.push("⚠️ No olvides guardar tus cambios")
  }

  if (step.text.toLowerCase().includes("confirmar")) {
    reminders.push("⚠️ Revisa que toda la información sea correcta")
  }

  if (step.text.toLowerCase().includes("eliminar") || step.text.toLowerCase().includes("borrar")) {
    reminders.push("⚠️ Esta acción no se puede deshacer")
  }

  return reminders
}
