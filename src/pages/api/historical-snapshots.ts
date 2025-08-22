import type { APIRoute } from 'astro';
import { OptionsService } from '../../services/optionsService';

export const GET: APIRoute = async ({ request, locals }) => {
  const url = new URL(request.url);
  const symbol = url.searchParams.get('symbol');
  const limit = parseInt(url.searchParams.get('limit') || '10', 10);
  
  if (!symbol) {
    return new Response(
      JSON.stringify({ error: 'Symbol parameter is required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
  
  try {
    // Get D1 database from runtime
    const db = (locals.runtime?.env?.DB as D1Database) || null;
    
    if (!db) {
      return new Response(
        JSON.stringify({ error: 'Database not available' }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    const optionsService = OptionsService.getInstance(db);
    const snapshots = await optionsService.getHistoricalSnapshots(symbol, limit);
    
    return new Response(
      JSON.stringify({ 
        symbol: symbol.toUpperCase(),
        snapshots,
        count: snapshots.length
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error(`Error fetching historical snapshots for ${symbol}:`, err);
    return new Response(
      JSON.stringify({ 
        error: err instanceof Error ? err.message : 'Unknown error occurred'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
