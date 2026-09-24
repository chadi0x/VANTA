export type MarketSession =
  | 'London/NY Overlap'
  | 'New York'
  | 'London'
  | 'Tokyo/Asia'
  | 'Sydney/Pacific';

export interface TemporalData {
  timestamp_utc: string;
  date_formatted: string;
  time_formatted: string;
  market_session: MarketSession;
  time_ago: string;
}

export class TemporalEngine {
  /**
   * Evaluates active global market session from UTC date
   * Global Market Hours (UTC):
   * - Tokyo / Asia: 00:00 - 08:00 UTC
   * - London: 08:00 - 16:30 UTC
   * - New York: 13:30 - 21:00 UTC
   * - London / NY Overlap: 13:00 - 16:00 UTC (Peak institutional volume)
   * - Sydney / Pacific: 21:00 - 00:00 UTC
   */
  public static getMarketSession(date: Date = new Date()): MarketSession {
    const hours = date.getUTCHours();
    const minutes = date.getUTCMinutes();
    const decTime = hours + minutes / 60;

    // Peak institutional liquidity overlap
    if (decTime >= 13.0 && decTime < 16.0) {
      return 'London/NY Overlap';
    }

    // New York Session
    if (decTime >= 16.0 && decTime < 21.0) {
      return 'New York';
    }

    // London Morning Session
    if (decTime >= 8.0 && decTime < 13.0) {
      return 'London';
    }

    // Tokyo / Asian Session
    if (decTime >= 0.0 && decTime < 8.0) {
      return 'Tokyo/Asia';
    }

    // Sydney / Pacific Late Session
    return 'Sydney/Pacific';
  }

  /**
   * Generates formatted human-readable relative latency ("2s ago", "4m ago", "1h ago")
   */
  public static getTimeAgo(timestamp: string | Date): string {
    const past = new Date(timestamp).getTime();
    const now = Date.now();
    const diffSec = Math.max(0, Math.floor((now - past) / 1000));

    if (diffSec < 5) return 'just now';
    if (diffSec < 60) return `${diffSec}s ago`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour}h ago`;
    const diffDays = Math.floor(diffHour / 24);
    return `${diffDays}d ago`;
  }

  /**
   * Formats date to: "Wednesday, 23 Sep 2026"
   */
  public static getFormattedDate(date: Date = new Date()): string {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const dayName = days[date.getUTCDay()];
    const day = date.getUTCDate();
    const monthName = months[date.getUTCMonth()];
    const year = date.getUTCFullYear();

    return `${dayName}, ${day} ${monthName} ${year}`;
  }

  /**
   * Formats time to 24h exact string: "17:15:00 UTC"
   */
  public static getFormattedTime(date: Date = new Date()): string {
    const h = date.getUTCHours().toString().padStart(2, '0');
    const m = date.getUTCMinutes().toString().padStart(2, '0');
    const s = date.getUTCSeconds().toString().padStart(2, '0');
    return `${h}:${m}:${s} UTC`;
  }

  /**
   * Standardizes any raw or ISO timestamp into the strict temporal schema
   */
  public static normalize(rawTimestamp?: string | number | Date): TemporalData {
    const date = rawTimestamp ? new Date(rawTimestamp) : new Date();
    const validDate = isNaN(date.getTime()) ? new Date() : date;

    return {
      timestamp_utc: validDate.toISOString(),
      date_formatted: this.getFormattedDate(validDate),
      time_formatted: this.getFormattedTime(validDate),
      market_session: this.getMarketSession(validDate),
      time_ago: this.getTimeAgo(validDate)
    };
  }
}
