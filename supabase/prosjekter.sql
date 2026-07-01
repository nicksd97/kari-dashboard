-- ============================================================
-- Prosjekter: tabell, RLS og seed-data
-- Kjør dette i Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS prosjekter (
  id          UUID       PRIMARY KEY DEFAULT gen_random_uuid(),
  nr          TEXT       NOT NULL,
  kunde       TEXT       NOT NULL DEFAULT '',
  adresse     TEXT       DEFAULT '',
  ansvarlig   TEXT       DEFAULT '',
  sum         NUMERIC,
  start_dato  DATE,
  slutt_dato  DATE,
  status      TEXT       NOT NULL DEFAULT 'Planlagt',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Automatisk updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER prosjekter_updated_at
  BEFORE UPDATE ON prosjekter
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS: kun innloggede brukere
ALTER TABLE prosjekter ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autentiserte brukere kan lese"
  ON prosjekter FOR SELECT TO authenticated USING (true);

CREATE POLICY "Autentiserte brukere kan legge til"
  ON prosjekter FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Autentiserte brukere kan oppdatere"
  ON prosjekter FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Autentiserte brukere kan slette"
  ON prosjekter FOR DELETE TO authenticated USING (true);

-- ============================================================
-- Seed: 21 prosjekter
-- ============================================================
INSERT INTO prosjekter (nr, kunde, adresse) VALUES
  ('825', 'Eirik Ramlo',                  'Anders Hovdens veg 5 C'),
  ('827', 'Margareth Selsås',             'Øvre Skoglykkja 28'),
  ('828', 'Emil Løvseth',                 'Arnenvegen 7'),
  ('829', 'Don Ransi',                    'Røddebakken 71'),
  ('831', 'Esten Gagnås',                 'Vigdalsvegen 522, Buvika'),
  ('837', 'Pia Rande',                    'Vestre Rosten 1F, Heimdal'),
  ('838', 'Ellen Synnøve Skilbred',       'Martin Stokkens vei 110'),
  ('839', 'Herman Olafsen',               'Dorodal vegen 437, Fannrem'),
  ('840', 'Nicoline',                     'Lavamoen 38, Verdal'),
  ('841', 'Merethe Dybvik Løfald',        'Ospnesveien 21, Bjugn'),
  ('842', 'Kako Eken',                    'Orkdalsveien 54B, Orkanger'),
  ('843', 'Jo Sverre Helgemo',            'Grinnisvegen 226, Lundamo'),
  ('844', 'Dan Moran',                    'Teglbrennervegen 7b'),
  ('845', 'Lena-Birgitta Borch Lia',      'Inge Krokannsveg 2B, Trondheim'),
  ('846', 'Krister Trondsen',             'Smiloftstykket 2, Trondheim'),
  ('847', 'Ingeborg Kjerstad',            'Lundadalsvegen 81, Lundamo'),
  ('848', 'Bernt Myhre',                  'Øvre Bergssvingen 12'),
  ('849', 'Rune Folgerø',                 'Skåveien 11, Støren'),
  ('850', 'Hans Are Solem',               'Hammerstranda 40, Buvika'),
  ('851', 'Elisabeth Utnes',              'Reidar Raanes veg 15, Ranheim'),
  ('852', 'Helge Wilhelm Schroeder',      'Lykkjvegen 28, Ler')
ON CONFLICT DO NOTHING;
