-- ============================================================
-- Prosjekter: utvid eksisterende projects-tabell og seed manglende
-- Kjør dette i Supabase SQL Editor
-- ============================================================

-- 1. Legg til address-kolonne hvis den ikke finnes
ALTER TABLE projects ADD COLUMN IF NOT EXISTS address TEXT DEFAULT '';

-- 2. Legg til de 21 prosjektene — kun de som IKKE allerede finnes
--    (ON CONFLICT gjør ingenting hvis project_number + company_id allerede er i tabellen)

INSERT INTO projects (project_number, name, customer_name, address, status, company_id)
VALUES
  ('825', 'Eirik Ramlo',                  'Eirik Ramlo',                  'Anders Hovdens veg 5 C',           'innkommende',  'a12dfbf0-a9d6-4786-95fe-6f1678d9d980'),
  ('827', 'Margareth Selsås',             'Margareth Selsås',             'Øvre Skoglykkja 28',               'innkommende',  'a12dfbf0-a9d6-4786-95fe-6f1678d9d980'),
  ('828', 'Emil Løvseth',                 'Emil Løvseth',                 'Arnenvegen 7',                     'innkommende',  'a12dfbf0-a9d6-4786-95fe-6f1678d9d980'),
  ('829', 'Don Ransi',                    'Don Ransi',                    'Røddebakken 71',                   'innkommende',  'a12dfbf0-a9d6-4786-95fe-6f1678d9d980'),
  ('831', 'Esten Gagnås',                 'Esten Gagnås',                 'Vigdalsvegen 522, Buvika',          'innkommende',  'a12dfbf0-a9d6-4786-95fe-6f1678d9d980'),
  ('837', 'Pia Rande',                    'Pia Rande',                    'Vestre Rosten 1F, Heimdal',         'innkommende',  'a12dfbf0-a9d6-4786-95fe-6f1678d9d980'),
  ('838', 'Ellen Synnøve Skilbred',       'Ellen Synnøve Skilbred',       'Martin Stokkens vei 110',          'innkommende',  'a12dfbf0-a9d6-4786-95fe-6f1678d9d980'),
  ('839', 'Herman Olafsen',               'Herman Olafsen',               'Dorodal vegen 437, Fannrem',        'innkommende',  'a12dfbf0-a9d6-4786-95fe-6f1678d9d980'),
  ('840', 'Nicoline',                     'Nicoline',                     'Lavamoen 38, Verdal',              'innkommende',  'a12dfbf0-a9d6-4786-95fe-6f1678d9d980'),
  ('841', 'Merethe Dybvik Løfald',        'Merethe Dybvik Løfald',        'Ospnesveien 21, Bjugn',            'innkommende',  'a12dfbf0-a9d6-4786-95fe-6f1678d9d980'),
  ('842', 'Kako Eken',                    'Kako Eken',                    'Orkdalsveien 54B, Orkanger',        'innkommende',  'a12dfbf0-a9d6-4786-95fe-6f1678d9d980'),
  ('843', 'Jo Sverre Helgemo',            'Jo Sverre Helgemo',            'Grinnisvegen 226, Lundamo',         'innkommende',  'a12dfbf0-a9d6-4786-95fe-6f1678d9d980'),
  ('844', 'Dan Moran',                    'Dan Moran',                    'Teglbrennervegen 7b',              'innkommende',  'a12dfbf0-a9d6-4786-95fe-6f1678d9d980'),
  ('845', 'Lena-Birgitta Borch Lia',      'Lena-Birgitta Borch Lia',      'Inge Krokannsveg 2B, Trondheim',   'innkommende',  'a12dfbf0-a9d6-4786-95fe-6f1678d9d980'),
  ('846', 'Krister Trondsen',             'Krister Trondsen',             'Smiloftstykket 2, Trondheim',       'innkommende',  'a12dfbf0-a9d6-4786-95fe-6f1678d9d980'),
  ('847', 'Ingeborg Kjerstad',            'Ingeborg Kjerstad',            'Lundadalsvegen 81, Lundamo',        'innkommende',  'a12dfbf0-a9d6-4786-95fe-6f1678d9d980'),
  ('848', 'Bernt Myhre',                  'Bernt Myhre',                  'Øvre Bergssvingen 12',             'innkommende',  'a12dfbf0-a9d6-4786-95fe-6f1678d9d980'),
  ('849', 'Rune Folgerø',                 'Rune Folgerø',                 'Skåveien 11, Støren',              'innkommende',  'a12dfbf0-a9d6-4786-95fe-6f1678d9d980'),
  ('850', 'Hans Are Solem',               'Hans Are Solem',               'Hammerstranda 40, Buvika',          'innkommende',  'a12dfbf0-a9d6-4786-95fe-6f1678d9d980'),
  ('851', 'Elisabeth Utnes',              'Elisabeth Utnes',              'Reidar Raanes veg 15, Ranheim',     'innkommende',  'a12dfbf0-a9d6-4786-95fe-6f1678d9d980'),
  ('852', 'Helge Wilhelm Schroeder',      'Helge Wilhelm Schroeder',      'Lykkjvegen 28, Ler',               'innkommende',  'a12dfbf0-a9d6-4786-95fe-6f1678d9d980')
ON CONFLICT (project_number, company_id) DO NOTHING;

-- 3. Etter kjøring: sjekk hva som faktisk ble lagt til
SELECT project_number, name, customer_name, address, status
FROM projects
WHERE company_id = 'a12dfbf0-a9d6-4786-95fe-6f1678d9d980'
ORDER BY project_number::int;
