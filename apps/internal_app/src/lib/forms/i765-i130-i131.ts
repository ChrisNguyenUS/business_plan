import { formatDate } from '@/lib/utils'
import type { FormDefinition } from './types'

export const i765: FormDefinition = {
  id: 'i765',
  name: 'I-765 Application for Employment Authorization',
  filingMode: 'online',
  sections: [
    {
      id: 'part1',
      label: 'Part 1 — Reason for Applying',
      fields: [
        { id: 'eligibility_category', label: 'Eligibility Category', getValue: () => '' },
      ],
    },
    {
      id: 'part2_identity',
      label: 'Part 2 — Information About You',
      fields: [
        { id: 'family_name', label: 'Family Name (Last Name)', getValue: (c) => c.last_name ?? '' },
        { id: 'given_name', label: 'Given Name (First Name)', getValue: (c) => c.first_name ?? '' },
        { id: 'middle_name', label: 'Middle Name', getValue: (c) => c.middle_name ?? 'N/A' },
        { id: 'other_names', label: 'Other Names Used', getValue: (c) => (c.other_names ?? []).join(', ') || 'None' },
        { id: 'date_of_birth', label: 'Date of Birth (MM/DD/YYYY)', getValue: (c) => formatDate(c.date_of_birth) },
        { id: 'country_of_birth', label: 'Country of Birth', getValue: (c) => c.country_of_birth ?? '' },
        { id: 'country_of_citizenship', label: 'Country of Citizenship', getValue: (c) => c.country_of_birth ?? '' },
        { id: 'a_number', label: 'Alien Registration Number', getValue: (c) => c.a_number ?? 'None' },
        { id: 'ssn', label: 'Social Security Number (if any)', getValue: (c) => c.ssn ?? 'None' },
      ],
    },
    {
      id: 'part2_address',
      label: 'Part 2 — Mailing Address',
      fields: [
        { id: 'street', label: 'Street Number and Name', getValue: (c) => (c.address as any)?.street ?? '' },
        { id: 'city', label: 'City or Town', getValue: (c) => (c.address as any)?.city ?? '' },
        { id: 'state', label: 'State', getValue: (c) => (c.address as any)?.state ?? '' },
        { id: 'zip', label: 'ZIP Code', getValue: (c) => (c.address as any)?.zip ?? '' },
      ],
    },
  ],
}

export const i130: FormDefinition = {
  id: 'i130',
  name: 'I-130 Petition for Alien Relative',
  filingMode: 'online',
  sections: [
    {
      id: 'part1_petitioner',
      label: 'Part 1 — Information About You (Petitioner)',
      fields: [
        { id: 'family_name', label: 'Family Name (Last Name)', getValue: (c) => c.last_name ?? '' },
        { id: 'given_name', label: 'Given Name (First Name)', getValue: (c) => c.first_name ?? '' },
        { id: 'middle_name', label: 'Middle Name', getValue: (c) => c.middle_name ?? 'N/A' },
        { id: 'date_of_birth', label: 'Date of Birth (MM/DD/YYYY)', getValue: (c) => formatDate(c.date_of_birth) },
        { id: 'a_number', label: 'Alien Registration Number', getValue: (c) => c.a_number ?? 'None' },
        { id: 'ssn', label: 'Social Security Number', getValue: (c) => c.ssn ?? '' },
        { id: 'marital_status', label: 'Current Marital Status', getValue: (c) => c.marital_status ?? '' },
      ],
    },
    {
      id: 'part1_address',
      label: 'Part 1 — Petitioner Address',
      fields: [
        { id: 'street', label: 'Street Number and Name', getValue: (c) => (c.address as any)?.street ?? '' },
        { id: 'city', label: 'City or Town', getValue: (c) => (c.address as any)?.city ?? '' },
        { id: 'state', label: 'State', getValue: (c) => (c.address as any)?.state ?? '' },
        { id: 'zip', label: 'ZIP Code', getValue: (c) => (c.address as any)?.zip ?? '' },
      ],
    },
  ],
}

export const i131: FormDefinition = {
  id: 'i131',
  name: 'I-131 Application for Travel Document',
  filingMode: 'mail',
  sections: [
    {
      id: 'part1_identity',
      label: 'Part 1 — Information About You',
      fields: [
        { id: 'family_name', label: 'Family Name (Last Name)', getValue: (c) => c.last_name ?? '' },
        { id: 'given_name', label: 'Given Name (First Name)', getValue: (c) => c.first_name ?? '' },
        { id: 'middle_name', label: 'Middle Name', getValue: (c) => c.middle_name ?? 'N/A' },
        { id: 'date_of_birth', label: 'Date of Birth (MM/DD/YYYY)', getValue: (c) => formatDate(c.date_of_birth) },
        { id: 'country_of_birth', label: 'Country of Birth', getValue: (c) => c.country_of_birth ?? '' },
        { id: 'a_number', label: 'Alien Registration Number', getValue: (c) => c.a_number ?? '' },
        { id: 'ssn', label: 'Social Security Number', getValue: (c) => c.ssn ?? '' },
      ],
    },
    {
      id: 'part1_address',
      label: 'Part 1 — Address',
      fields: [
        { id: 'street', label: 'Street Number and Name', getValue: (c) => (c.address as any)?.street ?? '' },
        { id: 'city', label: 'City or Town', getValue: (c) => (c.address as any)?.city ?? '' },
        { id: 'state', label: 'State', getValue: (c) => (c.address as any)?.state ?? '' },
        { id: 'zip', label: 'ZIP Code', getValue: (c) => (c.address as any)?.zip ?? '' },
      ],
    },
  ],
  pdfTemplate: '/forms/i131/i131.pdf',
}
