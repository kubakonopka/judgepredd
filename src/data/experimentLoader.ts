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

function getExperimentPath(experimentName: string): string | { [key: string]: string } {
  const experimentMap: { [key: string]: string } = {
    'results_basic_prompts': '1. results_basic_prompts',
    'results_perfect_prompts': '2. results_perfect_prompts',
    'results_perfect_prompts_no_ref': '3. results_perfect_prompts_no_ref',
    'results_perfect_prompts_4o_no_ref': '4. results_perfect_prompts_4o_no_ref',
    'results_perfect_prompts_4o': '5. results_perfect_prompts_4o'
  };

  return experimentName ? experimentMap[experimentName] || experimentName : experimentMap;
}

/**
 * Ładuje surowe dane eksperymentu z pliku JSON
 */
export async function loadRawExperimentData(experimentName: string): Promise<RawExperimentData> {
  try {
    const folderName = getExperimentPath(experimentName);
    const baseUrl = getBaseUrl();
    const jsonPath = `/mlflow_results/${folderName}/run.json`;
    console.log('Loading data from:', jsonPath);
    
    const response = await fetch(baseUrl + jsonPath);
    console.log('Response status:', response.status);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const rawData: RunData[] = await response.json();
    console.log('Loaded raw data:', rawData);
    
    // Załaduj opis z pliku description.txt jeśli istnieje
    let description = '';
    try {
      const descPath = `/mlflow_results/${folderName}/description.txt`;
      console.log('Loading description from:', descPath);
      const descResponse = await fetch(baseUrl + descPath);
      console.log('Description response status:', descResponse.status);
      
      if (descResponse.ok) {
        description = await descResponse.text();
      }
    } catch (error) {
      console.warn(`Could not load description for ${experimentName}:`, error);
    }

    // Przekształć dane do oczekiwanego formatu
    const results: ExperimentResult[] = rawData.map(run => ({
      prompt: run.prompt,
      response: run.response,
      correctness: run.correctness,
      correctness_weighted: run.correctness_weighted,
      faithfulness: run.faithfulness,
      correctness_claims: run.correctness_claims,
      correctness_weighted_claims: run.correctness_weighted_claims,
      faithfulness_claims: run.faithfulness_claims,
      run_name: run.run_name
    }));
    
    return {
      name: experimentName,
      description: description || getExperimentDescription(experimentName),
      results
    };
  } catch (error) {
    console.error(`Error loading experiment data for ${experimentName}:`, error);
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
    const experiments = Object.keys(getExperimentPath('')).map(name => ({
      name,
      description: getExperimentDescription(name)
    }));
    
    // Znajdź indeks obecnego eksperymentu
    const currentIndex = experiments.findIndex(exp => exp.name === experimentName);
    let previousVersion: Experiment | null = null;

    // Jeśli to nie jest pierwszy eksperyment, załaduj poprzednią wersję
    if (currentIndex > 0) {
      previousVersion = await loadExperiment(experiments[currentIndex - 1].name);
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
          dataPath: getBaseUrl() + `/mlflow_results/${getExperimentPath(experimentName)}/run.json`,
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
    const response = await fetch(`${process.env.PUBLIC_URL}/mlflow_results/experiments.json`);
    if (!response.ok) {
      throw new Error('Failed to fetch experiments.json');
    }
    const experiments = await response.json();
    
    // Załaduj dane dla każdego eksperymentu
    const loadedExperiments = await Promise.all(
      experiments.map(async (exp: any) => {
        try {
          return await loadExperiment(exp.name);
        } catch (error) {
          console.error(`Error loading experiment ${exp.name}:`, error);
          return null;
        }
      })
    );
    
    // Odfiltruj nieudane ładowania
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
  return name.replace(/_/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase());
}
