-- Add four preferred symbols chosen for deep, tight put chains near the scorer's 38 DTE peak.
-- Same seed pattern as 002; INSERT OR IGNORE keeps existing rows untouched.
INSERT OR IGNORE INTO symbol_tracking (id, symbol, is_preferred, priority) VALUES
    ('preferred_avgo', 'AVGO', 1, 10),
    ('preferred_pltr', 'PLTR', 1, 10),
    ('preferred_mrvl', 'MRVL', 1, 10),
    ('preferred_dell', 'DELL', 1, 10);

UPDATE refresh_state
SET total_symbols = (SELECT COUNT(*) FROM symbol_tracking WHERE is_active = 1)
WHERE id = 'main';
