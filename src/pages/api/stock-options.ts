import type { APIRoute } from 'astro';
import { OptionsService } from '../../services/optionsService';
import type { StockOptionsData } from '../../types/option';

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const symbol = url.searchParams.get('symbol');
  const forceRefresh = url.searchParams.get('forceRefresh') === 'true';
  
  if (!symbol) {
    return new Response(
      JSON.stringify({ error: 'Symbol parameter is required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
  
  try {
    const optionsService = OptionsService.getInstance();
    const { options, currentPrice, error } = await optionsService.fetchOptionsData(symbol, forceRefresh);
    const lastFetchTime = optionsService.getLastFetchTime(symbol, 'options');
    const cacheTimeRemaining = optionsService.getCacheTimeRemaining(symbol, 'options');
    
    const responseData: StockOptionsData = {
      symbol,
      options,
      currentPrice,
      error,
      lastFetchTime: lastFetchTime ? lastFetchTime.toISOString() : null,
      cacheTimeRemaining
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