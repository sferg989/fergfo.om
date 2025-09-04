import type { APIRoute } from 'astro';
import { OptionsService } from '../../services/optionsService';
import type { StockOptionsData } from '../../types/option';

export const GET: APIRoute = async ({ request, locals }) => {
  const url = new URL(request.url);
  const symbol = url.searchParams.get('symbol');
  
  if (!symbol) {
    return new Response(
      JSON.stringify({ error: 'Symbol parameter is required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
  
  try {
    // Get D1 database from runtime
    const db = (locals.runtime?.env?.DB as D1Database) || null;
    const optionsService = OptionsService.getInstance(db);
    
    const { options, currentPrice, fetchedAt, error } = await optionsService.fetchOptionsData(symbol);
    
    const responseData: StockOptionsData = {
      symbol,
      options,
      currentPrice,
      fetchedAt,
      error
    };
    
    return new Response(
      JSON.stringify(responseData),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error(`Error fetching data for ${symbol}:`, err);
    return new Response(
      JSON.stringify({ 
        error: err instanceof Error ? err.message : 'Unknown error occurred'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}; 