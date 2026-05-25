import { createClient } from '@supabase/supabase-js';
import { readdirSync, statSync, writeFileSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const STATE_CODE_BY_NAME: Record<string, string> = {
  Alabama: 'AL', Alaska: 'AK', Arizona: 'AZ', Arkansas: 'AR', California: 'CA',
  Colorado: 'CO', Connecticut: 'CT', Delaware: 'DE', Florida: 'FL', Georgia: 'GA',
  Hawaii: 'HI', Idaho: 'ID', Illinois: 'IL', Indiana: 'IN', Iowa: 'IA',
  Kansas: 'KS', Kentucky: 'KY', Louisiana: 'LA', Maine: 'ME', Maryland: 'MD',
  Massachusetts: 'MA', Michigan: 'MI', Minnesota: 'MN', Mississippi: 'MS',
  Missouri: 'MO', Montana: 'MT', Nebraska: 'NE', Nevada: 'NV',
  'New Hampshire': 'NH', 'New Jersey': 'NJ', 'New Mexico': 'NM', 'New York': 'NY',
  'North Carolina': 'NC', 'North Dakota': 'ND', Ohio: 'OH', Oklahoma: 'OK',
  Oregon: 'OR', Pennsylvania: 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC',
  'South Dakota': 'SD', Tennessee: 'TN', Texas: 'TX', Utah: 'UT', Vermont: 'VT',
  Virginia: 'VA', Washington: 'WA', 'West Virginia': 'WV', Wisconsin: 'WI', Wyoming: 'WY',
  'American Samoa': 'AS', 'District of Columbia': 'DC', Guam: 'GU',
  'Northern Mariana Islands': 'MP', 'Puerto Rico': 'PR', 'Virgin Islands': 'VI',
};

function parseDistrict(folder: string): number | null {
  // "1st" / "23rd" / "53rd"
  const numeric = folder.match(/^(\d+)(?:st|nd|rd|th)$/);
  if (numeric) return parseInt(numeric[1], 10);
  // "At_Large" / "Delegate" / "Resident_Commissioner" → 0
  if (folder === 'At_Large' || folder === 'Delegate' || folder === 'Resident_Commissioner') {
    return 0;
  }
  return null;
}

function audioUrl(stateName: string, district: string, filename: string): string {
  // Static path served by Next.js from /public/n400-audio/State/<state>/House of rep/<district>/<file>
  const enc = (s: string) => encodeURIComponent(s).replace(/%20/g, '%20');
  return `/n400-audio/State/${enc(stateName)}/House of rep/${enc(district)}/${enc(filename)}`;
}

interface RepRow {
  state_code: string;
  district_number: number;
  rep_name: string;
  rep_audio_url: string;
}

function buildReps(): RepRow[] {
  const root = resolve(__dirname, '../../N400_voice/State');
  const rows: RepRow[] = [];

  for (const stateName of readdirSync(root)) {
    const code = STATE_CODE_BY_NAME[stateName];
    if (!code) {
      console.warn(`Skip unknown state: ${stateName}`);
      continue;
    }
    const houseDir = join(root, stateName, 'House of rep');
    if (!statSync(houseDir, { throwIfNoEntry: false })?.isDirectory()) continue;

    for (const districtFolder of readdirSync(houseDir)) {
      const districtNum = parseDistrict(districtFolder);
      if (districtNum === null) {
        console.warn(`Skip unknown district folder: ${stateName}/${districtFolder}`);
        continue;
      }
      const distDir = join(houseDir, districtFolder);
      const files = readdirSync(distDir).filter((f) => f.endsWith('.mp3'));
      if (files.length === 0) continue;
      const file = files[0];
      const repName = file.replace(/\.mp3$/, '').replace(/_/g, ' ');
      rows.push({
        state_code: code,
        district_number: districtNum,
        rep_name: repName,
        rep_audio_url: audioUrl(stateName, districtFolder, file),
      });
    }
  }

  return rows.sort((a, b) =>
    a.state_code.localeCompare(b.state_code) || a.district_number - b.district_number
  );
}

async function main() {
  const reps = buildReps();
  console.log(`Built ${reps.length} reps from N400_voice/`);

  // Snapshot CSV for human review and version control.
  const csv = ['state_code,district_number,rep_name,rep_audio_url']
    .concat(reps.map((r) => `${r.state_code},${r.district_number},${r.rep_name},${r.rep_audio_url}`))
    .join('\n');
  writeFileSync(resolve(__dirname, 'reps-2025.csv'), csv, 'utf-8');

  // Upsert to DB. Use service role client; PRIMARY KEY (state_code, district_number) handles dedupe.
  const { error } = await supabase
    .from('n400_representatives')
    .upsert(reps, { onConflict: 'state_code,district_number' });
  if (error) throw new Error(error.message);

  console.log('Done.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
