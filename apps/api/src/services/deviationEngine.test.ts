import { describe, it } from 'node:test';
import assert from 'node:assert';
import { DeviationEngine } from './deviationEngine.js';

describe('DeviationEngine Unit Verification', () => {
  it('correctly parses varied financial string metrics', () => {
    assert.strictEqual(DeviationEngine.parseMetric('3.2%'), 3.2);
    assert.strictEqual(DeviationEngine.parseMetric('-0.5%'), -0.5);
    assert.strictEqual(DeviationEngine.parseMetric('150K'), 150000);
    assert.strictEqual(DeviationEngine.parseMetric('2.5M'), 2500000);
    assert.strictEqual(DeviationEngine.parseMetric('$14.50'), 14.50);
    assert.strictEqual(DeviationEngine.parseMetric('-'), null);
    assert.strictEqual(DeviationEngine.parseMetric('N/A'), null);
  });

  it('correctly detects a BEAT (bullish surprise)', () => {
    const analysis = DeviationEngine.analyze('250K', '180K', '150K');
    assert.strictEqual(analysis.deviationType, 'BEAT');
    assert.ok(analysis.delta! > 0);
    assert.ok(analysis.deviationScore > 0);
    assert.strictEqual(analysis.isSignificantVolatility, true);
  });

  it('correctly detects a MISS (bearish surprise)', () => {
    const analysis = DeviationEngine.analyze('1.8%', '2.5%', '2.3%');
    assert.strictEqual(analysis.deviationType, 'MISS');
    assert.ok(analysis.delta! < 0);
    assert.ok(analysis.deviationScore < 0);
    assert.strictEqual(analysis.isSignificantVolatility, true);
  });

  it('correctly detects IN-LINE / NEUTRAL result', () => {
    const analysis = DeviationEngine.analyze('5.25%', '5.25%', '5.25%');
    assert.strictEqual(analysis.deviationType, 'NEUTRAL');
    assert.strictEqual(analysis.delta, 0);
    assert.strictEqual(analysis.deviationScore, 0);
    assert.strictEqual(analysis.isSignificantVolatility, false);
  });

  it('handles unreleased pending metrics', () => {
    const analysis = DeviationEngine.analyze(null, '3.1%', '3.0%');
    assert.strictEqual(analysis.deviationType, 'PENDING');
    assert.strictEqual(analysis.delta, null);
    assert.strictEqual(analysis.isSignificantVolatility, false);
  });
});
