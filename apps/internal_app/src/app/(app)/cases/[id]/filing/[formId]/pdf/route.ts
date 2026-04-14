import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getForm } from '@/lib/forms'
import { fillPdf } from '@/lib/pdf/fill'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; formId: string }> }
) {
  const { id, formId } = await params;
  const supabase = await createClient()

  const { data: caseData, error: caseError } = await supabase
    .from('cases')
    .select(`
      *,
      primary_client:clients!cases_primary_client_id_fkey(*),
      secondary_client:clients!cases_secondary_client_id_fkey(*),
      case_forms(*)
    `)
    .eq('id', id)
    .single()

  if (caseError || !caseData) {
    return NextResponse.json({ error: 'Case not found' }, { status: 404 })
  }

  const caseForm = (caseData.case_forms as any[]).find(f => f.id === formId)
  if (!caseForm) {
    return NextResponse.json({ error: 'Form not found' }, { status: 404 })
  }

  const form = getForm(caseForm.form_type)
  if (!form) {
    return NextResponse.json({ error: 'Unsupported form type' }, { status: 400 })
  }
  
  const client = caseData.primary_client as Record<string, any>

  const pdfBytes = await fillPdf(form, client)

  const primary = caseData.primary_client as any
  const filename = `${form.id}-${primary.last_name}-${primary.first_name}.pdf`

  return new NextResponse(pdfBytes as any, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
