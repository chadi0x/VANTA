import { describe, it } from 'node:test';
import assert from 'node:assert';
import { CotAnalyticsEngine, CotRawRecord } from './cotAnalyticsEngine.js';
import { TemporalEngine } from './temporalEngine.js';

describe('COT Analytics & Orderflow Engine Verification', () => {
  const mockCurrentGold: CotRawRecord = {
    reportDate: '2026-09-23',
    assetCode: '088691',
    assetName: 'GOLD',
    openInterest: 520000,
    nonCommercialLong: 290000,
    nonCommercialShort: 40000,
    nonCommercialSpreads: 32000,
    commercialLong: 65000,
    commercialShort: 315000
  };

  const mockPrevGold: CotRawRecord = {
    reportDate: '2026-09-16',
    assetCode: '088691',
    assetName: 'GOLD',
    openInterest: 505000,
    nonCommercialLong: 275000,
    nonCommercialShort: 43000,
    nonCommercialSpreads: 30000,
    commercialLong: 62000,
    commercialShort: 298000
  };

  const mock52wHistory: CotRawRecord[] = [
    { reportDate: '2025-10-01', assetCode: '088691', assetName: 'GOLD', openInterest: 430000, nonCommercialLong: 200000, nonCommercialShort: 70000, nonCommercialSpreads: 20000, commercialLong: 50000, commercialShort: 220000 },
    { reportDate: '2026-03-01', assetCode: '088691', assetName: 'GOLD', openInterest: 480000, nonCommercialLong: 260000, nonCommercialShort: 50000, nonCommercialSpreads: 25000, commercialLong: 55000, commercialShort: 270000 }
  ];

  it('correctly calculates Speculator Net Positioning and WoW Delta', () => {
    const analysis = CotAnalyticsEngine.analyze(mockCurrentGold, mockPrevGold, mock52wHistory);

    // Current Net = 290,000 - 40,000 = 250,000
    assert.strictEqual(analysis.speculatorNet, 250000);

    // Prev Net = 275,000 - 43,000 = 232,000
    // WoW Delta = 250,000 - 232,000 = +18,000
    assert.strictEqual(analysis.wowNetDelta, 18000);
    assert.ok(analysis.wowPercentageChange > 0);
  });

  it('correctly determines 52-week percentile ranking', () => {
    const analysis = CotAnalyticsEngine.analyze(mockCurrentGold, mockPrevGold, mock52wHistory);
    // Min net is 130,000 (from 200,000 - 70,000), max is 250,000
    // Current is at maximum -> 100%
    assert.strictEqual(analysis.percentile52w, 100);
    assert.strictEqual(analysis.isExtremeAlert, true);
    assert.strictEqual(analysis.alertType, 'OVERCROWDED_LONG');
  });

  it('detects short squeeze risk when percentile <= 10%', () => {
    const compressedGold: CotRawRecord = {
      ...mockCurrentGold,
      nonCommercialLong: 150000,
      nonCommercialShort: 140000 // Net = +10,000 (far below 130,000 min)
    };
    const analysis = CotAnalyticsEngine.analyze(compressedGold, mockPrevGold, mock52wHistory);
    assert.ok(analysis.percentile52w <= 10);
    assert.strictEqual(analysis.isExtremeAlert, true);
    assert.strictEqual(analysis.alertType, 'OVERCROWDED_SHORT');
    assert.strictEqual(analysis.verdict, 'OVERCROWDED_SHORT_SQUEEZE_RISK');
  });

  it('generates institutional algorithmic verdict text', () => {
    const analysis = CotAnalyticsEngine.analyze(mockCurrentGold, mockPrevGold, mock52wHistory);
    assert.ok(analysis.opinionSummary.length > 20);
    assert.ok(analysis.opinionSummary.includes('XAU/USD'));
    // V3 new fields
    assert.strictEqual(analysis.dataSource, 'LIVE_CFTC');
    assert.ok(analysis.lastUpdatedUtc.length > 0);
    assert.strictEqual(typeof analysis.contrarianAlert, 'object'); // null or string
    assert.strictEqual(typeof analysis.oiVelocity14d, 'number');
  });

  it('activates Contrarian Sentinel when retail >75% long and MM short WoW', () => {
    const heavyShortWeek: CotRawRecord = {
      ...mockCurrentGold,
      nonCommercialLong: 265000,
      nonCommercialShort: 58000 // net = 207,000 — delta vs prev = -25,000 → STRONG_BEARISH (MM added shorts)
    };
    const retailLong: import('./cotAnalyticsEngine.js').RetailSentimentSnapshot = {
      asset: 'XAUUSD',
      longPercent: 80,
      shortPercent: 20,
      source: 'MYFXBOOK'
    };
    const analysis = CotAnalyticsEngine.analyze(heavyShortWeek, mockCurrentGold, mock52wHistory, retailLong);
    assert.strictEqual(analysis.contrarianAlert, 'INSTITUTIONAL_DISTRIBUTION_RETAIL_TRAP');
  });
});


describe('Temporal Engine & Session Detection Verification', () => {
  it('correctly detects London/NY Overlap (13:00 - 16:00 UTC)', () => {
    const overlapTime = new Date('2026-09-23T14:30:00.000Z');
    assert.strictEqual(TemporalEngine.getMarketSession(overlapTime), 'London/NY Overlap');
  });

  it('correctly detects New York Session (16:00 - 21:00 UTC)', () => {
    const nyTime = new Date('2026-09-23T18:00:00.000Z');
    assert.strictEqual(TemporalEngine.getMarketSession(nyTime), 'New York');
  });

  it('correctly detects Tokyo/Asia Session (00:00 - 08:00 UTC)', () => {
    const asiaTime = new Date('2026-09-23T04:15:00.000Z');
    assert.strictEqual(TemporalEngine.getMarketSession(asiaTime), 'Tokyo/Asia');
  });

  it('formats full human readable date and 24h UTC time', () => {
    const fixed = new Date('2026-09-23T15:45:00.000Z');
    assert.strictEqual(TemporalEngine.getFormattedDate(fixed), 'Wednesday, 23 Sep 2026');
    assert.strictEqual(TemporalEngine.getFormattedTime(fixed), '15:45:00 UTC');
  });
});
