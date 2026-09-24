import { prisma, isDbConnected, inMemoryStore } from './prismaClient.js';
import { CotAssetName } from '../services/cotAnalyticsEngine.js';

interface SeedAsset {
  code: string;
  name: CotAssetName;
  baseOi: number;
  baseSpecLong: number;
  baseSpecShort: number;
  baseCommLong: number;
  baseCommShort: number;
  retailTicker: string;
  retailLong: number;
}

const ASSET_SEEDS: SeedAsset[] = [
  {
    code: '088691',
    name: 'GOLD',
    baseOi: 524300,
    baseSpecLong: 288450,
    baseSpecShort: 46210,
    baseCommLong: 112400,
    baseCommShort: 374900,
    retailTicker: 'XAUUSD',
    retailLong: 82.4
  },
  {
    code: '084691',
    name: 'SILVER',
    baseOi: 168200,
    baseSpecLong: 74800,
    baseSpecShort: 21300,
    baseCommLong: 39500,
    baseCommShort: 101200,
    retailTicker: 'XAGUSD',
    retailLong: 78.1
  },
  {
    code: '067651',
    name: 'CRUDE_OIL',
    baseOi: 1845000,
    baseSpecLong: 342100,
    baseSpecShort: 138500,
    baseCommLong: 765000,
    baseCommShort: 994000,
    retailTicker: 'USOIL',
    retailLong: 61.5
  },
  {
    code: '098662',
    name: 'DXY',
    baseOi: 43200,
    baseSpecLong: 19800,
    baseSpecShort: 17400,
    baseCommLong: 15200,
    baseCommShort: 18100,
    retailTicker: 'USIDX',
    retailLong: 44.8
  }
];

