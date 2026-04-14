import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { PDFDocument } from 'pdf-lib'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ formId: string }> }
) {
  const { formId } = await params
  const { searchParams } = new URL(request.url)
  const caseId = searchParams.get('caseId')

  if (!caseId) {
    return NextResponse.json({ error: 'Missing caseId' }, { status: 400 })
  }

  const supabase = await createClient()

  // Get case form and case details
  const { data: caseForm } = await supabase
    .from('case_forms')
    .select('*, case:cases(primary_client_id)')
    .eq('id', formId)
    .single()

  if (!caseForm) {
    return NextResponse.json({ error: 'Form not found' }, { status: 404 })
  }

  // Find PDF template
  // Default to a known template, or form_type.toLowerCase()
  const formKey = caseForm.form_type?.toLowerCase() || 'i131'
  let pdfPath = join(process.cwd(), 'public', 'forms', `${formKey}.pdf`)

  // Fallback to i131.pdf if specific form not available (for prototype)
  if (!existsSync(pdfPath)) {
    pdfPath = join(process.cwd(), 'public', 'forms', 'i131.pdf')
  }

  if (!existsSync(pdfPath)) {
    return NextResponse.json({ error: 'PDF template not found' }, { status: 404 })
  }

  try {
    const pdfBytes = readFileSync(pdfPath)
    const pdfDoc = await PDFDocument.load(pdfBytes)
    const form = pdfDoc.getForm()

    // Example Field Population
    // If we had the data layout, we could map data here:
    // const { data: client } = await supabase.from('clients').eq('id', caseForm.case.primary_client_id).single()
    // if (client) {
    //   try {
    //     form.getTextField('FamilyName').setText(client.last_name || '')
    //     form.getTextField('GivenName').setText(client.first_name || '')
    //   } catch(e) {}
    // }

    // Flatten form so it can't be edited easily
    // form.flatten()

    const filledPdfBytes = await pdfDoc.save()

    return new NextResponse(Buffer.from(filledPdfBytes) as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${formKey}_populated_${caseId}.pdf"`,
      },
    })
  } catch (error) {
    console.error('PDF Generation Error:', error)
    return NextResponse.json({ error: 'Error generating PDF' }, { status: 500 })
  }
}
