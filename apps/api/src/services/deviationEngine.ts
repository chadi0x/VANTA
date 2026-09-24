export type DeviationType = 'BEAT' | 'MISS' | 'NEUTRAL' | 'PENDING';

export interface DeviationAnalysis {
  actualNumeric: number | null;
  forecastNumeric: number | null;
  previousNumeric: number | null;
  delta: number | null;
  deviationScore: number;
  deviationType: DeviationType;
  isSignificantVolatility: boolean;
  summary: string;
}

export class DeviationEngine {
  /**
   * Parse financial metric string into a standard float number.
   * Handles:
   * - Percentages: "3.2%", "-0.5%" -> 3.2, -0.5
   * - Quantities: "150K", "2.5M", "1.2B" -> 150000, 2500000, 1200000000
   * - Currencies: "$14.50", "¥155.2" -> 14.50, 155.2
   * - Signs and whitespace: " +52.1 ", " - 12K "
   */
  public static parseMetric(val: string | number | null | undefined): number | null {
    if (val === null || val === undefined) return null;
    if (typeof val === 'number') return isNaN(val) ? null : val;

    const cleaned = val.trim().toUpperCase().replace(/[$,€£¥]/g, '');
    if (!cleaned || cleaned === '-' || cleaned === 'N/A' || cleaned === 'NULL') {
      return null;
    }

    let multiplier = 1;
    let numericStr = cleaned;

    if (cleaned.endsWith('%')) {
      numericStr = cleaned.slice(0, -1);
      // We keep percent units as absolute percentage points (e.g., 3.2)
    } else if (cleaned.endsWith('K')) {
      multiplier = 1e3;
      numericStr = cleaned.slice(0, -1);
    } else if (cleaned.endsWith('M')) {
      multiplier = 1e6;
      numericStr = cleaned.slice(0, -1);
    } else if (cleaned.endsWith('B')) {
      multiplier = 1e9;
      numericStr = cleaned.slice(0, -1);
    } else if (cleaned.endsWith('T')) {
      multiplier = 1e12;
      numericStr = cleaned.slice(0, -1);
    }

    const parsed = parseFloat(numericStr.replace(/\s+/g, ''));
    if (isNaN(parsed)) return null;

    return parsed * multiplier;
  }

  /**
   * Computes deviation, volatility score, and market classification
   */
  public static analyze(
    actual: string | number | null | undefined,
    forecast: string | number | null | undefined,
    previous?: string | number | null | undefined,
    thresholdPercentage: number = 0.05
  ): DeviationAnalysis {
    const actNum = this.parseMetric(actual);
    const fcastNum = this.parseMetric(forecast);
    const prevNum = this.parseMetric(previous);

    // If actual metric is not yet released, state is PENDING
    if (actNum === null || fcastNum === null) {
      return {
        actualNumeric: actNum,
        forecastNumeric: fcastNum,
        previousNumeric: prevNum,
        delta: null,
        deviationScore: 0.0,
        deviationType: 'PENDING',
        isSignificantVolatility: false,
        summary: 'Awaiting official release data.'
      };
    }

    const delta = actNum - fcastNum;
    const base = Math.abs(fcastNum);
    
    // Relative deviation score
    let deviationScore = 0.0;
    if (base > 0.00001) {
      deviationScore = delta / base;
    } else {
      // In case forecast was 0.0, score equals delta directly
      deviationScore = delta;
    }

    let deviationType: DeviationType = 'NEUTRAL';
    const epsilon = 0.0001;

    if (delta > epsilon) {
      deviationType = 'BEAT';
    } else if (delta < -epsilon) {
      deviationType = 'MISS';
    } else {
      deviationType = 'NEUTRAL';
    }

    // Volatility trigger: deviation exceeds threshold or is a major directional surprise
    const isSignificantVolatility = Math.abs(deviationScore) >= thresholdPercentage;

    const roundedScore = Math.round(deviationScore * 10000) / 100;
    const summary = `${deviationType}: Delta ${delta > 0 ? '+' : ''}${delta.toFixed(2)} (${roundedScore > 0 ? '+' : ''}${roundedScore}%)`;

    return {
      actualNumeric: actNum,
      forecastNumeric: fcastNum,
      previousNumeric: prevNum,
      delta,
      deviationScore: Math.round(deviationScore * 1000) / 1000,
      deviationType,
      isSignificantVolatility,
      summary
    };
  }
}
