export type SentimentPolarity =
  | 'EXTREMELY_BULLISH'
  | 'BULLISH'
  | 'NEUTRAL'
  | 'BEARISH'
  | 'EXTREMELY_BEARISH';

export interface SentimentResult {
  score: number; // Range: -100 to +100
  polarity: SentimentPolarity;
  confidence: number;
  highlightedKeywords: string[];
}

// Financial Lexicon based on Loughran-McDonald & Wall Street terminologies
const BULLISH_KEYWORDS: Record<string, number> = {
  surge: 25,
  soar: 28,
  rally: 25,
  jump: 20,
  beat: 30,
  beats: 30,
  record: 22,
  gain: 18,
  gains: 18,
  accelerate: 20,
  accelerates: 20,
  boom: 25,
  exceed: 22,
  exceeds: 22,
  upgrade: 24,
  upgraded: 24,
  expansion: 20,
  easing: 18,
  outpace: 20,
  profit: 18,
  profitable: 20,
  strong: 18,
  solid: 16,
  upside: 20,
  optimistic: 18,
  bullish: 26,
  breakout: 22,
  inflows: 20,
  recovery: 20,
  stimulus: 22,
  dividend: 15,
  growth: 18,
  cooling: 15 // e.g. "inflation cooling"
};

const BEARISH_KEYWORDS: Record<string, number> = {
  plunge: 30,
  crash: 35,
  slump: 25,
  tumble: 26,
  collapse: 35,
  drop: 18,
  drops: 18,
  miss: 28,
  misses: 28,
  fall: 16,
  falls: 16,
  decline: 18,
  declines: 18,
  recession: 32,
  default: 35,
  defaults: 35,
  bankrupt: 38,
  bankruptcy: 38,
  deficit: 22,
  contraction: 24,
  layoff: 26,
  layoffs: 26,
  turmoil: 28,
  panic: 32,
  contagion: 30,
  bearish: 26,
  selloff: 28,
  dump: 25,
  outflows: 20,
  downgrade: 24,
  downgraded: 24,
  warning: 20,
  loss: 20,
  losses: 22,
  sanctions: 24,
  escalation: 25,
  slowdown: 22
};

const INTENSIFIERS: Record<string, number> = {
  massive: 1.5,
  massively: 1.5,
  historic: 1.6,
  unprecedented: 1.6,
  sharp: 1.3,
  sharply: 1.3,
  aggressive: 1.4,
  severely: 1.5,
  critical: 1.3,
  heavy: 1.2
};

const NEGATORS = new Set(['not', 'no', 'never', 'fails', 'failed', 'failing', 'without']);

export class FinancialSentimentEngine {
  /**
   * Scored between -100 (Extremely Bearish) to +100 (Extremely Bullish)
   */
  public static analyze(text: string): SentimentResult {
    if (!text || !text.trim()) {
      return {
        score: 0,
        polarity: 'NEUTRAL',
        confidence: 0,
        highlightedKeywords: []
      };
    }

    const clean = text.toLowerCase().replace(/[^a-z0-9\s-]/g, ' ');
    const tokens = clean.split(/\s+/).filter(Boolean);

    let rawScore = 0;
    const highlighted: string[] = [];
    let hits = 0;

    for (let i = 0; i < tokens.length; i++) {
      const word = tokens[i];
      let multiplier = 1.0;

      // Check if preceding word is an intensifier
      if (i > 0 && INTENSIFIERS[tokens[i - 1]]) {
        multiplier = INTENSIFIERS[tokens[i - 1]];
      }

      // Check if preceding word is a negator
      const isNegated = i > 0 && NEGATORS.has(tokens[i - 1]);
      const sign = isNegated ? -1 : 1;

      if (BULLISH_KEYWORDS[word]) {
        rawScore += BULLISH_KEYWORDS[word] * multiplier * sign;
        highlighted.push(word);
        hits++;
      } else if (BEARISH_KEYWORDS[word]) {
        rawScore -= BEARISH_KEYWORDS[word] * multiplier * sign;
        highlighted.push(word);
        hits++;
      }
    }

    // Clamp score strictly to [-100, +100]
    let normalizedScore = Math.max(-100, Math.min(100, Math.round(rawScore)));

    // Categorize Polarity
    let polarity: SentimentPolarity = 'NEUTRAL';
    if (normalizedScore >= 70) polarity = 'EXTREMELY_BULLISH';
    else if (normalizedScore >= 20) polarity = 'BULLISH';
    else if (normalizedScore <= -70) polarity = 'EXTREMELY_BEARISH';
    else if (normalizedScore <= -20) polarity = 'BEARISH';
    else polarity = 'NEUTRAL';

    const confidence = hits === 0 ? 0.2 : Math.min(1.0, 0.4 + hits * 0.15);

    return {
      score: normalizedScore,
      polarity,
      confidence: Math.round(confidence * 100) / 100,
      highlightedKeywords: Array.from(new Set(highlighted))
    };
  }
}
