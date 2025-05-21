import type { OptionData, OptionScore, ScoreClass, ScoredOption, StockOptionsData } from '../types/option';
import { OptionScorer } from '../utils/optionScorer';

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
  for (let i = 0; i < symbols.length; i++) {
    const symbol = symbols[i];
    const statusElement = document.getElementById(`status-${symbol}`);
    const contentElement = document.getElementById(`content-${symbol}`);
    
    if (!contentElement) continue;
    
    if (statusElement) {
      statusElement.innerHTML = `<span class="text-yellow-500">Fetching data...</span>`;
    }
    
    try {
      // Fetch data for this stock
      const response = await fetch(`/api/stock-options?symbol=${symbol}&forceRefresh=${forceRefresh}`);
      const data: StockOptionsData = await response.json();
      
      if (data.error) {
        contentElement.innerHTML = `
          <div class="error-message p-4 bg-red-50 text-red-700 rounded">
            ${data.error}
          </div>
        `;
      } else {
        renderTopOptions(data.options, data.currentPrice, contentElement, symbol);
      }
      
      // Update status with timestamp
      if (statusElement) {
        const now = new Date();
        statusElement.innerHTML = `
          Last updated: ${now.toLocaleTimeString()}
        `;
      }
      
      // If not the last stock, delay before fetching the next one
      if (i < symbols.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 3000)); // 30 seconds delay
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
      
      // Still delay before the next one even if there was an error
      if (i < symbols.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 3000)); // 30 seconds delay
      }
    }
  }
} 