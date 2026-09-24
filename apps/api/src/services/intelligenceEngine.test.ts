import { describe, it } from 'node:test';
import assert from 'node:assert';
import { FinancialSentimentEngine } from './sentimentEngine.js';
import { AssetMapper } from './assetMapper.js';

describe('Predictive Intelligence Engine Verification', () => {
  describe('FinancialSentimentEngine', () => {
    it('accurately scores extremely bullish macroeconomic surprises', () => {
      const text = 'RECORD GDP GROWTH SURGE BEATS ALL WALL STREET FORECASTS ON HISTORIC EXPANSION';
      const result = FinancialSentimentEngine.analyze(text);
      assert.ok(result.score >= 50, `Expected high bullish score, got ${result.score}`);
      assert.strictEqual(result.polarity, 'EXTREMELY_BULLISH');
      assert.ok(result.highlightedKeywords.includes('record'));
      assert.ok(result.highlightedKeywords.includes('surge'));
    });

    it('accurately scores extremely bearish crisis and collapse headlines', () => {
      const text = 'MASSIVE BANKRUPTCY TURMOIL CREATES HISTORIC RECESSION AND DEFAULT PANIC';
      const result = FinancialSentimentEngine.analyze(text);
      assert.ok(result.score <= -70, `Expected extreme bearish score, got ${result.score}`);
      assert.strictEqual(result.polarity, 'EXTREMELY_BEARISH');
    });

    it('handles negation correctly', () => {
      const positive = FinancialSentimentEngine.analyze('company reports profit');
      const negated = FinancialSentimentEngine.analyze('company reports no profit');
      assert.ok(positive.score > 0);
      assert.ok(negated.score < 0);
    });

    it('always clamps scores to strictly [-100, 100]', () => {
      const runawayBullish = FinancialSentimentEngine.analyze('surge surge soar rally boom beat beat record profit stimulus expansion');
      assert.ok(runawayBullish.score <= 100);
      assert.ok(runawayBullish.score >= -100);
    });
  });

  describe('AssetMapper', () => {
    it('maps OPEC and Crude Oil headlines to USOIL', () => {
      const result = AssetMapper.map('OPEC delegates agree to surprise crude production reduction');
      assert.strictEqual(result.tradingViewSymbol, 'TVC:USOIL');
      assert.strictEqual(result.assetClass, 'COMMODITY');
    });

    it('maps Gold bullion headlines to XAUUSD', () => {
      const result = AssetMapper.map('Central banks buy record gold bullion amidst inflation hedge');
      assert.strictEqual(result.tradingViewSymbol, 'OANDA:XAUUSD');
      assert.strictEqual(result.assetClass, 'COMMODITY');
    });

    it('maps Fed / Powell / NFP to USD / DXY', () => {
      const result = AssetMapper.map('Fed Chair Powell signals interest rate adjustments at next FOMC');
      assert.strictEqual(result.tradingViewSymbol, 'CAPITALCOM:DXY');
      assert.strictEqual(result.assetClass, 'FOREX');
    });

    it('maps Bitcoin and crypto keywords to BTCUSDT', () => {
      const result = AssetMapper.map('Institutional inflows surge into Bitcoin spot ETF');
      assert.strictEqual(result.tradingViewSymbol, 'BINANCE:BTCUSDT');
      assert.strictEqual(result.assetClass, 'CRYPTO');
    });

    it('maps individual equities e.g. Tesla and Nvidia', () => {
      const tsla = AssetMapper.map('Tesla robotaxi timeline accelerated by Elon Musk');
      assert.strictEqual(tsla.tradingViewSymbol, 'NASDAQ:TSLA');
      
      const nvda = AssetMapper.map('Nvidia unveils next-gen Blackwell AI chip architecture');
      assert.strictEqual(nvda.tradingViewSymbol, 'NASDAQ:NVDA');
    });
  });
});