export async function seedInitialData(force = false): Promise<void> {
  if (!isDbConnected()) {
    console.log('[SEED] Database offline — skipping persistent seed.');
    return;
  }

  try {
    const cotCount = await prisma.cotReport.count();
    const pulseCount = await prisma.intelligenceFeed.count();

    if (!force && cotCount > 20 && pulseCount > 10) {
      console.log(`[SEED] Database already populated (COT: ${cotCount}, Pulse: ${pulseCount}). Skipping seed.`);
      return;
    }

    console.log('[SEED] Populating institutional macroeconomic data into PostgreSQL...');

    // 1. Seed 52-Week CFTC COT Historical Archives per asset
    const now = new Date();
    // Anchor to latest Tuesday (CFTC report date convention)
    const dayOfWeek = now.getUTCDay();
    const diffToTuesday = (dayOfWeek + 5) % 7; // days since last Tuesday
    const latestTuesday = new Date(now.getTime() - diffToTuesday * 86400000);
    latestTuesday.setUTCHours(0, 0, 0, 0);

    for (const asset of ASSET_SEEDS) {
      for (let week = 0; week < 52; week++) {
        const reportDate = new Date(latestTuesday.getTime() - week * 7 * 86400000);
        
        // Pseudo-random deterministic cyclical drift
        const cycle = Math.sin((52 - week) / 4) * 0.15;
        const trend = ((52 - week) / 52) * 0.08;
        const variance = Math.cos((52 - week) / 2) * 0.05;
        const multiplier = 1 + cycle + trend + variance;

        const openInterest = Math.round(asset.baseOi * (1 + cycle * 0.5 + variance * 0.3));
        const nonCommercialLong = Math.round(asset.baseSpecLong * multiplier);
        const nonCommercialShort = Math.round(asset.baseSpecShort * (1 - cycle * 0.8));
        const nonCommercialSpreads = Math.round(openInterest * 0.08);
        const commercialLong = Math.round(asset.baseCommLong * (1 - cycle * 0.4));
        const commercialShort = Math.round(asset.baseCommShort * multiplier);
        const otherReportableLong = Math.round(openInterest * 0.05);
        const otherReportableShort = Math.round(openInterest * 0.04);
        const nonReportableLong = Math.round(openInterest * 0.03);
        const nonReportableShort = Math.round(openInterest * 0.03);
        const speculatorNet = nonCommercialLong - nonCommercialShort;
        const oiVelocity14d = parseFloat((cycle * 8.5).toFixed(2));

        await prisma.cotReport.upsert({
          where: {
            asset_report_unique: {
              assetCode: asset.code,
              reportDate
            }
          },
          update: {
            openInterest,
            nonCommercialLong,
            nonCommercialShort,
            nonCommercialSpreads,
            commercialLong,
            commercialShort,
            otherReportableLong,
            otherReportableShort,
            nonReportableLong,
            nonReportableShort,
            speculatorNet,
            oiVelocity14d
          },
          create: {
            reportDate,
            assetCode: asset.code,
            assetName: asset.name,
            openInterest,
            nonCommercialLong,
            nonCommercialShort,
            nonCommercialSpreads,
            commercialLong,
            commercialShort,
            otherReportableLong,
            otherReportableShort,
            nonReportableLong,
            nonReportableShort,
            speculatorNet,
            oiVelocity14d
          }
        });
      }

      // Seed retail sentiment
      await prisma.retailSentiment.create({
        data: {
          asset: asset.retailTicker,
          source: 'MYFXBOOK',
          longPercent: asset.retailLong,
          shortPercent: parseFloat((100 - asset.retailLong).toFixed(1)),
          longPositions: Math.round(asset.baseSpecLong * 0.1),
          shortPositions: Math.round(asset.baseSpecShort * 0.1),
          capturedAt: new Date()
        }
      });
    }

    console.log('[SEED] COT 52-week archives & retail sentiment generated.');

    // 2. Seed "The Pulse" Intelligence Feed
    const pulseItems = [
      {
        source: 'Federal Reserve / Powell Speech',
        headline: 'FOMC MINUTES CONFIRM BALANCED RISK ASSESSMENT: DUAL-MANDATE RESTRICTION MAINTAINED',
        keyTakeaways: [
          'Committee participants noted disinflation progress is resuming toward the 2% target.',
          'Labor market cooling observed without widespread disruption to prime-age employment.',
          'Neutral terminal rate repriced upward to 3.25%-3.50% range across committee dots.'
        ],
        impactRating: 'Critical',
        affectedInstruments: ['USD', 'US10Y', 'XAUUSD', 'SPX'],
        surpriseIndex: 0.85,
        sentimentScore: 0.15,
        sentimentPolarity: 'BULLISH',
        marketSession: 'NEW_YORK',
        minutesAgo: 12
      },
      {
        source: 'Bureau of Labor Statistics',
        headline: 'US CORE CPI RISES 0.28% M/M VS 0.30% EXP: SHELTER DISINFLATION ACCELERATES',
        keyTakeaways: [
          'Owners Equivalent Rent (OER) printed at slowest monthly velocity since mid-2021.',
          'Supercore services ex-housing decelerated to +0.18% annualized pace.',
          'Short-end Treasury yields dropped 8 bps on increased 50 bps easing expectations.'
        ],
        impactRating: 'Critical',
        affectedInstruments: ['US02Y', 'DXY', 'EURUSD', 'GOLD'],
        surpriseIndex: -0.92,
        sentimentScore: 0.65,
        sentimentPolarity: 'DOVISH',
        marketSession: 'NEW_YORK',
        minutesAgo: 45
      },
      {
        source: 'European Central Bank',
        headline: 'ECB CUTS DEPOSIT FACILITY RATE BY 25 BPS TO 3.50% ON SUBDUED EUROZONE GROWTH',
        keyTakeaways: [
          'Lagarde reiterates data-dependent, meeting-by-meeting approach without pre-commitment.',
          'German industrial manufacturing output contracted 0.4% in consecutive quarters.',
          'Staff macroeconomic projections lower 2026 Eurozone GDP baseline expansion to 0.8%.'
        ],
        impactRating: 'High',
        affectedInstruments: ['EURUSD', 'EURGBP', 'BUND10Y'],
        surpriseIndex: 0.05,
        sentimentScore: -0.40,
        sentimentPolarity: 'DOVISH',
        marketSession: 'LONDON',
        minutesAgo: 95
      },
      {
        source: 'Bank of Japan',
        headline: 'BOJ GOVERNOR UEDA SIGNALS READINESS FOR FURTHER POLICY RATE NORMALIZATION',
        keyTakeaways: [
          'Underlying inflation on track to sustainably achieve 2% price stability mandate.',
          'Real policy rate remains deeply negative, providing significant accommodative stimulus.',
          'Yen carry trade unwinding risks cited as manageable amid solid corporate earnings.'
        ],
        impactRating: 'High',
        affectedInstruments: ['USDJPY', 'GBPJPY', 'NIKKEI225'],
        surpriseIndex: 1.15,
        sentimentScore: 0.70,
        sentimentPolarity: 'HAWKISH',
        marketSession: 'TOKYO',
        minutesAgo: 160
      },
      {
        source: 'OPEC+ Secretariat',
        headline: 'OPEC+ CONFIRMS PRODUCTION RESTORATION PAUSE EXTENSION THROUGH YEAR-END',
        keyTakeaways: [
          'Voluntary output cuts of 2.2M bpd will remain in place through December 31.',
          'Ministers emphasize market discipline to preempt seasonal Q4 inventory overhangs.',
          'WTI and Brent spot forward curves flatten toward backwardation.'
        ],
        impactRating: 'High',
        affectedInstruments: ['USOIL', 'BRENT', 'USDCAD'],
        surpriseIndex: 0.65,
        sentimentScore: 0.55,
        sentimentPolarity: 'BULLISH',
        marketSession: 'LONDON',
        minutesAgo: 240
      },
      {
        source: 'World Gold Council',
        headline: 'SOVEREIGN CENTRAL BANKS ACCELERATE RESERVE DIVERSIFICATION WITH 320T GOLD Q3 INFLOWS',
        keyTakeaways: [
          'PBoC, Reserve Bank of India, and National Bank of Poland drive sovereign purchases.',
          'De-dollarization tailwinds and geopolitical hedge demand establish strong institutional floor.',
          'Managed money net speculative exposure in COMEX futures remains in top 90th percentile.'
        ],
        impactRating: 'High',
        affectedInstruments: ['XAUUSD', 'XAGUSD', 'DXY'],
        surpriseIndex: 1.45,
        sentimentScore: 0.85,
        sentimentPolarity: 'STRONG_BULLISH',
        marketSession: 'LONDON',
        minutesAgo: 380
      }
    ];

    for (const item of pulseItems) {
      const timestampUtc = new Date(Date.now() - item.minutesAgo * 60000);
      await prisma.intelligenceFeed.create({
        data: {
          timestampUtc,
          timestampMicros: BigInt(timestampUtc.getTime() * 1000),
          source: item.source,
          headline: item.headline,
          keyTakeaways: item.keyTakeaways,
          impactRating: item.impactRating,
          affectedInstruments: item.affectedInstruments,
          surpriseIndex: item.surpriseIndex,
          sentimentScore: item.sentimentScore,
          sentimentPolarity: item.sentimentPolarity,
          marketSession: item.marketSession,
          link: 'https://vanta.chadi0x.io/pulse'
        }
      });
    }

    console.log('[SEED] Pulse intelligence feed populated.');

    // 3. Seed Economic Calendar Events
    const events = [
      {
        asset: 'USD',
        headline: 'US Core PCE Price Index m/m',
        impactLevel: 'High',
        actualMetric: '0.2%',
        forecast: '0.2%',
        previous: '0.3%',
        deviationType: 'AS_EXPECTED',
        deviationScore: 0.05,
        sentimentScore: 0.1,
        sentimentPolarity: 'NEUTRAL',
        targetTicker: 'OANDA:EURUSD',
        targetAssetName: 'EUR/USD',
        source: 'ForexFactory',
        minutesAgo: 60
      },
      {
        asset: 'USD',
        headline: 'Non-Farm Employment Change',
        impactLevel: 'High',
        actualMetric: '228K',
        forecast: '165K',
        previous: '142K',
        deviationType: 'POSITIVE_SURPRISE',
        deviationScore: 1.82,
        sentimentScore: 0.75,
        sentimentPolarity: 'HAWKISH',
        targetTicker: 'TVC:US10Y',
        targetAssetName: 'US 10Y Yield',
        source: 'ForexFactory',
        minutesAgo: 180
      },
      {
        asset: 'EUR',
        headline: 'Eurozone Flash Manufacturing PMI',
        impactLevel: 'Medium',
        actualMetric: '44.8',
        forecast: '45.7',
        previous: '45.8',
        deviationType: 'NEGATIVE_SURPRISE',
        deviationScore: -1.25,
        sentimentScore: -0.6,
        sentimentPolarity: 'BEARISH',
        targetTicker: 'OANDA:EURUSD',
        targetAssetName: 'EUR/USD',
        source: 'ForexFactory',
        minutesAgo: 320
      },
      {
        asset: 'GBP',
        headline: 'UK GDP m/m',
        impactLevel: 'High',
        actualMetric: '0.2%',
        forecast: '0.0%',
        previous: '-0.1%',
        deviationType: 'POSITIVE_SURPRISE',
        deviationScore: 1.1,
        sentimentScore: 0.5,
        sentimentPolarity: 'BULLISH',
        targetTicker: 'OANDA:GBPUSD',
        targetAssetName: 'GBP/USD',
        source: 'ForexFactory',
        minutesAgo: 450
      }
    ];

    for (const e of events) {
      const d = new Date(Date.now() - e.minutesAgo * 60000);
      await prisma.economicEvent.create({
        data: {
          id: `EVT_${e.asset}_${d.getTime()}`,
          timestampUtc: d,
          dateFormatted: d.toISOString().slice(0, 10),
          timeFormatted: d.toTimeString().slice(0, 8),
          marketSession: 'NEW_YORK',
          asset: e.asset,
          impactLevel: e.impactLevel,
          actualMetric: e.actualMetric,
          forecast: e.forecast,
          previous: e.previous,
          headline: e.headline,
          source: e.source,
          deviationType: e.deviationType,
          deviationScore: e.deviationScore,
          sentimentScore: e.sentimentScore,
          sentimentPolarity: e.sentimentPolarity,
          targetTicker: e.targetTicker,
          targetAssetName: e.targetAssetName
        }
      });
    }

    // 4. Seed Scraper Health Status
    const workers = [
      { workerName: 'cftc-comex', status: 'HEALTHY', recordsIngested: 208, latencyMs: 312 },
      { workerName: 'retail-sentiment', status: 'HEALTHY', recordsIngested: 48, latencyMs: 145 },
      { workerName: 'forex-factory', status: 'HEALTHY', recordsIngested: 32, latencyMs: 220 },
      { workerName: 'rss-feeds', status: 'HEALTHY', recordsIngested: 96, latencyMs: 180 },
      { workerName: 'crypto-equities', status: 'HEALTHY', recordsIngested: 64, latencyMs: 275 },
      { workerName: 'us-treasury', status: 'HEALTHY', recordsIngested: 12, latencyMs: 410 }
    ];

    for (const w of workers) {
      await prisma.scraperHealth.create({
        data: {
          workerName: w.workerName,
          status: w.status,
          recordsIngested: w.recordsIngested,
          latencyMs: w.latencyMs,
          reportedAt: new Date(),
          lastRunAt: new Date(Date.now() - 120000)
        }
      });
    }

    // 5. Seed Treasury Yields
    await prisma.treasuryYield.upsert({
      where: { recordDate: new Date(new Date().setUTCHours(0, 0, 0, 0)) },
      update: {
        bc1Month: 5.34,
        bc3Month: 5.28,
        bc6Month: 5.12,
        bc1Year: 4.65,
        bc2Year: 4.12,
        bc5Year: 3.95,
        bc10Year: 4.28,
        bc30Year: 4.58,
        spread10y2y: 0.16,
        spread10y3m: -1.00
      },
      create: {
        recordDate: new Date(new Date().setUTCHours(0, 0, 0, 0)),
        bc1Month: 5.34,
        bc3Month: 5.28,
        bc6Month: 5.12,
        bc1Year: 4.65,
        bc2Year: 4.12,
        bc5Year: 3.95,
        bc10Year: 4.28,
        bc30Year: 4.58,
        spread10y2y: 0.16,
        spread10y3m: -1.00
      }
    });

    console.log('[SEED] Institutional macroeconomic data seeding complete!');
  } catch (err: any) {
    console.error('[SEED ERROR] Failed to seed initial data:', err.message);
  }
}
