import type { APIRoute } from 'astro';
import { BackgroundRefreshService } from '../../services/background_refresh_service';
import { isValidSymbol } from '../../utils/optionsUtils';

export const prerender = false;

const json = (body: unknown, status: number): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

/**
 * Development only: run the long-call refresh for one symbol now, outside the worker's
 * schedule, so /calls has real data locally. Not served in production, where it would let
 * anyone spend Yahoo requests and database writes.
 */
export const POST: APIRoute = async ({ request, locals }) => {
  if (!import.meta.env.DEV) return json({ error: 'Not found' }, 404);

  const symbol = new URL(request.url).searchParams.get('symbol');
  if (!symbol || !isValidSymbol(symbol)) return json({ error: 'A valid symbol parameter is required' }, 400);

  const db = (locals.runtime?.env?.DB as D1Database) || null;
  if (!db) return json({ error: 'Database not available' }, 503);

  return json(await BackgroundRefreshService.getInstance(db).refreshCallsFor(symbol.toUpperCase()), 200);
};
