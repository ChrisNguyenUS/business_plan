import { n400 } from './n400'
import { i765, i130, i131 } from './i765-i130-i131'
import type { FormDefinition } from './types'

export const FORMS: Record<string, FormDefinition> = {
  n400,
  i765,
  i130,
  i131,
}

export function getForm(formType: string): FormDefinition | null {
  return FORMS[formType] ?? null
}

export type { FormDefinition, FormField, FormSection, PackageDefinition } from './types'
