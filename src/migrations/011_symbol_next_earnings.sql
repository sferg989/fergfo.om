-- Next earnings report time from Yahoo calendarEvents, refreshed by the background worker.
-- The scorer gives no expected-return credit to a put whose life spans it.
ALTER TABLE symbol_tracking ADD COLUMN next_earnings_at TEXT;
