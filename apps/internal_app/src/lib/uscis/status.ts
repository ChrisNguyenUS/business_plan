export type UscisStatusResult = {
  status: string
  description: string
}

/** Fetch case status from USCIS for a given receipt number */
export async function fetchUscisStatus(receiptNumber: string): Promise<UscisStatusResult> {
  const response = await fetch('https://egov.uscis.gov/casestatus/mycasestatus.do', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      appReceiptNum: receiptNumber,
      caseStatusSearchBtn: 'CHECK STATUS',
    }),
  })
  if (!response.ok) throw new Error(`USCIS returned ${response.status}`)
  const html = await response.text()
  return parseUscisStatus(html)
}

/** Parse USCIS case status HTML response */
export function parseUscisStatus(html: string): UscisStatusResult {
  // USCIS wraps status in <h4> and description in <p> inside .rows.text-center
  const h4Match = html.match(/<h4[^>]*>(.*?)<\/h4>/s)
  const pMatch = html.match(/<div[^>]*class="[^"]*rows text-center[^"]*"[^>]*>.*?<p[^>]*>(.*?)<\/p>/s)

  const status = h4Match ? stripTags(h4Match[1]).trim() : 'Unknown'
  const description = pMatch ? stripTags(pMatch[1]).trim() : ''

  return { status, description }
}

function stripTags(html: string): string {
  return html.replace(/<[^>]*>/g, '')
}
