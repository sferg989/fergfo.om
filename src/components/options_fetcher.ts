// Polyfill for global in browser environments
if (typeof window !== 'undefined' && typeof global === 'undefined') {
  (window as any).global = window;
}

import type { OptionData, OptionScore, ScoreClass, ScoredOption, StockOptionsData } from '../types/option';
import { OptionScorer } from '../utils/optionScorer';
import { RestService } from '@sferg989/astro-utils';

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString();
}

export function calculateAnnualPremium(bid: number, strike: number, daysToExpiry: number): string {
  const premiumPct = (bid / strike) * 100;
  return (premiumPct * 365 / daysToExpiry).toFixed(2);
}

export function renderTopOptions(
  options: OptionData[], 
  currentPrice: number, 
  contentElement: HTMLElement,
  symbol?: string
): void {
  // Score the options
  const scoredOptions: ScoredOption[] = options
    .map(option => ({
      ...option,
      score: OptionScorer.calculateScore(option, currentPrice)
    }))
    .sort((a, b) => b.score.total - a.score.total);
  
  // Get the highest score
  const highestScore = scoredOptions.length > 0 ? scoredOptions[0].score.total : 0;
  
  // Get all options with the highest score (including ties)
  const topOptions = scoredOptions.filter(option => 
    Math.abs(option.score.total - highestScore) < 0.01 // Using small epsilon for float comparison
  );
  
  // Render the options data
  if (topOptions.length > 0) {
    contentElement.innerHTML = `
      <div class="high-score-section mb-6">
        <h2 class="text-xl font-bold mb-3">🏆 Top Scoring Options (Score: ${Math.round(highestScore)})</h2>
        <div class="overflow-x-auto">
          <table class="options-table">
            <caption class="sr-only">Top scoring options for ${symbol || 'this stock'}</caption>
            <thead>
              <tr>
                <th scope="col">Score</th>
                <th scope="col">Expiry</th>
                <th scope="col">Strike</th>
                <th scope="col">Bid</th>
                <th scope="col">Ask</th>
                <th scope="col">Volume</th>
                <th scope="col">IV%</th>
                <th scope="col">Theta</th>
                <th scope="col">Simple%</th>
                <th scope="col">Ann. Prem%</th>
              </tr>
            </thead>
            <tbody>
              ${topOptions.map(option => {
                const dte = Math.ceil(
                  (new Date(option.expirationDate).getTime() - new Date().getTime()) / 
                  (1000 * 60 * 60 * 24)
                );
                const simplePremiumPct = (option.bid / currentPrice * 100).toFixed(2);
                const annualPremium = calculateAnnualPremium(option.bid, option.strike, dte);
                const scoreClass = OptionScorer.getScoreClass(option.score.total);
                
                return `
                  <tr>
                    <td class="${scoreClass}">${Math.round(option.score.total)}</td>
                    <td>${formatDate(option.expirationDate)}</td>
                    <td>$${option.strike.toFixed(2)}</td>
                    <td>$${option.bid.toFixed(2)}</td>
                    <td>$${option.ask.toFixed(2)}</td>
                    <td>${option.volume.toLocaleString()}</td>
                    <td>${(option.impliedVolatility * 100).toFixed(2)}%</td>
                    <td>${option.theta ? option.theta.toFixed(4) : 'N/A'}</td>
                    <td>${simplePremiumPct}%</td>
                    <td>${annualPremium}%</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  } else {
    contentElement.innerHTML = `
      <div class="p-4 bg-gray-50 rounded text-center">
        <p>No options found</p>
      </div>
    `;
  }
}

export async function fetchStocksSequentially(symbols: string[], forceRefresh: boolean): Promise<void> {
  // If not forcing refresh, fetch all stocks in parallel to leverage caching
  if (!forceRefresh) {
    await fetchStocksInParallel(symbols, forceRefresh);
    return;
  }

  // Only do sequential fetching with delays when forcing refresh to avoid rate limits
  for (let i = 0; i < symbols.length; i++) {
    const symbol = symbols[i];
    await fetchSingleStock(symbol, forceRefresh);
    
    // Add delay between requests only when forcing refresh to avoid rate limits
    if (i < symbols.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 2000)); // 2 seconds delay
    }
  }
}

async function fetchStocksInParallel(symbols: string[], forceRefresh: boolean): Promise<void> {
  // Fetch all stocks in parallel when using cache
  const fetchPromises = symbols.map(symbol => fetchSingleStock(symbol, forceRefresh));
  await Promise.allSettled(fetchPromises);
}

async function fetchSingleStock(symbol: string, forceRefresh: boolean): Promise<void> {
  const statusElement = document.getElementById(`status-${symbol}`);
  const contentElement = document.getElementById(`content-${symbol}`);
  
  if (!contentElement) return;
  
  if (statusElement) {
    statusElement.innerHTML = `<span class="text-yellow-500">Fetching data...</span>`;
  }
  
  try {
    // Ensure we're in a browser environment
    if (typeof window === 'undefined') {
      throw new Error('This function must run in a browser environment');
    }
    
    // Fetch data for this stock using RestService
    const restService = RestService.Instance();
    const response = await restService.Get<StockOptionsData>(`/api/stock-options?symbol=${symbol}&forceRefresh=${forceRefresh}`);
    
    if (!response.ok) {
      contentElement.innerHTML = `
        <div class="error-message p-4 bg-red-50 text-red-700 rounded">
          Failed to fetch data (HTTP ${response.status})
        </div>
      `;
      return;
    }
    
    const data = response.body;
    
    if (data?.error) {
      contentElement.innerHTML = `
        <div class="error-message p-4 bg-red-50 text-red-700 rounded">
          ${data.error}
        </div>
      `;
    } else if (data) {
      renderTopOptions(data.options, data.currentPrice, contentElement, symbol);
    }
    
    // Update status with cache information
    if (statusElement && data) {
      const now = new Date();
      let cacheInfo = '';
      if (data.lastFetchTime && !forceRefresh) {
        const lastFetch = new Date(data.lastFetchTime);
        cacheInfo = ` (cached from ${lastFetch.toLocaleTimeString()})`;
      }
      statusElement.innerHTML = `
        Last updated: ${now.toLocaleTimeString()}${cacheInfo}
      `;
    }
  } catch (err) {
    console.error(`Error fetching data for ${symbol}:`, err);
    contentElement.innerHTML = `
      <div class="error-message p-4 bg-red-50 text-red-700 rounded">
        Failed to fetch data: ${err instanceof Error ? err.message : 'Unknown error'}
      </div>
    `;
    
    if (statusElement) {
      statusElement.innerHTML = `<span class="text-red-500">Error fetching data</span>`;
    }
  }
} 