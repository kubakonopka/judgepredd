# Szczegółowe ustalenia projektu JudgePredd

## 1. Architektura
- Single Page Application (SPA) bez backendu
- Hosting na GitHub Pages
- Wszystkie dane przechowywane w plikach statycznych (JSON, TXT)
- Przetwarzanie danych po stronie klienta

## 2. Struktura danych
Dane pochodzą z katalogu `mlflow_results`, który zawiera podkatalogi dla różnych eksperymentów:
- `results_basic_prompts`
- `results_perfect_prompts`
- `results_perfect_prompts_4o`
- itd.

Każdy eksperyment zawiera:
- `description.txt` - opis zmian w danej wersji
- `run.json` - wyniki i metryki dla pytań

### Format pliku run.json:
```json
{
  "run_name": "Question X",
  "prompt": "...",
  "response": "...",
  "correctness": 0.0,
  "correctness_weighted": 0.0,
  "faithfulness": 0.0,
  "correctness_claims": [...],
  "correctness_weighted_claims": [...],
  "faithfulness_claims": [...]
}
```

## 3. Funkcjonalności
### 3.1 Widok główny
- Lista wszystkich eksperymentów
- Dla każdego eksperymentu:
  - Średnie metryki (correctness, correctness_weighted, faithfulness)
  - Wykres porównawczy metryk
  - Link do szczegółów

### 3.2 Widok szczegółowy eksperymentu
- Opis z pliku description.txt
- Lista wszystkich pytań z metrykami
- Możliwość przejścia do widoku pojedynczego pytania

### 3.3 Widok pytania
- Historia odpowiedzi na pytanie w różnych eksperymentach
- Wykres trendu metryk
- Porównanie odpowiedzi między wersjami

## 4. Technologie
- Framework: React z TypeScript
- Wykresy: recharts lub Chart.js
- Stylowanie: Tailwind CSS
- Routing: React Router
- Zarządzanie stanem: React Context (lub Redux jeśli się okaże potrzebny)

## 5. Struktura projektu
```
judgepredd/
├── src/
│   ├── components/         # Komponenty React
│   ├── pages/             # Główne widoki
│   ├── types/             # Typy TypeScript
│   ├── utils/             # Funkcje pomocnicze
│   └── data/              # Funkcje do przetwarzania danych
├── public/
│   └── mlflow_results/    # Katalog z danymi (symlink)
└── package.json
```

## 6. Plan implementacji
1. Setup projektu
   - Inicjalizacja React z TypeScript
   - Konfiguracja GitHub Pages
   - Podstawowa struktura projektu

2. Implementacja funkcji do przetwarzania danych
   - Wczytywanie plików JSON
   - Obliczanie średnich metryk
   - Przygotowanie danych do wykresów

3. Implementacja widoków
   - Widok główny
   - Widok szczegółowy eksperymentu
   - Widok pytania

4. Stylowanie i UX
   - Implementacja responsywnego designu
   - Dodanie animacji i przejść
   - Optymalizacja wydajności

## 7. Pytania do rozważenia
1. Jak organizować dane w pamięci przeglądarki?
2. Czy potrzebujemy cachowania danych między sesjami?
3. Jak obsługiwać duże pliki JSON bez wpływu na wydajność?
4. Jak zorganizować routing dla różnych widoków?

## 8. Deployment
### 8.1 Konfiguracja
- Repozytorium na GitHubie: `judgepredd`
- Branch `main`: kod źródłowy + dane
- Branch `gh-pages`: zbudowana aplikacja (generowany automatycznie)
- Konfiguracja w package.json:
  ```json
  {
    "homepage": "https://[username].github.io/judgepredd",
    "scripts": {
      "predeploy": "npm run build",
      "deploy": "gh-pages -d build"
    }
  }
  ```

### 8.2 Proces deploymentu
1. Commitowanie i pushowanie zmian:
   ```bash
   git add .
   git commit -m "Update"
   git push
   ```
2. Deployment na GitHub Pages:
   ```bash
   npm run deploy
   ```

### 8.3 Aktualizacja danych
1. Dodanie nowych plików do `mlflow_results`
2. Commit i push zmian
3. Uruchomienie `npm run deploy`

### 8.4 Automatyzacja (opcjonalnie)
Możliwość skonfigurowania GitHub Actions do automatycznego deploymentu przy każdym pushu na `main`.
