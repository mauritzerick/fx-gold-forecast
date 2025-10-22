export interface HoltResult {
  fitted: number[];
  forecast: number[];
  sigma: number;
}

export interface ChartPoint {
  x: string;
  actual: number | null;
  fitted: number | null;
  forecast: number | null;
  bandHi: number | null;
  bandLo: number | null;
  sma: number | null;
  ema: number | null;
}

/**
 * Holt Linear Exponential Smoothing
 * @param series - Historical data points
 * @param alpha - Level smoothing parameter (0-1)
 * @param beta - Trend smoothing parameter (0-1)
 * @param horizon - Number of forecast periods
 * @returns Fitted values, forecast, and residual standard deviation
 */
export function holtLinear(series: number[], alpha: number, beta: number, horizon: number): HoltResult {
  if (series.length < 2) {
    return { fitted: [], forecast: [], sigma: 0 };
  }

  const n = series.length;
  const fitted: number[] = new Array(n).fill(null);
  const forecast: number[] = [];

  // Better initialization using linear regression on first few points
  const initPoints = Math.min(5, Math.floor(n / 2));
  let level = series[0];
  let trend = 0;
  
  if (initPoints >= 2) {
    // Calculate trend using linear regression on initial points
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
    for (let i = 0; i < initPoints; i++) {
      sumX += i;
      sumY += series[i];
      sumXY += i * series[i];
      sumXX += i * i;
    }
    trend = (initPoints * sumXY - sumX * sumY) / (initPoints * sumXX - sumX * sumX);
    level = series[0];
  }

  fitted[0] = level;

  // Apply Holt's method with proper level and trend updates
  for (let i = 1; i < n; i++) {
    const prevLevel = level;
    const prevTrend = trend;
    
    // Update level: weighted average of current observation and previous forecast
    level = alpha * series[i] + (1 - alpha) * (prevLevel + prevTrend);
    
    // Update trend: weighted average of current trend estimate and previous trend
    trend = beta * (level - prevLevel) + (1 - beta) * prevTrend;
    
    // Fitted value is the one-step-ahead forecast
    fitted[i] = prevLevel + prevTrend;
  }

  // Generate forecast using the final level and trend
  for (let h = 1; h <= horizon; h++) {
    forecast.push(level + h * trend);
  }

  // Debug logging
  console.log('🔍 Holt Linear Debug:');
  console.log('  - Series length:', n);
  console.log('  - Alpha:', alpha, 'Beta:', beta);
  console.log('  - Final level:', level);
  console.log('  - Final trend:', trend);
  console.log('  - Forecast points:', forecast.length);
  console.log('  - First forecast:', forecast[0]);
  console.log('  - Last forecast:', forecast[forecast.length - 1]);
  console.log('  - Forecast trend direction:', trend > 0 ? 'UP' : trend < 0 ? 'DOWN' : 'FLAT');

  // Calculate residual standard deviation
  const residuals = series.slice(1).map((value, i) => value - fitted[i + 1]).filter(r => !isNaN(r));
  const sigma = residuals.length > 0 
    ? Math.sqrt(residuals.reduce((sum, r) => sum + r * r, 0) / residuals.length)
    : 0;

  return { fitted, forecast, sigma };
}

/**
 * Simple Moving Average
 * @param series - Data series
 * @param window - Window size
 * @returns SMA values (null for initial values)
 */
export function sma(series: number[], window: number): (number | null)[] {
  if (window < 1 || window > series.length) {
    return new Array(series.length).fill(null);
  }

  const result: (number | null)[] = new Array(series.length).fill(null);

  for (let i = window - 1; i < series.length; i++) {
    const sum = series.slice(i - window + 1, i + 1).reduce((a, b) => a + b, 0);
    result[i] = sum / window;
  }

  return result;
}

/**
 * Exponential Moving Average
 * @param series - Data series
 * @param window - Window size (used to calculate smoothing factor)
 * @returns EMA values (null for initial values)
 */
export function ema(series: number[], window: number): (number | null)[] {
  if (window < 1 || series.length === 0) {
    return new Array(series.length).fill(null);
  }

  const result: (number | null)[] = new Array(series.length).fill(null);
  const smoothingFactor = 2 / (window + 1);

  result[0] = series[0];

  for (let i = 1; i < series.length; i++) {
    result[i] = smoothingFactor * series[i] + (1 - smoothingFactor) * (result[i - 1] || 0);
  }

  return result;
}

/**
 * Build chart data from time series and indicators
 * @param points - Historical data points
 * @param fitted - Fitted values from Holt smoothing
 * @param forecast - Forecast values
 * @param sigma - Residual standard deviation
 * @param smaArr - SMA values
 * @param emaArr - EMA values
 * @returns Chart data points
 */
export function buildChartData(
  points: { date: string; rate: number }[],
  fitted: number[],
  forecast: number[],
  sigma: number,
  smaArr: (number | null)[],
  emaArr: (number | null)[]
): ChartPoint[] {
  const result: ChartPoint[] = [];
  const lastDate = points[points.length - 1]?.date || '';

  // Historical data
  points.forEach((point, i) => {
    const fittedValue = fitted[i] || null;
    const smaValue = smaArr[i];
    const emaValue = emaArr[i];

    result.push({
      x: point.date,
      actual: point.rate,
      fitted: fittedValue,
      forecast: null,
      bandHi: null,
      bandLo: null,
      sma: smaValue,
      ema: emaValue
    });
  });

  // Forecast data
  forecast.forEach((value, i) => {
    const forecastDate = new Date(lastDate);
    forecastDate.setDate(forecastDate.getDate() + i + 1);
    const dateStr = forecastDate.toISOString().split('T')[0];

    result.push({
      x: dateStr,
      actual: null,
      fitted: null,
      forecast: value,
      bandHi: value + 1.96 * sigma,
      bandLo: value - 1.96 * sigma,
      sma: null,
      ema: null
    });
  });

  return result;
}
