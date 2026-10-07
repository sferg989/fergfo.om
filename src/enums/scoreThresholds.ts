// Derived from the achievable range of OptionScorer: a textbook 35-day ~20-delta put lands
// in the high 70s, so STANDARD matches the "good" class and PREFERRED sits just under "excellent".
export enum ScoreThresholds {
  PREFERRED = 75,  // High score threshold for preferred stocks
  STANDARD = 65,   // Standard high score threshold
  MINIMUM = 50     // Minimum score to consider
}
