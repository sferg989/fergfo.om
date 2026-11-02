// Derived from a probe of OptionScorer on Black-Scholes fair-priced puts (spot 100, liquidity ~7):
// a 35-day 20-delta put whose IV sits 10 vol points over realized lands at 72-77 across IV 0.2-1.0,
// the same put with no IV-over-realized gap lands near 25, and a 7-day or 90-day put at the same
// gap lands at 51-69. STANDARD keeps the first group, MINIMUM drops the no-edge group.
export enum ScoreThresholds {
  PREFERRED = 75,  // High score threshold for preferred stocks
  STANDARD = 65,   // Standard high score threshold
  MINIMUM = 50     // Minimum score to consider
}
