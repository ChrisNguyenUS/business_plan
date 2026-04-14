import { fillPdf } from '@/lib/pdf/fill'
import { PDFDocument } from 'pdf-lib'

// Mock global fetch
global.fetch = jest.fn()

// Mock pdf-lib
jest.mock('pdf-lib', () => ({
  PDFDocument: {
    load: jest.fn(),
  },
}))

describe('fillPdf', () => {
  const mockSave = jest.fn().mockResolvedValue(new Uint8Array([1, 2, 3]))
  const mockSetText = jest.fn()
  const mockGetForm = jest.fn().mockReturnValue({
    getTextField: jest.fn((name) => {
      if (name === 'invalid_field') throw new Error('Field not found')
      return { setText: mockSetText }
    }),
  })

  beforeEach(() => {
    jest.clearAllMocks()
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(8)),
    })
    ;(PDFDocument.load as jest.Mock).mockResolvedValue({
      getForm: mockGetForm,
      save: mockSave,
    })
  })

  it('throws an error if form has no pdfTemplate or pdfFieldMap', async () => {
    const invalidForm = { id: 'invalid', name: 'Invalid', filingMode: 'mail', sections: [] }
    await expect(fillPdf(invalidForm as any, {})).rejects.toThrow(/has no PDF template configured/)
  })

  it('throws an error if template download fails', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false })
    const form = { id: 'f1', pdfTemplate: 'foo.pdf', pdfFieldMap: {}, sections: [] }
    await expect(fillPdf(form as any, {})).rejects.toThrow(/Could not load PDF template/)
  })

  it('maps allowed fields safely to the PDF text field and ignores missing fields', async () => {
    const form = {
      id: 'f1',
      pdfTemplate: 'foo.pdf',
      pdfFieldMap: {
        'field1': 'pdf_field_1',
        'field2': 'invalid_field', // mapped but doesn't exist in PDF
        'field3': 'pdf_field_3',
      },
      sections: [
        {
          id: 'sec1',
          fields: [
            { id: 'field1', getValue: () => 'Value 1' },
            { id: 'field2', getValue: () => 'Value 2' },
          ],
        },
      ],
    }

    const result = await fillPdf(form as any, {})

    expect(result).toBeInstanceOf(Uint8Array)
    expect(mockGetForm).toHaveBeenCalled()
    expect(mockSetText).toHaveBeenCalledWith('Value 1')
    // field2 throws internally but is caught by the try-catch block silently
    // field3 is defined in pdfFieldMap but has no associated logic in sections, meaning it is skipped
  })
})
