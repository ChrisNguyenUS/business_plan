// Compares state-data.ts senators and reps-data.ts House members with the
// official XML lists. Read-only. Run from apps/website:
//   node scripts/n400/verify-officials.mjs
// Prints mismatches; exit code 1 if any. Governors are checked by hand.
import { readFileSync } from 'node:fs';

const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z]/g, '');
const lastName = (full) => norm(full.trim().split(/\s+/).pop());
// Official surnames can be several words ("Van Hollen", "Blunt Rochester"); ours
// keep only the last word, so a match is an official surname ending in ours.
const sameName = (official, ours) => !!ours && (official === ours || official.endsWith(ours));
// clerk.house.gov uses AQ for American Samoa.
const HOUSE_STATE = { AQ: 'AS' };
const tag = (chunk, name) => chunk.match(new RegExp(`<${name}>([^<]*)</${name}>`))?.[1] ?? '';

const stateSrc = readFileSync('src/lib/n400/state-data.ts', 'utf8');
const repsSrc = readFileSync('src/lib/n400/reps-data.ts', 'utf8');

const ourSenators = {};
for (const m of stateSrc.matchAll(/code: '([A-Z]{2})'[^\n]*senators: \[([^\]]*)\]/g)) {
  ourSenators[m[1]] = [...m[2].matchAll(/'([^']+)'/g)].map((x) => lastName(x[1]));
}
const ourReps = {};
for (const m of repsSrc.matchAll(/stateCode: "([A-Z]{2})" as StateCode, districtNumber: (\d+), name: "([^"]+)"/g)) {
  ourReps[`${m[1]}-${Number(m[2])}`] = lastName(m[3]);
}

const senXml = await (await fetch('https://www.senate.gov/general/contact_information/senators_cfm.xml')).text();
const offSenators = {};
for (const chunk of senXml.split('</member>')) {
  const last = tag(chunk, 'last_name');
  const st = tag(chunk, 'state');
  if (last && st) (offSenators[st] ??= []).push(norm(last));
}

// One <member> at a time: a vacant seat has an empty <lastname> and must not
// borrow the next member's.
const houseXml = await (await fetch('https://clerk.house.gov/xml/lists/MemberData.xml')).text();
const offReps = {};
for (const chunk of houseXml.split('</member>')) {
  const sd = tag(chunk, 'statedistrict').match(/^([A-Z]{2})(\d{2})$/);
  if (!sd) continue;
  const last = tag(chunk, 'lastname');
  offReps[`${HOUSE_STATE[sd[1]] ?? sd[1]}-${Number(sd[2])}`] = last ? norm(last) : null;
}

const problems = [];
for (const [st, names] of Object.entries(offSenators)) {
  const ours = ourSenators[st] ?? [];
  const matched = ours.length === names.length && names.every((n) => ours.some((o) => sameName(n, o)));
  if (!matched) problems.push(`Senate ${st}: ours ${ours} vs official ${names}`);
}
for (const [key, name] of Object.entries(offReps)) {
  if (name === null) problems.push(`House ${key}: vacant on clerk.house.gov, ours ${ourReps[key] ?? '(none)'}`);
  else if (!sameName(name, ourReps[key])) problems.push(`House ${key}: ours ${ourReps[key] ?? '(none)'} vs official ${name}`);
}
console.log(problems.length ? problems.join('\n') : 'All senators and House members match.');
process.exit(problems.length ? 1 : 0);
