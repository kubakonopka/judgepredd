// Domyślne wartości na wypadek błędu ładowania
export const experimentOrder: Record<string, number> = {
  'results_basic_prompts': 1,
  'results_perfect_prompts': 2,
  'results_perfect_prompts_no_ref': 3,
  'results_perfect_prompts_4o_no_ref': 4,
  'results_perfect_prompts_4o': 5
};

// Inicjalizujemy pustą tablicą
export let experiments: any[] = [];

// Ładujemy dane z experiments.json
export async function loadExperimentData() {
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

    // Aktualizujemy experiments dopiero po załadowaniu
    experiments = loadedExperiments;
    
    // Aktualizujemy experimentOrder na podstawie załadowanych danych
    if (experiments && experiments.length > 0) {
      experiments.forEach(exp => {
        experimentOrder[exp.name] = exp.version;
      });
    }
  } catch (error) {
    console.error('Error loading experiments:', error);
  }
}

// Wywołujemy ładowanie przy starcie
loadExperimentData();
