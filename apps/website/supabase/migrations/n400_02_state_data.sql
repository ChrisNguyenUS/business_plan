-- 56 jurisdictions: 50 states + 6 territories. Governor + capital + senators current as of late 2025.

INSERT INTO public.n400_state_data (state_code, state_name_en, state_name_vi, governor_name, capital_city, senator_1, senator_2) VALUES
('AL','Alabama','Alabama','Kay Ivey','Montgomery','Tommy Tuberville','Katie Britt'),
('AK','Alaska','Alaska','Mike Dunleavy','Juneau','Lisa Murkowski','Dan Sullivan'),
('AZ','Arizona','Arizona','Katie Hobbs','Phoenix','Mark Kelly','Ruben Gallego'),
('AR','Arkansas','Arkansas','Sarah Huckabee Sanders','Little Rock','John Boozman','Tom Cotton'),
('CA','California','California','Gavin Newsom','Sacramento','Alex Padilla','Adam Schiff'),
('CO','Colorado','Colorado','Jared Polis','Denver','Michael Bennet','John Hickenlooper'),
('CT','Connecticut','Connecticut','Ned Lamont','Hartford','Chris Murphy','Richard Blumenthal'),
('DE','Delaware','Delaware','Matt Meyer','Dover','Lisa Blunt Rochester','Chris Coons'),
('FL','Florida','Florida','Ron DeSantis','Tallahassee','Marco Rubio','Rick Scott'),
('GA','Georgia','Georgia','Brian Kemp','Atlanta','Jon Ossoff','Raphael Warnock'),
('HI','Hawaii','Hawaii','Josh Green','Honolulu','Brian Schatz','Mazie Hirono'),
('ID','Idaho','Idaho','Brad Little','Boise','Mike Crapo','Jim Risch'),
('IL','Illinois','Illinois','JB Pritzker','Springfield','Dick Durbin','Tammy Duckworth'),
('IN','Indiana','Indiana','Mike Braun','Indianapolis','Todd Young','Jim Banks'),
('IA','Iowa','Iowa','Kim Reynolds','Des Moines','Chuck Grassley','Joni Ernst'),
('KS','Kansas','Kansas','Laura Kelly','Topeka','Jerry Moran','Roger Marshall'),
('KY','Kentucky','Kentucky','Andy Beshear','Frankfort','Mitch McConnell','Rand Paul'),
('LA','Louisiana','Louisiana','Jeff Landry','Baton Rouge','Bill Cassidy','John Kennedy'),
('ME','Maine','Maine','Janet Mills','Augusta','Susan Collins','Angus King'),
('MD','Maryland','Maryland','Wes Moore','Annapolis','Chris Van Hollen','Angela Alsobrooks'),
('MA','Massachusetts','Massachusetts','Maura Healey','Boston','Elizabeth Warren','Ed Markey'),
('MI','Michigan','Michigan','Gretchen Whitmer','Lansing','Gary Peters','Elissa Slotkin'),
('MN','Minnesota','Minnesota','Tim Walz','Saint Paul','Amy Klobuchar','Tina Smith'),
('MS','Mississippi','Mississippi','Tate Reeves','Jackson','Roger Wicker','Cindy Hyde-Smith'),
('MO','Missouri','Missouri','Mike Kehoe','Jefferson City','Josh Hawley','Eric Schmitt'),
('MT','Montana','Montana','Greg Gianforte','Helena','Steve Daines','Tim Sheehy'),
('NE','Nebraska','Nebraska','Jim Pillen','Lincoln','Deb Fischer','Pete Ricketts'),
('NV','Nevada','Nevada','Joe Lombardo','Carson City','Catherine Cortez Masto','Jacky Rosen'),
('NH','New Hampshire','New Hampshire','Kelly Ayotte','Concord','Jeanne Shaheen','Maggie Hassan'),
('NJ','New Jersey','New Jersey','Phil Murphy','Trenton','Cory Booker','Andy Kim'),
('NM','New Mexico','New Mexico','Michelle Lujan Grisham','Santa Fe','Martin Heinrich','Ben Ray Luján'),
('NY','New York','New York','Kathy Hochul','Albany','Chuck Schumer','Kirsten Gillibrand'),
('NC','North Carolina','North Carolina','Josh Stein','Raleigh','Thom Tillis','Ted Budd'),
('ND','North Dakota','North Dakota','Kelly Armstrong','Bismarck','John Hoeven','Kevin Cramer'),
('OH','Ohio','Ohio','Mike DeWine','Columbus','Bernie Moreno','JD Vance'),
('OK','Oklahoma','Oklahoma','Kevin Stitt','Oklahoma City','James Lankford','Markwayne Mullin'),
('OR','Oregon','Oregon','Tina Kotek','Salem','Ron Wyden','Jeff Merkley'),
('PA','Pennsylvania','Pennsylvania','Josh Shapiro','Harrisburg','Dave McCormick','John Fetterman'),
('RI','Rhode Island','Rhode Island','Dan McKee','Providence','Jack Reed','Sheldon Whitehouse'),
('SC','South Carolina','South Carolina','Henry McMaster','Columbia','Lindsey Graham','Tim Scott'),
('SD','South Dakota','South Dakota','Larry Rhoden','Pierre','John Thune','Mike Rounds'),
('TN','Tennessee','Tennessee','Bill Lee','Nashville','Marsha Blackburn','Bill Hagerty'),
('TX','Texas','Texas','Greg Abbott','Austin','John Cornyn','Ted Cruz'),
('UT','Utah','Utah','Spencer Cox','Salt Lake City','Mike Lee','John Curtis'),
('VT','Vermont','Vermont','Phil Scott','Montpelier','Bernie Sanders','Peter Welch'),
('VA','Virginia','Virginia','Glenn Youngkin','Richmond','Mark Warner','Tim Kaine'),
('WA','Washington','Washington','Bob Ferguson','Olympia','Patty Murray','Maria Cantwell'),
('WV','West Virginia','West Virginia','Patrick Morrisey','Charleston','Shelley Moore Capito','Jim Justice'),
('WI','Wisconsin','Wisconsin','Tony Evers','Madison','Ron Johnson','Tammy Baldwin'),
('WY','Wyoming','Wyoming','Mark Gordon','Cheyenne','John Barrasso','Cynthia Lummis'),
-- 6 territories: governor recorded for Q61; no senators (Q23) or capital recordings (Q62) in v1.
('AS','American Samoa','Samoa thuộc Mỹ','Lemanu Peleti Mauga',NULL,NULL,NULL),
('DC','District of Columbia','Washington, D.C.','Muriel Bowser',NULL,NULL,NULL),
('GU','Guam','Guam','Lou Leon Guerrero',NULL,NULL,NULL),
('MP','Northern Mariana Islands','Quần đảo Bắc Mariana','Arnold Palacios',NULL,NULL,NULL),
('PR','Puerto Rico','Puerto Rico','Jenniffer González-Colón',NULL,NULL,NULL),
('VI','Virgin Islands','Quần đảo Virgin Mỹ','Albert Bryan',NULL,NULL,NULL)
ON CONFLICT (state_code) DO UPDATE SET
  governor_name = EXCLUDED.governor_name,
  capital_city = EXCLUDED.capital_city,
  senator_1 = EXCLUDED.senator_1,
  senator_2 = EXCLUDED.senator_2;

