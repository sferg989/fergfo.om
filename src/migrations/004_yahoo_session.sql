-- Yahoo Finance cookie jar shared across worker isolates.
-- Yahoo rate-limits the cookie/crumb handshake per IP; Cloudflare's shared egress
-- hits that limit when every invocation starts a fresh session. One persisted jar
-- means the handshake happens once per cookie lifetime instead of once per tick.
CREATE TABLE IF NOT EXISTS yahoo_session (
    id TEXT PRIMARY KEY,
    cookie_jar TEXT NOT NULL, -- tough-cookie serialized jar (JSON), includes the crumb
    updated_at TEXT NOT NULL
);
