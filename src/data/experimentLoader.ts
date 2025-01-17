import { Experiment, ExperimentResult, ValidationCheck } from '../types/experiment';
import { calculateMetrics } from './metricsCalculator';
import { validateExperimentResults } from './dataValidator';

interface RawExperimentData {
  name: string;
  description: string;
  results: ExperimentResult[];
}

interface RunData {
  run_name: string;
  prompt: string;
  response: string;
  correctness: number;
  correctness_weighted: number;
  faithfulness: number;
  correctness_claims: Array<{
    statement: string;
    score: number;
    context: string;
  }>;
  correctness_weighted_claims: Array<{
    statement: string;
    score: number;
    context: string;
  }>;
  faithfulness_claims: Array<{
    statement: string;
    score: number;
    context: string;
  }>;
}

let experiments: any[] = [];

export interface ExperimentInfo {
  name: string;
  description: string;
  version: number;
  path: string;
}

async function loadExperiments() {
  try {
    let loadedExperiments;
    if (window.EXPERIMENTS_DATA) {
      // Tryb produkcyjny - używamy wbudowanych danych
      loadedExperiments = window.EXPERIMENTS_DATA;
    } else {
      // Tryb deweloperski - ładujemy z plików
      const response = await fetch(`${process.env.PUBLIC_URL}/mlflow_results/experiments.json`);
      if (!response.ok) {
        throw new Error('Failed to fetch experiments.json');
      }
      loadedExperiments = await response.json();
    }
    experiments = loadedExperiments || [];
  } catch (error) {
    console.error('Error loading experiments:', error);
    experiments = [];
  }
}

export async function getExperimentOrder(): Promise<{ [key: string]: number }> {
  if (experiments.length === 0) {
    await loadExperiments();
  }
  return experiments.reduce((acc: { [key: string]: number }, exp: ExperimentInfo) => {
    acc[exp.name] = exp.version;
    return acc;
  }, {});
}

const getExperimentPath = (experimentName: string): string => {
  const experiment = experiments.find(exp => exp.name === experimentName);
  return experiment ? experiment.path : experimentName;
};

/**
 * Ładuje surowe dane eksperymentu z pliku JSON
 */
export async function loadRawExperimentData(experimentName: string): Promise<RawExperimentData> {
  try {
    await loadExperiments();
    
    let data: RunData[];
    if (window.EXPERIMENT_RESULTS) {
      // Tryb produkcyjny - używamy wbudowanych danych
      data = window.EXPERIMENT_RESULTS[experimentName] as RunData[];
    } else {
      // Tryb deweloperski - ładujemy z plików
      const folderName = getExperimentPath(experimentName);
      const baseUrl = getBaseUrl();
      const jsonPath = `/mlflow_results/${folderName}/run.json`;
      const response = await fetch(baseUrl + jsonPath);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      data = await response.json();
    }

    // Załaduj opis z pliku description.txt jeśli istnieje
    let description = '';
    try {
      const experiment = experiments.find(exp => exp.name === experimentName);
      description = experiment?.description || '';
    } catch (error) {
      console.warn('Could not load description:', error);
    }

    // Przekształć dane do oczekiwanego formatu
    const results: ExperimentResult[] = data.map((run: RunData) => ({
      run_name: run.run_name,
      prompt: run.prompt,
      response: run.response,
      correctness: run.correctness,
      correctness_weighted: run.correctness_weighted,
      faithfulness: run.faithfulness,
      correctness_claims: run.correctness_claims,
      correctness_weighted_claims: run.correctness_weighted_claims,
      faithfulness_claims: run.faithfulness_claims
    }));

    return {
      name: experimentName,
      description,
      results
    };
  } catch (error) {
    console.error('Error loading experiment data:', error);
    throw error;
  }
}

/**
 * Ładuje i przetwarza dane eksperymentu
 */
