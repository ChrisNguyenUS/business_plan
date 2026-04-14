import { PDFDocument } from 'pdf-lib'
import type { FormDefinition } from '@/lib/forms/types'

export async function fillPdf(
  form: FormDefinition,
  client: Record<string, any>
): Promise<Uint8Array> {
  if (!form.pdfTemplate || !form.pdfFieldMap) {
    throw new Error(`Form ${form.id} has no PDF template configured`)
  }

  // Load PDF template from /public/forms/
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'}/forms/${form.pdfTemplate}`
  )
  if (!response.ok) throw new Error(`Could not load PDF template: ${form.pdfTemplate}`)
  const pdfBytes = await response.arrayBuffer()

  const pdf = await PDFDocument.load(pdfBytes)
  const pdfForm = pdf.getForm()

  // Fill each field defined in pdfFieldMap
  for (const section of form.sections) {
    for (const field of section.fields) {
      const pdfFieldName = form.pdfFieldMap[field.id]
      if (!pdfFieldName) continue
      const value = field.getValue(client)
      try {
        const pdfField = pdfForm.getTextField(pdfFieldName)
        pdfField.setText(value)
      } catch {
        // Field may not exist in this version of the PDF — skip silently
      }
    }
  }

  return pdf.save()
}
