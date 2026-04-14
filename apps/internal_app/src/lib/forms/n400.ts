import { formatDate } from '@/lib/utils'
import type { FormDefinition } from './types'

export const n400: FormDefinition = {
  id: 'n400',
  name: 'N-400 Application for Naturalization',
  filingMode: 'online',
  sections: [
    {
      id: 'part2_identity',
      label: 'Part 2 — Your Name',
      fields: [
        { id: 'family_name', label: 'Family Name (Last Name)', getValue: (c) => c.last_name ?? '' },
        { id: 'given_name', label: 'Given Name (First Name)', getValue: (c) => c.first_name ?? '' },
        { id: 'middle_name', label: 'Middle Name', getValue: (c) => c.middle_name ?? 'N/A' },
      ],
    },
    {
      id: 'part2_dob',
      label: 'Part 2 — Date of Birth & Immigration Info',
      fields: [
        { id: 'date_of_birth', label: 'Date of Birth (MM/DD/YYYY)', getValue: (c) => formatDate(c.date_of_birth) },
        { id: 'country_of_birth', label: 'Country of Birth', getValue: (c) => c.country_of_birth ?? '' },
        { id: 'a_number', label: 'Alien Registration Number (A-Number)', getValue: (c) => c.a_number ? c.a_number.replace(/^A-?/i, '') : '' },
        { id: 'ssn', label: 'US Social Security Number', getValue: (c) => c.ssn ?? 'None' },
        { id: 'marital_status', label: 'Marital Status', getValue: (c) => c.marital_status ?? '' },
      ],
    },
    {
      id: 'part2_address',
      label: 'Part 2 — Physical Address',
      fields: [
        { id: 'street', label: 'Street Number and Name', getValue: (c) => (c.address as any)?.street ?? '' },
        { id: 'city', label: 'City or Town', getValue: (c) => (c.address as any)?.city ?? '' },
        { id: 'state', label: 'State', getValue: (c) => (c.address as any)?.state ?? '' },
        { id: 'zip', label: 'ZIP Code', getValue: (c) => (c.address as any)?.zip ?? '' },
      ],
    },
    {
      id: 'part2_contact',
      label: 'Part 2 — Contact Information',
      fields: [
        { id: 'phone', label: 'Daytime Phone Number', getValue: (c) => c.phone ?? '' },
        { id: 'email', label: 'Email Address', getValue: (c) => c.email ?? '' },
      ],
    },
    {
      id: 'part3',
      label: 'Part 3 — Accommodation',
      fields: [
        {
          id: 'accommodation',
          label: 'Do you need an accommodation?',
          getValue: () => 'No',
        },
      ],
    },
  ],
}