export async function loadExperiment(experimentName: string): Promise<Experiment | null> {
  try {
    // Załaduj surowe dane
    const rawData = await loadRawExperimentData(experimentName);
    console.log('Loaded raw data:', rawData);
    const results = rawData.results;

    // Załaduj listę wszystkich eksperymentów, aby znaleźć poprzednią wersję
    await loadExperiments();
    const experimentsList = experiments.map(exp => ({
      name: exp.name,
      description: getExperimentDescription(exp.name)
    }));
    
    // Znajdź indeks obecnego eksperymentu
    const currentIndex = experimentsList.findIndex(exp => exp.name === experimentName);
    let previousVersion: Experiment | null = null;

    // Jeśli to nie jest pierwszy eksperyment, załaduj poprzednią wersję
    if (currentIndex > 0) {
      previousVersion = await loadExperiment(experimentsList[currentIndex - 1].name);
    }

    // Oblicz metryki
    const { metrics, individualScores } = calculateMetrics(results);

    // Wykonaj walidację
    const validationResult = validateExperimentResults(results);
    const validationChecks: ValidationCheck[] = [
      {
        description: "Struktura pliku JSON",
        passed: Array.isArray(results),
        details: Array.isArray(results) ? 
          `Poprawna struktura tablicy z ${results.length} wynikami` : 
          "Niepoprawna struktura - oczekiwano tablicy"
      },
      {
        description: "Walidacja wyników",
        passed: validationResult.validResults.length > 0,
        details: `Znaleziono ${validationResult.validResults.length} poprawnych wyników z ${results.length}`
      },
      {
        description: "Metryki",
        passed: validationResult.validResults.every(r => 
          typeof r.correctness === 'number' && 
          typeof r.correctness_weighted === 'number' && 
          typeof r.faithfulness === 'number'
        ),
        details: "Wszystkie metryki mają poprawny typ number"
      }
    ];

    // Przygotuj dane eksperymentu
    const experiment: Experiment = {
      name: experimentName,
      description: rawData.description,
      results,
      metrics,
      correctness: metrics.correctness,
      correctness_weighted: metrics.correctness_weighted,
      faithfulness: metrics.faithfulness,
      rawData: {
        dataValidation: {
          dataPath: `/mlflow_results/${getExperimentPath(experimentName)}/run.json`,
          loadedSuccessfully: validationResult.isValid,
          validationErrors: validationResult.errors,
          validationDetails: {
            totalResults: validationResult.summary.totalResults,
            resultsWithMissingData: validationResult.summary.resultsWithMissingData,
            resultsWithInvalidData: validationResult.summary.resultsWithInvalidData,
            checks: validationChecks
          }
        },
        totalQuestions: results.length,
        validQuestions: validationResult.validResults.length,
        individualScores,
        results,
        correctness: results.map(r => r.correctness),
        correctness_weighted: results.map(r => r.correctness_weighted),
        faithfulness: results.map(r => r.faithfulness)
      },
      previousVersion
    };

    return experiment;
  } catch (error) {
    console.error('Error loading experiment:', error);
    return null;
  }
}

/**
 * Ładuje i przetwarza dane wszystkich eksperymentów
 */
export async function loadAllExperiments(): Promise<Experiment[]> {
  try {
    await loadExperiments();
    if (!experiments || experiments.length === 0) {
      return [];
    }
    
    const loadedExperiments = await Promise.all(
      experiments.map(async (exp: ExperimentInfo) => {
        try {
          return await loadExperiment(exp.name);
        } catch (error) {
          console.error(`Error loading experiment ${exp.name}:`, error);
          return null;
        }
      })
    );

    return loadedExperiments.filter((exp): exp is Experiment => exp !== null);
  } catch (error) {
    console.error('Error loading all experiments:', error);
    return [];
  }
}

function getBaseUrl(): string {
  return process.env.PUBLIC_URL || '';
}

function getExperimentDescription(name: string): string {
  const experiment = experiments.find(exp => exp.name === name);
  if (experiment?.description) {
    return experiment.description;
  }
  // Fallback do starej metody jeśli nie znajdziemy opisu
  return name.replace(/_/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase());
}
