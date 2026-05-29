import type { N400CategoryKey } from './questions-data';

export type StateCode =
  | 'AL' | 'AK' | 'AZ' | 'AR' | 'CA' | 'CO' | 'CT' | 'DE' | 'FL' | 'GA'
  | 'HI' | 'ID' | 'IL' | 'IN' | 'IA' | 'KS' | 'KY' | 'LA' | 'ME' | 'MD'
  | 'MA' | 'MI' | 'MN' | 'MS' | 'MO' | 'MT' | 'NE' | 'NV' | 'NH' | 'NJ'
  | 'NM' | 'NY' | 'NC' | 'ND' | 'OH' | 'OK' | 'OR' | 'PA' | 'RI' | 'SC'
  | 'SD' | 'TN' | 'TX' | 'UT' | 'VT' | 'VA' | 'WA' | 'WV' | 'WI' | 'WY'
  | 'AS' | 'DC' | 'GU' | 'MP' | 'PR' | 'VI';

export interface StateInfo {
  code: StateCode;
  nameEn: string;
  nameVi: string;
  governor: string;
  capital: string | null;
  senators: string[];
}

// Source: docs/superpowers/plans/2026-05-13-n400app-phase-1-db-schema.md (Task 7)
// Folder names match apps/website/N400_voice/State/<nameEn>/
export const STATES: StateInfo[] = [
  { code: 'AL', nameEn: 'Alabama', nameVi: 'Alabama', governor: 'Kay Ivey', capital: 'Montgomery', senators: ['Tommy Tuberville', 'Katie Britt'] },
  { code: 'AK', nameEn: 'Alaska', nameVi: 'Alaska', governor: 'Mike Dunleavy', capital: 'Juneau', senators: ['Lisa Murkowski', 'Dan Sullivan'] },
  { code: 'AZ', nameEn: 'Arizona', nameVi: 'Arizona', governor: 'Katie Hobbs', capital: 'Phoenix', senators: ['Mark Kelly', 'Ruben Gallego'] },
  { code: 'AR', nameEn: 'Arkansas', nameVi: 'Arkansas', governor: 'Sarah Huckabee Sanders', capital: 'Little Rock', senators: ['John Boozman', 'Tom Cotton'] },
  { code: 'CA', nameEn: 'California', nameVi: 'California', governor: 'Gavin Newsom', capital: 'Sacramento', senators: ['Alex Padilla', 'Adam Schiff'] },
  { code: 'CO', nameEn: 'Colorado', nameVi: 'Colorado', governor: 'Jared Polis', capital: 'Denver', senators: ['Michael Bennet', 'John Hickenlooper'] },
  { code: 'CT', nameEn: 'Connecticut', nameVi: 'Connecticut', governor: 'Ned Lamont', capital: 'Hartford', senators: ['Chris Murphy', 'Richard Blumenthal'] },
  { code: 'DE', nameEn: 'Delaware', nameVi: 'Delaware', governor: 'Matt Meyer', capital: 'Dover', senators: ['Lisa Blunt Rochester', 'Chris Coons'] },
  { code: 'FL', nameEn: 'Florida', nameVi: 'Florida', governor: 'Ron DeSantis', capital: 'Tallahassee', senators: ['Ashley Moody', 'Rick Scott'] },
  { code: 'GA', nameEn: 'Georgia', nameVi: 'Georgia', governor: 'Brian Kemp', capital: 'Atlanta', senators: ['Jon Ossoff', 'Raphael Warnock'] },
  { code: 'HI', nameEn: 'Hawaii', nameVi: 'Hawaii', governor: 'Josh Green', capital: 'Honolulu', senators: ['Brian Schatz', 'Mazie Hirono'] },
  { code: 'ID', nameEn: 'Idaho', nameVi: 'Idaho', governor: 'Brad Little', capital: 'Boise', senators: ['Mike Crapo', 'Jim Risch'] },
  { code: 'IL', nameEn: 'Illinois', nameVi: 'Illinois', governor: 'J.B. Pritzker', capital: 'Springfield', senators: ['Dick Durbin', 'Tammy Duckworth'] },
  { code: 'IN', nameEn: 'Indiana', nameVi: 'Indiana', governor: 'Mike Braun', capital: 'Indianapolis', senators: ['Todd Young', 'Jim Banks'] },
  { code: 'IA', nameEn: 'Iowa', nameVi: 'Iowa', governor: 'Kim Reynolds', capital: 'Des Moines', senators: ['Chuck Grassley', 'Joni Ernst'] },
  { code: 'KS', nameEn: 'Kansas', nameVi: 'Kansas', governor: 'Laura Kelly', capital: 'Topeka', senators: ['Jerry Moran', 'Roger Marshall'] },
  { code: 'KY', nameEn: 'Kentucky', nameVi: 'Kentucky', governor: 'Andy Beshear', capital: 'Frankfort', senators: ['Mitch McConnell', 'Rand Paul'] },
  { code: 'LA', nameEn: 'Louisiana', nameVi: 'Louisiana', governor: 'Jeff Landry', capital: 'Baton Rouge', senators: ['Bill Cassidy', 'John Kennedy'] },
  { code: 'ME', nameEn: 'Maine', nameVi: 'Maine', governor: 'Janet Mills', capital: 'Augusta', senators: ['Susan Collins', 'Angus King'] },
  { code: 'MD', nameEn: 'Maryland', nameVi: 'Maryland', governor: 'Wes Moore', capital: 'Annapolis', senators: ['Angela Alsobrooks', 'Chris Van Hollen'] },
  { code: 'MA', nameEn: 'Massachusetts', nameVi: 'Massachusetts', governor: 'Maura Healey', capital: 'Boston', senators: ['Elizabeth Warren', 'Ed Markey'] },
  { code: 'MI', nameEn: 'Michigan', nameVi: 'Michigan', governor: 'Gretchen Whitmer', capital: 'Lansing', senators: ['Elissa Slotkin', 'Gary Peters'] },
  { code: 'MN', nameEn: 'Minnesota', nameVi: 'Minnesota', governor: 'Tim Walz', capital: 'Saint Paul', senators: ['Amy Klobuchar', 'Tina Smith'] },
  { code: 'MS', nameEn: 'Mississippi', nameVi: 'Mississippi', governor: 'Tate Reeves', capital: 'Jackson', senators: ['Roger Wicker', 'Cindy Hyde-Smith'] },
  { code: 'MO', nameEn: 'Missouri', nameVi: 'Missouri', governor: 'Mike Kehoe', capital: 'Jefferson City', senators: ['Josh Hawley', 'Eric Schmitt'] },
  { code: 'MT', nameEn: 'Montana', nameVi: 'Montana', governor: 'Greg Gianforte', capital: 'Helena', senators: ['Steve Daines', 'Tim Sheehy'] },
  { code: 'NE', nameEn: 'Nebraska', nameVi: 'Nebraska', governor: 'Jim Pillen', capital: 'Lincoln', senators: ['Deb Fischer', 'Pete Ricketts'] },
  { code: 'NV', nameEn: 'Nevada', nameVi: 'Nevada', governor: 'Joe Lombardo', capital: 'Carson City', senators: ['Catherine Cortez Masto', 'Jacky Rosen'] },
  { code: 'NH', nameEn: 'New Hampshire', nameVi: 'New Hampshire', governor: 'Kelly Ayotte', capital: 'Concord', senators: ['Jeanne Shaheen', 'Maggie Hassan'] },
  { code: 'NJ', nameEn: 'New Jersey', nameVi: 'New Jersey', governor: 'Mikie Sherrill', capital: 'Trenton', senators: ['Andy Kim', 'Cory Booker'] },
  { code: 'NM', nameEn: 'New Mexico', nameVi: 'New Mexico', governor: 'Michelle Lujan Grisham', capital: 'Santa Fe', senators: ['Martin Heinrich', 'Ben Ray Luján'] },
  { code: 'NY', nameEn: 'New York', nameVi: 'New York', governor: 'Kathy Hochul', capital: 'Albany', senators: ['Chuck Schumer', 'Kirsten Gillibrand'] },
  { code: 'NC', nameEn: 'North Carolina', nameVi: 'North Carolina', governor: 'Josh Stein', capital: 'Raleigh', senators: ['Thom Tillis', 'Ted Budd'] },
  { code: 'ND', nameEn: 'North Dakota', nameVi: 'North Dakota', governor: 'Kelly Armstrong', capital: 'Bismarck', senators: ['John Hoeven', 'Kevin Cramer'] },
  { code: 'OH', nameEn: 'Ohio', nameVi: 'Ohio', governor: 'Mike DeWine', capital: 'Columbus', senators: ['Bernie Moreno', 'Jon Husted'] },
  { code: 'OK', nameEn: 'Oklahoma', nameVi: 'Oklahoma', governor: 'Kevin Stitt', capital: 'Oklahoma City', senators: ['Alan Armstrong', 'James Lankford'] },
  { code: 'OR', nameEn: 'Oregon', nameVi: 'Oregon', governor: 'Tina Kotek', capital: 'Salem', senators: ['Ron Wyden', 'Jeff Merkley'] },
  { code: 'PA', nameEn: 'Pennsylvania', nameVi: 'Pennsylvania', governor: 'Josh Shapiro', capital: 'Harrisburg', senators: ['Dave McCormick', 'John Fetterman'] },
  { code: 'RI', nameEn: 'Rhode Island', nameVi: 'Rhode Island', governor: 'Dan McKee', capital: 'Providence', senators: ['Jack Reed', 'Sheldon Whitehouse'] },
  { code: 'SC', nameEn: 'South Carolina', nameVi: 'South Carolina', governor: 'Henry McMaster', capital: 'Columbia', senators: ['Lindsey Graham', 'Tim Scott'] },
  { code: 'SD', nameEn: 'South Dakota', nameVi: 'South Dakota', governor: 'Larry Rhoden', capital: 'Pierre', senators: ['John Thune', 'Mike Rounds'] },
  { code: 'TN', nameEn: 'Tennessee', nameVi: 'Tennessee', governor: 'Bill Lee', capital: 'Nashville', senators: ['Marsha Blackburn', 'Bill Hagerty'] },
  { code: 'TX', nameEn: 'Texas', nameVi: 'Texas', governor: 'Greg Abbott', capital: 'Austin', senators: ['John Cornyn', 'Ted Cruz'] },
  { code: 'UT', nameEn: 'Utah', nameVi: 'Utah', governor: 'Spencer Cox', capital: 'Salt Lake City', senators: ['Mike Lee', 'John Curtis'] },
  { code: 'VT', nameEn: 'Vermont', nameVi: 'Vermont', governor: 'Phil Scott', capital: 'Montpelier', senators: ['Bernie Sanders', 'Peter Welch'] },
  { code: 'VA', nameEn: 'Virginia', nameVi: 'Virginia', governor: 'Abigail Spanberger', capital: 'Richmond', senators: ['Mark Warner', 'Tim Kaine'] },
  { code: 'WA', nameEn: 'Washington', nameVi: 'Washington', governor: 'Bob Ferguson', capital: 'Olympia', senators: ['Patty Murray', 'Maria Cantwell'] },
  { code: 'WV', nameEn: 'West Virginia', nameVi: 'West Virginia', governor: 'Patrick Morrisey', capital: 'Charleston', senators: ['Jim Justice', 'Shelley Moore Capito'] },
  { code: 'WI', nameEn: 'Wisconsin', nameVi: 'Wisconsin', governor: 'Tony Evers', capital: 'Madison', senators: ['Tammy Baldwin', 'Ron Johnson'] },
  { code: 'WY', nameEn: 'Wyoming', nameVi: 'Wyoming', governor: 'Mark Gordon', capital: 'Cheyenne', senators: ['John Barrasso', 'Cynthia Lummis'] },
  { code: 'AS', nameEn: 'American Samoa', nameVi: 'Samoa thuộc Mỹ', governor: 'Lemanu Peleti Mauga', capital: null, senators: [] },
  { code: 'DC', nameEn: 'District of Columbia', nameVi: 'Washington, D.C.', governor: 'Muriel Bowser', capital: null, senators: [] },
  { code: 'GU', nameEn: 'Guam', nameVi: 'Guam', governor: 'Lou Leon Guerrero', capital: null, senators: [] },
  { code: 'MP', nameEn: 'Northern Mariana Islands', nameVi: 'Quần đảo Bắc Mariana', governor: 'Arnold Palacios', capital: null, senators: [] },
  { code: 'PR', nameEn: 'Puerto Rico', nameVi: 'Puerto Rico', governor: 'Jenniffer González-Colón', capital: null, senators: [] },
  { code: 'VI', nameEn: 'Virgin Islands', nameVi: 'Quần đảo Virgin Mỹ', governor: 'Albert Bryan', capital: null, senators: [] },
];

export const STATES_BY_CODE: Record<StateCode, StateInfo> = STATES.reduce(
  (acc, s) => {
    acc[s.code] = s;
    return acc;
  },
  {} as Record<StateCode, StateInfo>
);

export const DEFAULT_STATE_CODE: StateCode = 'TX';

// Map from category key to a friendly UI label tone (icon background color).
export const CATEGORY_TONE: Record<N400CategoryKey, string> = {
  principles: 'bg-teal-50 text-teal-600',
  system: 'bg-orange-50 text-orange-500',
  rights: 'bg-yellow-50 text-yellow-500',
  history: 'bg-purple-50 text-purple-600',
  symbols: 'bg-blue-50 text-blue-600',
};
