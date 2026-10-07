// Fetch a Yahoo cookie/crumb from this machine and write SQL that seeds the
// worker's shared session. Yahoo rate-limits the handshake from Cloudflare's
// egress IPs, so the first session has to come from somewhere else.
//
//   node scripts/seed-yahoo-session.mjs
//   npx wrangler d1 execute options-tracker --remote --file scripts/yahoo-session.sql
import { writeFileSync } from 'node:fs';
import YahooFinance from 'yahoo-finance2';
import { ExtendedCookieJar } from 'yahoo-finance2/lib/cookieJar';

const cookieJar = new ExtendedCookieJar();
const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'], cookieJar });
await yahooFinance.options('AAPL');

const serialized = JSON.stringify(await cookieJar.serialize()).replace(/'/g, "''");
const sql = `INSERT INTO yahoo_session (id, cookie_jar, updated_at) VALUES ('main', '${serialized}', '${new Date().toISOString()}')
ON CONFLICT(id) DO UPDATE SET cookie_jar = excluded.cookie_jar, updated_at = excluded.updated_at;\n`;
writeFileSync(new URL('./yahoo-session.sql', import.meta.url), sql);
console.log('Wrote scripts/yahoo-session.sql. Apply with:');
console.log('  npx wrangler d1 execute options-tracker --remote --file scripts/yahoo-session.sql');
