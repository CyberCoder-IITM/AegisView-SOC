import { getThreatLevel } from "./simulator.js";

export interface ForecastPoint {
  step: number;
  timestamp: string;
  value: number;
  upper: number;
  lower: number;
}

export interface Forecast {
  predictions: ForecastPoint[];
  trend_direction: "RISING" | "FALLING" | "STABLE";
  predicted_peak: number;
  predicted_peak_time: string;
  alert: string | null;
  history: Array<{ time: string; value: number }>;
}

const MAX_HISTORY = 360;
const STEP_MS = 5_000;
const PERIOD = 12;

interface HistoryPoint { time: string; value: number; ts: number }
const history: HistoryPoint[] = [];

export function addDataPoint(score: number): void {
  history.push({ time: new Date().toISOString(), value: score, ts: Date.now() });
  if (history.length > MAX_HISTORY) history.shift();
}

function stdDev(values: number[]): number {
  if (values.length < 2) return 5;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / values.length;
  return Math.sqrt(variance);
}

function holtwinters(data: number[], alpha: number, beta: number, horizon: number): number[] {
  if (data.length < 2) return Array(horizon).fill(data[0] ?? 30);

  let level = data[0];
  let trend = data.length > 1 ? (data[data.length - 1] - data[0]) / (data.length - 1) : 0;

  for (let i = 1; i < data.length; i++) {
    const prevLevel = level;
    level = alpha * data[i] + (1 - alpha) * (level + trend);
    trend = beta * (level - prevLevel) + (1 - beta) * trend;
  }

  const result: number[] = [];
  for (let h = 1; h <= horizon; h++) {
    result.push(Math.min(100, Math.max(0, level + h * trend)));
  }
  return result;
}

export function forecast(horizonSteps = 12): Forecast {
  const values = history.map(h => h.value);
  const now = Date.now();
  const rollingStd = stdDev(values.slice(-20));

  const predictions: ForecastPoint[] = [];

  if (values.length < 3) {
    const flat = values[values.length - 1] ?? 30;
    for (let i = 1; i <= horizonSteps; i++) {
      const ts = new Date(now + i * STEP_MS).toISOString();
      predictions.push({ step: i, timestamp: ts, value: flat, upper: Math.min(100, flat + 15), lower: Math.max(0, flat - 15) });
    }
    return {
      predictions,
      trend_direction: "STABLE",
      predicted_peak: flat,
      predicted_peak_time: new Date(now + STEP_MS).toISOString(),
      alert: null,
      history: history.slice(-60).map(h => ({ time: h.time, value: h.value })),
    };
  }

  const forecasted = holtwinters(values, 0.3, 0.1, horizonSteps);

  for (let i = 0; i < forecasted.length; i++) {
    const val = forecasted[i];
    const ts = new Date(now + (i + 1) * STEP_MS).toISOString();
    predictions.push({
      step: i + 1,
      timestamp: ts,
      value: Math.round(val),
      upper: Math.min(100, Math.round(val + 1.96 * rollingStd)),
      lower: Math.max(0, Math.round(val - 1.96 * rollingStd)),
    });
  }

  const last5 = values.slice(-5);
  const trendSlope = last5.length >= 2
    ? (last5[last5.length - 1] - last5[0]) / last5.length
    : 0;
  const trendDirection: Forecast["trend_direction"] =
    trendSlope > 2 ? "RISING" : trendSlope < -2 ? "FALLING" : "STABLE";

  const peak = Math.max(...predictions.map(p => p.value));
  const peakPoint = predictions.find(p => p.value === peak)!;

  let alert: string | null = null;
  if (trendDirection === "RISING" && peak > 85) {
    const minsAway = Math.round((peakPoint.step * STEP_MS) / 60000);
    alert = `⚠ Threat level predicted to reach CRITICAL in approximately ${minsAway} minute${minsAway !== 1 ? "s" : ""}`;
  } else if (trendDirection === "RISING" && peak > 60) {
    alert = `↑ Threat level trending HIGH — monitor closely`;
  }

  return {
    predictions,
    trend_direction: trendDirection,
    predicted_peak: peak,
    predicted_peak_time: peakPoint.timestamp,
    alert,
    history: history.slice(-60).map(h => ({ time: h.time, value: h.value })),
  };
}

export function startForecaster(): void {
  addDataPoint(getThreatLevel().score);
  setInterval(() => {
    addDataPoint(getThreatLevel().score);
  }, STEP_MS);
}
