// Domyślne wartości na wypadek błędu ładowania
export const experimentOrder: Record<string, number> = {
  'results_basic_prompts': 1,
  'results_perfect_prompts': 2,
  'results_perfect_prompts_no_ref': 3,
  'results_perfect_prompts_4o_no_ref': 4,
  'results_perfect_prompts_4o': 5
};

export let experiments: any[] = [];

// Ładujemy dane z experiments.json
export async function loadExperimentData() {
  try {
    experiments = window.EXPERIMENTS_DATA;
    
    // Aktualizujemy experimentOrder na podstawie załadowanych danych
    experiments.forEach(exp => {
      experimentOrder[exp.name] = exp.version;
    });
  } catch (error) {
    console.error('Error loading experiments:', error);
  }
}

// Wywołujemy ładowanie przy starcie
loadExperimentData();
