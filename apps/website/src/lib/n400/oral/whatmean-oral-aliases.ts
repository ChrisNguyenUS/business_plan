// Hand-written synonyms for What-mean definitions, owner-reviewed at Gate S1
// (speaking spec §3.1). Each is graded as its own `single` config (every keyword
// required) and inherits the term's mustExclude. Every entry needs a one-line
// reason and is covered by whatmean-oral.corpus.test.ts. Changes are spec changes.

export const WHATMEAN_ORAL_ALIASES: Readonly<Record<string, string[][]>> = {
  // Claim to be a U.S. citizen — "tell" / "pretend" are how learners phrase "say".
  'wm-1': [['tell citizen'], ['pretend citizen']],
  // Register to vote — "sign up to vote" is the everyday phrasing.
  'wm-2': [['sign up vote']],
  // Vote — "choose a leader"; "in an election" is optional (Gate S1, owner).
  'wm-3': [['choose leader']],
  // Alien — "a non-citizen", "a noncitizen", "a foreigner" (Gate S1, owner).
  'wm-6': [['non citizen'], ['noncitizen'], ['foreigner']],
  // Overthrow — "take down" for "remove"; "violence" for "force" (Gate S1, owner).
  'wm-7': [['take down government force'], ['remove government violence']],
  // Torture — "hurt someone" for "cause great pain to someone".
  'wm-10': [['hurt someone']],
  // Genocide — killing people for their race or religion, without "group".
  'wm-11': [['kill people race'], ['kill people religion']],
  // Kill — "make someone die"; "murder" (Gate S1, owner).
  'wm-12': [['make someone die'], ['murder']],
  // Prison / Jail — "a place where people are locked up".
  'wm-13': [['place people locked']],
  // Crime — "breaking the law".
  'wm-16': [['break law']],
  // Offense — "small" for "minor".
  'wm-17': [['small crime']],
  // Cited — "got / gave a ticket" for "given a ticket".
  'wm-19': [['got ticket police'], ['gave ticket police']],
  // Drug paraphernalia — "tools" for "equipment".
  'wm-24': [['tools use illegal drugs']],
  // Obtain immigration benefit — "get a green card".
  'wm-25': [['get green card']],
  // Illegal gambling — "gambling for money illegally".
  'wm-26': [['gamble money illegal'], ['gamble money illegally']],
  // Misrepresentation — "not telling the truth" (Gate S1, owner).
  'wm-29': [['not tell truth']],
  // Lie — "not telling the truth".
  'wm-32': [['not tell truth']],
  // Deported — "sent back to your country", "kicked out".
  'wm-33': [['sent back country'], ['kicked out']],
  // Oath of allegiance — "swear to be loyal".
  'wm-36': [['swear loyal']],
  // Bear arms — "fight in a war" (mustExclude "not" keeps non-combatant out).
  'wm-37': [['fight war']],
  // Polygamy — "more than one wife / husband"; "two wives / husbands" (Gate S1, owner).
  'wm-44': [['more 1 wife'], ['more 1 husband'], ['2 wives'], ['2 husbands']],
  // Marital status — "whether you are married" (Gate S1, owner).
  'wm-45': [['whether married']],
  // Annulled — canceled/cancelled only with "as if it never happened": that qualifier is
  // material, so "the marriage was cancelled" alone stays near (Gate S1, owner).
  'wm-47': [['marriage cancel never happened'], ['marriage cancelled never happened']],
  // Perjury — "lying under oath" ("lying" does not stem to "lie").
  'wm-48': [['lying under oath']],
  // Verify — "show" / "confirm" something is true.
  'wm-50': [['show true'], ['confirm true']],
  // Militia — "an army not from the government".
  'wm-53': [['army not government']],
  // Vigilante unit — "not real police".
  'wm-55': [['not real police']],
  // Alternative sentencing — "a punishment instead of jail".
  'wm-56': [['punishment instead jail']],
  // Rehabilitative program — "a program to help someone recover".
  'wm-57': [['program help recover']],
  // Prior / Previous — "earlier".
  'wm-60': [['earlier']],
  // Current — "now" alone (Gate S1, owner).
  'wm-61': [['now']],
};
