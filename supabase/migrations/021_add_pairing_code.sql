-- ============================================================
-- Code d'appairage court pour Checkmate (persons.pairing_code)
-- ============================================================
-- Remplace la copie manuelle de l'UUID d'un enfant par un code court,
-- permanent et régénérable, affiché en face de chaque enfant dans
-- Réglages > Enfants. Le code ne sert qu'à l'appairage : Checkmate le
-- résout une fois via /api/presence/resolve, mémorise l'UUID renvoyé, puis
-- interroge le flux avec cet UUID comme avant. Régénérer un code ne casse
-- donc aucun appairage existant.
--
-- Alphabet à 24 lettres majuscules, sans I ni O (un code se dicte au
-- téléphone, I/1 et O/0 se confondent). Longueur 5 : 24^5 ≈ 8M
-- combinaisons, largement suffisant pour le nombre d'enfants de cette app.
--
-- Rejouable et sans échec sur une base vide (branche de preview, CI) : la
-- colonne et l'index se créent inconditionnellement (ne dépendent d'aucune
-- donnée), et la passe de rattrapage sur les enfants existants ne fait
-- simplement rien s'il n'y en a aucun.

BEGIN;

ALTER TABLE persons ADD COLUMN IF NOT EXISTS pairing_code TEXT;

-- Index unique partiel : seules les lignes avec un code posé sont
-- contraintes, ce qui laisse `pairing_code` nul pour les adultes.
CREATE UNIQUE INDEX IF NOT EXISTS persons_pairing_code_unique
  ON persons (pairing_code)
  WHERE pairing_code IS NOT NULL;

-- Tire un code au hasard et réessaie en cas de collision. Boucle bornée :
-- une erreur explicite vaut mieux qu'une boucle infinie si l'espace de
-- codes venait un jour à se remplir.
CREATE OR REPLACE FUNCTION generate_pairing_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  alphabet     TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  alphabet_len INT := length(alphabet);
  code_length  INT := 5;
  max_attempts INT := 20;
  candidate    TEXT;
  attempt      INT := 0;
BEGIN
  LOOP
    attempt := attempt + 1;
    candidate := '';
    FOR i IN 1..code_length LOOP
      candidate := candidate || substr(alphabet, (floor(random() * alphabet_len) + 1)::int, 1);
    END LOOP;

    EXIT WHEN NOT EXISTS (SELECT 1 FROM persons WHERE pairing_code = candidate);

    IF attempt >= max_attempts THEN
      RAISE EXCEPTION 'generate_pairing_code: aucun code unique trouvé après % tentatives', max_attempts;
    END IF;
  END LOOP;

  RETURN candidate;
END;
$$;

-- Attribue un code aux enfants qui n'en ont pas encore un. Ne touche
-- jamais un code déjà posé (condition `pairing_code IS NULL`), donc ne
-- casse jamais un appairage existant.
CREATE OR REPLACE FUNCTION set_pairing_code()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.is_child AND NEW.pairing_code IS NULL THEN
    NEW.pairing_code := generate_pairing_code();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS persons_set_pairing_code ON persons;
CREATE TRIGGER persons_set_pairing_code
  BEFORE INSERT OR UPDATE ON persons
  FOR EACH ROW
  EXECUTE FUNCTION set_pairing_code();

-- Rattrapage pour les enfants déjà existants. Sans effet sur une base
-- vide ou sans enfant.
UPDATE persons
SET pairing_code = generate_pairing_code()
WHERE is_child AND pairing_code IS NULL;

COMMIT;
