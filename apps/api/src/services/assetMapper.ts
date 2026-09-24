export interface AssetMappingResult {
  primaryAsset: string;
  tradingViewSymbol: string;
  assetClass: 'COMMODITY' | 'FOREX' | 'CRYPTO' | 'INDEX' | 'EQUITY';
  relevanceConfidence: number;
}

interface MappingRule {
  keywords: string[];
  primaryAsset: string;
  tradingViewSymbol: string;
  assetClass: 'COMMODITY' | 'FOREX' | 'CRYPTO' | 'INDEX' | 'EQUITY';
}

const MAPPING_RULES: MappingRule[] = [
  // Crude Oil / Energy
  {
    keywords: ['opec', 'crude', 'wti', 'brent', 'oil', 'petroleum', 'spr', 'eia'],
    primaryAsset: 'Crude Oil',
    tradingViewSymbol: 'TVC:USOIL',
    assetClass: 'COMMODITY'
  },
  // Gold & Precious Metals
  {
    keywords: ['gold', 'xau', 'bullion', 'precious metal'],
    primaryAsset: 'Gold Spot',
    tradingViewSymbol: 'OANDA:XAUUSD',
    assetClass: 'COMMODITY'
  },
  {
    keywords: ['silver', 'xag'],
    primaryAsset: 'Silver Spot',
    tradingViewSymbol: 'OANDA:XAGUSD',
    assetClass: 'COMMODITY'
  },
  // Crypto
  {
    keywords: ['bitcoin', 'btc', 'satoshi', 'crypto', 'halving', 'spot btc'],
    primaryAsset: 'Bitcoin',
    tradingViewSymbol: 'BINANCE:BTCUSDT',
    assetClass: 'CRYPTO'
  },
  {
    keywords: ['ethereum', 'eth', 'ether', 'vitalik'],
    primaryAsset: 'Ethereum',
    tradingViewSymbol: 'BINANCE:ETHUSDT',
    assetClass: 'CRYPTO'
  },
  {
    keywords: ['solana', 'sol'],
    primaryAsset: 'Solana',
    tradingViewSymbol: 'BINANCE:SOLUSDT',
    assetClass: 'CRYPTO'
  },
  // Major Forex & Central Banks
  {
    keywords: ['fed', 'fomc', 'powell', 'treasury', 'nfp', 'payrolls', 'dxy', 'us dollar'],
    primaryAsset: 'USD Index',
    tradingViewSymbol: 'CAPITALCOM:DXY',
    assetClass: 'FOREX'
  },
  {
    keywords: ['ecb', 'lagarde', 'eurozone', 'bund', 'euro '],
    primaryAsset: 'EUR/USD',
    tradingViewSymbol: 'FX:EURUSD',
    assetClass: 'FOREX'
  },
  {
    keywords: ['boe', 'bailey', 'gilt', 'sterling', 'pound'],
    primaryAsset: 'GBP/USD',
    tradingViewSymbol: 'FX:GBPUSD',
    assetClass: 'FOREX'
  },
  {
    keywords: ['boj', 'ueda', 'yen', 'jgb', 'kishida'],
    primaryAsset: 'USD/JPY',
    tradingViewSymbol: 'FX:USDJPY',
    assetClass: 'FOREX'
  },
  // Indices
  {
    keywords: ['s&p', 'sp500', 'wall street', 'stocks', 'broad market'],
    primaryAsset: 'S&P 500 ETF',
    tradingViewSymbol: 'AMEX:SPY',
    assetClass: 'INDEX'
  },
  {
    keywords: ['nasdaq', 'tech stocks', 'qqq'],
    primaryAsset: 'Nasdaq 100',
    tradingViewSymbol: 'NASDAQ:QQQ',
    assetClass: 'INDEX'
  },
  // High-Volume Single Equities
  {
    keywords: ['tesla', 'tsla', 'musk'],
    primaryAsset: 'Tesla Inc',
    tradingViewSymbol: 'NASDAQ:TSLA',
    assetClass: 'EQUITY'
  },
  {
    keywords: ['nvidia', 'nvda', 'ai chip', 'semiconductor'],
    primaryAsset: 'NVIDIA Corp',
    tradingViewSymbol: 'NASDAQ:NVDA',
    assetClass: 'EQUITY'
  },
  {
    keywords: ['apple', 'aapl', 'iphone'],
    primaryAsset: 'Apple Inc',
    tradingViewSymbol: 'NASDAQ:AAPL',
    assetClass: 'EQUITY'
  }
];

export class AssetMapper {
  public static map(headline: string, fallbackAsset: string = 'GLOBAL'): AssetMappingResult {
    const text = headline.toLowerCase();

    for (const rule of MAPPING_RULES) {
      for (const kw of rule.keywords) {
        if (text.includes(kw)) {
          return {
            primaryAsset: rule.primaryAsset,
            tradingViewSymbol: rule.tradingViewSymbol,
            assetClass: rule.assetClass,
            relevanceConfidence: 0.95
          };
        }
      }
    }

    // Default based on asset currency tag if provided
    const upperFallback = (fallbackAsset || 'GLOBAL').toUpperCase();
    if (upperFallback === 'USD') {
      return {
        primaryAsset: 'USD',
        tradingViewSymbol: 'CAPITALCOM:DXY',
        assetClass: 'FOREX',
        relevanceConfidence: 0.7
      };
    }
    if (upperFallback === 'EUR') {
      return {
        primaryAsset: 'EUR/USD',
        tradingViewSymbol: 'FX:EURUSD',
        assetClass: 'FOREX',
        relevanceConfidence: 0.7
      };
    }
    if (upperFallback === 'GBP') {
      return {
        primaryAsset: 'GBP/USD',
        tradingViewSymbol: 'FX:GBPUSD',
        assetClass: 'FOREX',
        relevanceConfidence: 0.7
      };
    }
    if (upperFallback === 'JPY') {
      return {
        primaryAsset: 'USD/JPY',
        tradingViewSymbol: 'FX:USDJPY',
        assetClass: 'FOREX',
        relevanceConfidence: 0.7
      };
    }

    return {
      primaryAsset: upperFallback,
      tradingViewSymbol: 'AMEX:SPY',
      assetClass: 'INDEX',
      relevanceConfidence: 0.4
    };
  }
}
