#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '../../..');
const SQL_PATH = resolve(ROOT, 'apps/website/supabase/migrations/n400_03_distractors.sql');
const OUT_PATH = resolve(__dirname, '../src/lib/n400/distractors-data.ts');

const SQL_ID_MAPPING = {
  100: 100, // Name one war in 1900s -> other wars
  101: 101, // Why enter WWI -> reasons for other wars
  102: 105, // Theodore Roosevelt... -> Who was president during Great Depression/WWII
  103: 106, // Germany invaded Poland... -> Why did US enter WWII
  104: 105, // Woodrow Wilson... -> Who was president during Great Depression/WWII
  106: 107, // WWI, Korean War... -> Eisenhower war (General in WWII)
  107: 109, // Terrorism, Fascism... -> concern during Cold War (Communism)
  108: 110, // To free Korea... -> Why enter Korean War
  109: 111, // To support France... -> Why enter Vietnam War
  110: 112, // Ended Cold War... -> What did Civil Rights do
  111: 113, // Led Underground Railroad... -> MLK Jr. famous for
  112: 114, // To stop communism... -> Why enter Persian Gulf War
  113: 115, // Pearl Harbor... -> September 11 attacks
  114: 116, // Korean War... -> conflict after September 11
  115: 117, // Aztec, Maya... -> Indian tribe
  122: 119, // New York City... -> Capital of US
  123: 120, // Boston Harbor... -> Where is Statue of Liberty
  124: 121, // 13 founding fathers... -> why flag has 13 stripes
  125: 122, // 50 amendments... -> why flag has 50 stars
  126: 123, // America the Beautiful... -> national anthem name
  127: 125, // July 14, June 14... -> Independence Day
  128: 126, // Valentine's Day... -> national U.S. holidays
};

const MANUAL_OVERRIDES = {
  102: [ // When did all women get the right to vote?
    { en: "After World War II", vi: "Sau Thế chiến thứ hai" },
    { en: "After the Civil War", vi: "Sau Nội chiến" },
    { en: "After the Revolutionary War", vi: "Sau Chiến tranh Cách mạng" },
    { en: "Before the Civil War", vi: "Trước Nội chiến" }
  ],
  103: [ // What was the Great Depression?
    { en: "A major war in Europe", vi: "Một cuộc chiến lớn ở châu Âu" },
    { en: "A period of rapid inflation in the 1970s", vi: "Thời kỳ lạm phát nhanh những năm 1970" },
    { en: "The stock market crash of 2008", vi: "Vụ sụp đổ thị trường chứng khoán năm 2008" },
    { en: "A natural disaster in the Midwest", vi: "Một thiên tai ở vùng Trung Tây" }
  ],
  104: [ // When did the Great Depression start?
    { en: "World War I in 1914", vi: "Thế chiến thứ nhất năm 1914" },
    { en: "The signing of the Constitution in 1787", vi: "Ký kết Hiến pháp năm 1787" },
    { en: "World War II in 1939", vi: "Thế chiến thứ hai năm 1939" },
    { en: "The passage of the Bill of Rights in 1791", vi: "Thông qua Tuyên ngôn Nhân quyền năm 1791" }
  ],
  108: [ // Who was the United States' main rival during the Cold War?
    { en: "Germany", vi: "Đức" },
    { en: "Japan", vi: "Nhật Bản" },
    { en: "Great Britain", vi: "Anh Quốc" },
    { en: "France", vi: "Pháp" },
    { en: "China", vi: "Trung Quốc" }
  ],
  118: [ // Name one example of an American innovation.
    { en: "Steam engine", vi: "Động cơ hơi nước" },
    { en: "Printing press", vi: "Máy in" },
    { en: "Gunpowder", vi: "Thuốc súng" },
    { en: "Compass", vi: "La bàn" }
  ],
  124: [ // The Nation's first motto was 'E Pluribus Unum.' What does that mean?
    { en: "In God We Trust", vi: "Chúng ta tin vào Thượng đế" },
    { en: "Liberty and Justice for All", vi: "Tự do và Công lý cho Tất cả" },
    { en: "Government of the people, by the people, for the people", vi: "Chính quyền của dân, do dân, vì dân" },
    { en: "Freedom of Speech", vi: "Tự do Ngôn luận" }
  ],
  127: [ // What is Memorial Day?
    { en: "A holiday to honor all military veterans", vi: "Ngày lễ vinh danh tất cả cựu chiến binh" },
    { en: "A holiday to celebrate independence from Britain", vi: "Ngày lễ kỷ niệm độc lập khỏi Anh" },
    { en: "A holiday to honor all U.S. presidents", vi: "Ngày lễ vinh danh tất cả tổng thống Mỹ" },
    { en: "A holiday to honor workers' achievements", vi: "Ngày lễ vinh danh thành tựu của người lao động" }
  ],
  128: [ // What is Veterans Day?
    { en: "A holiday to honor soldiers who died in military service", vi: "Ngày lễ vinh danh các chiến sĩ hy sinh trong lúc phục vụ quân ngũ" },
    { en: "A holiday to celebrate the discovery of America", vi: "Ngày lễ kỷ niệm việc khám phá ra châu Mỹ" },
    { en: "A holiday to honor all U.S. presidents", vi: "Ngày lễ vinh danh tất cả tổng thống Mỹ" },
    { en: "A holiday to honor workers' achievements", vi: "Ngày lễ vinh danh thành tựu của người lao động" }
  ]
};

