import type { APIRoute } from 'astro';
import { OptionsService } from '../../services/optionsService';

export const GET: APIRoute = async ({ request, locals }) => {
  const url = new URL(request.url);
  const symbol = url.searchParams.get('symbol');
  const days = parseInt(url.searchParams.get('days') || '30', 10);
  
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
    const performanceData = await optionsService.getStockPerformanceData(symbol, days);
    
    return new Response(
      JSON.stringify(performanceData),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error(`Error fetching performance data for ${symbol}:`, err);
    return new Response(
      JSON.stringify({ 
        error: err instanceof Error ? err.message : 'Unknown error occurred'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
