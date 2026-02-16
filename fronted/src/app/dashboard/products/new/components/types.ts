import type { UseFormReturn } from 'react-hook-form'

export type ProductFormContext = {
  form: UseFormReturn<any>
  register: UseFormReturn<any>['register']
  control: UseFormReturn<any>['control']
  setValue: UseFormReturn<any>['setValue']
  clearErrors: UseFormReturn<any>['clearErrors']
  isProcessing: boolean
  suppressInlineErrors: boolean
}