-- Q23 senators: 2 rows per state, skip territories.
INSERT INTO public.n400_location_answers (question_id, state_code, answer_en, answer_vi)
SELECT 23, state_code, senator_1, senator_1 FROM public.n400_state_data WHERE senator_1 IS NOT NULL
ON CONFLICT (question_id, state_code, answer_en) DO UPDATE SET answer_vi = EXCLUDED.answer_vi;

INSERT INTO public.n400_location_answers (question_id, state_code, answer_en, answer_vi)
SELECT 23, state_code, senator_2, senator_2 FROM public.n400_state_data WHERE senator_2 IS NOT NULL
ON CONFLICT (question_id, state_code, answer_en) DO UPDATE SET answer_vi = EXCLUDED.answer_vi;

-- Q61 governor: all 56 jurisdictions.
INSERT INTO public.n400_location_answers (question_id, state_code, answer_en, answer_vi)
SELECT 61, state_code, governor_name, governor_name FROM public.n400_state_data
ON CONFLICT (question_id, state_code, answer_en) DO UPDATE SET answer_vi = EXCLUDED.answer_vi;

-- Q62 capital: 50 states only.
INSERT INTO public.n400_location_answers (question_id, state_code, answer_en, answer_vi)
SELECT 62, state_code, capital_city, capital_city FROM public.n400_state_data WHERE capital_city IS NOT NULL
ON CONFLICT (question_id, state_code, answer_en) DO UPDATE SET answer_vi = EXCLUDED.answer_vi;
