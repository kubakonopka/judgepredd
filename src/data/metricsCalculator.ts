import { ExperimentResult } from '../types/experiment';

interface Metrics {
  correctness: number;
  correctness_weighted: number;
  faithfulness: number;
}

interface MetricsCache {
  [key: string]: {
    metrics: Metrics;
    individualScores: {
      correctness: number[];
      correctness_weighted: number[];
      faithfulness: number[];
    };
    timestamp: number;
  };
}

// Cache dla wyników obliczeń (w pamięci)
const metricsCache: MetricsCache = {};

// Czas ważności cache w milisekundach (np. 5 minut)
const CACHE_TTL = 5 * 60 * 1000;

// Funkcja generująca klucz cache dla danego zestawu wyników
function generateCacheKey(results: ExperimentResult[]): string {
  // Używamy tylko niezbędnych danych do generowania klucza
  const key = results.map(r => ({
    correctness: r.correctness,
    correctness_weighted: r.correctness_weighted,
    faithfulness: r.faithfulness
  }));
  return JSON.stringify(key);
}

// Funkcja sprawdzająca czy cache jest wciąż ważny
function isCacheValid(cacheEntry: MetricsCache[string]): boolean {
  const now = Date.now();
  return now - cacheEntry.timestamp < CACHE_TTL;
}

// Główna funkcja obliczająca metryki
export function calculateMetrics(results: ExperimentResult[]): {
  metrics: Metrics;
  individualScores: {
    correctness: number[];
    correctness_weighted: number[];
    faithfulness: number[];
  };
} {
  // Sprawdź czy wyniki są w cache i czy cache jest wciąż ważny
  const cacheKey = generateCacheKey(results);
  const cachedResult = metricsCache[cacheKey];
  if (cachedResult && isCacheValid(cachedResult)) {
    return {
      metrics: cachedResult.metrics,
      individualScores: cachedResult.individualScores
    };
  }

  // Filtruj wyniki z wartością -1 (nieocenione)
  console.log('Total results before filtering:', results.length);
  results.forEach((r, index) => {
    console.log(`Result ${index + 1}:`, {
      correctness: r.correctness,
      correctness_weighted: r.correctness_weighted,
      faithfulness: r.faithfulness,
      used_for_correctness: r.correctness !== -1,
      used_for_weighted: r.correctness_weighted !== -1,
      used_for_faithfulness: r.faithfulness !== -1
    });
  });
  
  // Filtrujemy osobno dla każdej metryki
  const validForCorrectness = results.filter(r => r.correctness !== -1);
  const validForWeighted = results.filter(r => r.correctness_weighted !== -1);
  const validForFaithfulness = results.filter(r => r.faithfulness !== -1);

  console.log('Valid results count:', JSON.stringify({
    correctness: validForCorrectness.length,
    correctness_weighted: validForWeighted.length,
    faithfulness: validForFaithfulness.length
  }, null, 2));

  // Oblicz sumy dla każdej metryki osobno
  const sums = {
    correctness: validForCorrectness.reduce((sum, r) => sum + r.correctness, 0),
    correctness_weighted: validForWeighted.reduce((sum, r) => sum + r.correctness_weighted, 0),
    faithfulness: validForFaithfulness.reduce((sum, r) => sum + r.faithfulness, 0)
  };

  console.log('Sums:', JSON.stringify(sums, null, 2));

  // Oblicz średnie dla każdej metryki osobno
  const averages = {
    correctness: validForCorrectness.length > 0 ? sums.correctness / validForCorrectness.length : 0,
    correctness_weighted: validForWeighted.length > 0 ? sums.correctness_weighted / validForWeighted.length : 0,
    faithfulness: validForFaithfulness.length > 0 ? sums.faithfulness / validForFaithfulness.length : 0
  };

  console.log('Averages calculation:', JSON.stringify(averages, null, 2));

  const metrics = {
    correctness: averages.correctness,
    correctness_weighted: averages.correctness_weighted,
    faithfulness: averages.faithfulness
  };

  console.log('Final metrics:', JSON.stringify(metrics, null, 2));

  // Przygotuj indywidualne wyniki (zachowujemy oryginalne wartości)
  const individualScores = {
    correctness: results.map(r => r.correctness),
    correctness_weighted: results.map(r => r.correctness_weighted),
    faithfulness: results.map(r => r.faithfulness)
  };

  // Zapisz wyniki w cache
  metricsCache[cacheKey] = {
    metrics,
    individualScores,
    timestamp: Date.now()
  };

  return {
    metrics,
    individualScores
  };
}
