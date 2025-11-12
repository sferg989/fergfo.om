import type { APIRoute } from 'astro';
import { OptionsService } from '../../services/optionsService';

export const GET: APIRoute = async ({ request, locals }) => {
  try {
    const url = new URL(request.url);
    const symbol = url.searchParams.get('symbol');

    if (!symbol) {
      return new Response(JSON.stringify({ error: 'Symbol parameter is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const db = (locals.runtime?.env?.DB as D1Database) || null;

    if (!db) {
      return new Response(JSON.stringify({ error: 'Database not available' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const optionsService = OptionsService.getInstance(db);
    const result = await optionsService.refreshCurrentPrice(symbol.toUpperCase());

    if (result.error) {
      return new Response(JSON.stringify({
        error: result.error,
        currentPrice: result.currentPrice,
        fetchedAt: result.fetchedAt
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      symbol: symbol.toUpperCase(),
      currentPrice: result.currentPrice,
      fetchedAt: result.fetchedAt
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in refresh-price API:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
