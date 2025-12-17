export type OnboardingStepKey =
  | "companyProfile"
  | "storeSetup"
  | "sunatSetup"
  | "dataImport"

export type DemoDataStatus = "NONE" | "SEEDED" | "CLEANING"

export interface StepState {
  completed: boolean
  completedAt?: string | null
  updatedAt?: string | null
  data?: Record<string, any> | null
}

export interface OnboardingProgress {
  id: number
  organizationId: number
  currentStep: number
  companyProfile?: StepState | null
  storeSetup?: StepState | null
  sunatSetup?: StepState | null
  dataImport?: StepState | null
  demoStatus: DemoDataStatus
  demoSeededAt?: string | null
  demoClearedAt?: string | null
  wizardDismissedAt?: string | null
  isCompleted: boolean
  completedAt?: string | null
  createdAt: string
  updatedAt: string
}
