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
  const validResults = results.filter(r => 
    r.correctness !== -1 && 
    r.correctness_weighted !== -1 && 
    r.faithfulness !== -1
  );

  // Jeśli nie ma ważnych wyników, zwróć zera
  if (validResults.length === 0) {
    const emptyResult = {
      metrics: {
        correctness: 0,
        correctness_weighted: 0,
        faithfulness: 0
      },
      individualScores: {
        correctness: results.map(r => r.correctness),
        correctness_weighted: results.map(r => r.correctness_weighted),
        faithfulness: results.map(r => r.faithfulness)
      }
    };

    // Zapisz w cache
    metricsCache[cacheKey] = {
      ...emptyResult,
      timestamp: Date.now()
    };

    return emptyResult;
  }

  // Oblicz średnie wartości dla każdej metryki
  const metrics = {
    correctness: validResults.reduce((sum, r) => sum + r.correctness, 0) / validResults.length,
    correctness_weighted: validResults.reduce((sum, r) => sum + r.correctness_weighted, 0) / validResults.length,
    faithfulness: validResults.reduce((sum, r) => sum + r.faithfulness, 0) / validResults.length
  };

  // Przygotuj indywidualne wyniki
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
