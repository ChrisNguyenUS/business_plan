export type FilingMode = 'paper' | 'online' | 'mail'

export type Client = Record<string, any>

export type FormField = {
  id: string
  label: string
  getValue: (client: Client) => string
}

export type FormSection = {
  id: string
  label: string
  fields: FormField[]
}

export type FormDefinition = {
  id: string
  name: string
  filingMode: FilingMode
  sections: FormSection[]
  pdfTemplate?: string
  pdfFieldMap?: Record<string, string>
}

export type PackageDefinition = {
  id: string
  name: string
  formIds: string[]
}
