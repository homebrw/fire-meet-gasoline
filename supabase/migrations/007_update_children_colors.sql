-- ============================================================
-- Update children colors to be lighter versions of parent colors
-- ============================================================

-- Function to lighten a color (increase RGB values by a percentage)
CREATE OR REPLACE FUNCTION lighten_color(hex_color TEXT, percent NUMERIC DEFAULT 30)
RETURNS TEXT AS $$
DECLARE
  r INTEGER;
  g INTEGER;
  b INTEGER;
  new_r INTEGER;
  new_g INTEGER;
  new_b INTEGER;
BEGIN
  -- Parse hex color (e.g., '#3b82f6' -> 3b, 82, f6)
  r := ('x' || SUBSTRING(hex_color, 2, 2))::bit(8)::INTEGER;
  g := ('x' || SUBSTRING(hex_color, 4, 2))::bit(8)::INTEGER;
  b := ('x' || SUBSTRING(hex_color, 6, 2))::bit(8)::INTEGER;

  -- Lighten by percentage: new_value = value + (255 - value) * (percent / 100)
  new_r := LEAST(255, CEIL(r + (255 - r) * (percent / 100.0)));
  new_g := LEAST(255, CEIL(g + (255 - g) * (percent / 100.0)));
  new_b := LEAST(255, CEIL(b + (255 - b) * (percent / 100.0)));

  -- Convert back to hex
  RETURN '#' ||
    LPAD(TO_HEX(new_r), 2, '0') ||
    LPAD(TO_HEX(new_g), 2, '0') ||
    LPAD(TO_HEX(new_b), 2, '0');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Update children colors based on parent colors
UPDATE persons p_child
SET color = lighten_color(p_parent.color, 30)
FROM persons p_parent
WHERE p_child.parent_id = p_parent.id
  AND p_child.is_child = true;
