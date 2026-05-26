// Normalize a politician name to the filename slug convention used in N400_voice/.
// "Robert F. Kennedy Jr." → "Robert_F_Kennedy_Jr"
// "Mary O'Brien"          → "Mary_OBrien"
// "Jean-Pierre Smith"     → "Jean_Pierre_Smith"
//
// Two canonicalizations exist in the wild and we accept both:
//   - `nameToSlug` strips diacritics first ("González" → "Gonzalez")
//   - `nameToSlugAscii` replaces every non-ASCII-alnum char with `_`
//     ("González" → "Gonz_lez", matching how the owner recorded the files)
export function nameToSlug(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')      // strip combining accent marks
    .replace(/[^A-Za-z0-9]+/g, '_')       // collapse non-alnum to _
    .replace(/^_+|_+$/g, '')              // trim
}

export function nameToSlugAscii(name: string): string {
  return name
    .replace(/[^A-Za-z0-9]+/g, '_')       // every non-ASCII-alnum → _ (no NFD step)
    .replace(/^_+|_+$/g, '')
}

// Inverse: filename stem → comparable name. Lowercased + collapsed for matching.
export function slugKey(s: string): string {
  return s.replace(/[^A-Za-z0-9]+/g, '').toLowerCase()
}

// Convert a House district folder name to a district_number.
//   "1st" / "2nd" / "23rd"           → 1, 2, 23
//   "At_Large" / "At Large"          → 0
//   "Delegate"                       → 0  (DC, GU, AS, MP, VI)
//   "Resident_Commissioner"          → 0  (PR)
export function districtFromFolder(name: string): number | null {
  const flat = name.replace(/[_\s-]/g, '').toLowerCase()
  if (flat === 'atlarge' || flat === 'delegate' || flat === 'residentcommissioner') return 0
  const m = name.match(/^(\d+)/)
  return m ? parseInt(m[1], 10) : null
}