function main() {
  const sql = readFileSync(SQL_PATH, 'utf-8');
  const regex = /\(\s*(\d+)\s*,\s*'((?:[^']|'')*)'\s*,\s*'((?:[^']|'')*)'\s*,\s*false\s*,\s*\d+\s*\)/g;
  
  const map = {};
  
  // Helper to add distractors to map with deduplication by lowercased English text
  const addDistractor = (targetId, en, vi) => {
    if (!map[targetId]) {
      map[targetId] = [];
    }
    const exists = map[targetId].some(d => d.en.toLowerCase().trim() === en.toLowerCase().trim());
    if (!exists) {
      map[targetId].push({ en, vi });
    }
  };

  let match;
  while ((match = regex.exec(sql)) !== null) {
    const sqlId = parseInt(match[1], 10);
    const en = match[2].replace(/''/g, "'");
    const vi = match[3].replace(/''/g, "'");

    let targetId;
    if (sqlId < 100) {
      targetId = sqlId;
    } else {
      targetId = SQL_ID_MAPPING[sqlId];
    }

    if (targetId !== undefined) {
      addDistractor(targetId, en, vi);
    }
  }

  // Inject manual overrides
  for (const [targetIdStr, list] of Object.entries(MANUAL_OVERRIDES)) {
    const targetId = parseInt(targetIdStr, 10);
    for (const item of list) {
      addDistractor(targetId, item.en, item.vi);
    }
  }

  const lines = [
    '// AUTO-GENERATED by scripts/n400-build-distractors.mjs — do not edit by hand.',
    '// Source: supabase/migrations/n400_03_distractors.sql',
    '',
    'export interface N400Distractor {',
    '  en: string;',
    '  vi: string;',
    '}',
    '',
    'export const N400_DISTRACTORS: Record<number, N400Distractor[]> = {',
  ];

  // Output sorted keys from 1 to 128
  const sortedKeys = Object.keys(map).map(Number).sort((a, b) => a - b);
  for (const qid of sortedKeys) {
    lines.push(`  ${qid}: [`);
    for (const item of map[qid]) {
      lines.push(`    { en: ${JSON.stringify(item.en)}, vi: ${JSON.stringify(item.vi)} },`);
    }
    lines.push('  ],');
  }

  lines.push('};');
  lines.push('');

  writeFileSync(OUT_PATH, lines.join('\n'), 'utf-8');
  console.log(`Wrote distractors for ${sortedKeys.length} questions to ${OUT_PATH}`);
}

main();
