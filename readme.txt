===============================================================================
PROPOZYCJA PLANU PROJEKTOWEGO (Z PERSPEKTYWY PRODUCT MANAGERA I DEWELOPERA)
===============================================================================

1. WPROWADZENIE
Tworzymy aplikację webową, której celem jest wizualizacja i podsumowanie postępów 
nad AI-owym narzędziem do automatyzacji procesów due diligence. Narzędzie generuje
dwie rzeczy dla każdej wersji aplikacji:
- Plik "description" – opisujący w skrócie zmiany i aktualizacje danej wersji.
- Plik "JSON" – zawierający dokładne wyniki i metryki dla kilkunastu pytań (każdy
  run w procesie due diligence).

Aplikacja ma trzy główne widoki:
1) Główny widok (podsumowanie wszystkich przeprowadzonych wersji, wraz z 
   uśrednionymi metrykami).
2) Widok szczegółowy wersji (wyniki dla konkretnego runu – zestaw pytań, ich 
   odpowiedzi i metryk dla danej wersji).
3) Widok poszczególnego pytania (przegląd, jak zmieniała się jakość odpowiedzi 
   na konkretne pytanie w różnych wersjach).

Zadaniem aplikacji jest prezentowanie rozwoju programu i poprawy jakości wyników, 
co pomoże w ocenie, czy rozwijamy pipeline w dobrym kierunku.

-------------------------------------------------------------------------------
2. CEL I ZAKRES
- Cel główny:
  Udostępnić przejrzysty i profesjonalnie wyglądający dashboard, który pozwoli 
  monitorować i porównywać metryki jakościowe z różnych wersji aplikacji AI.

- Zakres:
  • Projekt struktury danych (analiza plików JSON, ustalenie, jakie dane 
    są potrzebne).
  • Stworzenie aplikacji webowej z trzema widokami.
  • Możliwość w przyszłości podpięcia aplikacji pod istniejący pipeline i 
    zautomatyzowania procesu ładowania/aktualizowania danych.
  • Integracja z systemem CI/CD lub innym narzędziem, które może automatycznie 
    dodawać dane do dashboardu.

-------------------------------------------------------------------------------
3. GŁÓWNE FUNKCJONALNOŚCI

3.1. Widok główny (podsumowanie)
- Lista wszystkich przeprowadzonych runów (tj. wersji aplikacji, np. v1.0, v1.1, 
  v2.0 itd.).
- Dla każdej wersji:
  • Średnie metryki (np. dokładność, trafność odpowiedzi, czas odpowiedzi itp.) 
    – wyliczone jako średnia dla wszystkich pytań w tym runie.
  • Ewentualna ocena jakości (np. wykres słupkowy, wykres trendu).
- Możliwość przejścia do widoku szczegółów danej wersji.

3.2. Widok szczegółowy wersji (runu)
- Szczegółowe informacje z pliku "description" (np. co zostało zaktualizowane 
  w danej wersji).
- Lista wszystkich pytań zadanych w tym runie, wraz z metrykami i krótkim 
  opisem:
  • Treść pytania.
  • Udzielona odpowiedź (opcjonalnie, jeśli chcemy pokazywać).
  • Metryki jakości (np. rating 1–5, wskaźnik trafności, itp.).
  • Możliwość przejścia do widoku historii tego konkretnego pytania.

3.3. Widok pojedynczego pytania
- Wyświetlenie, jak zmieniała się jakość odpowiedzi na to pytanie w różnych 
  wersjach aplikacji.
- Wykres trendu (np. linia, która pokazuje wzrost lub spadek wybranej metryki 
  w czasie).
- Krótki komentarz (jeśli w pliku description była wzmianka o zmianach 
  wpływających na to konkretne pytanie).

-------------------------------------------------------------------------------
4. ARCHITEKTURA I DANE

4.1. Format plików JSON
Każda wersja aplikacji generuje plik JSON ze strukturą (przykładowo):
{
  "version": "vX.X",
  "date": "YYYY-MM-DD",
  "questions": [
    {
      "question_id": 1,
      "content": "Treść pytania 1",
      "answer": "Odpowiedź modelu 1",
      "metrics": {
        "accuracy": 0.9,
        "time": 1.2,
        "other_metric": 85
      }
    },
    {
      "question_id": 2,
      "content": "Treść pytania 2",
      "answer": "Odpowiedź modelu 2",
      "metrics": {
        "accuracy": 0.7,
        "time": 0.9,
        "other_metric": 78
      }
    }
    // ...
  ]
}

Plik "description" z krótką informacją o zmianach, np. description_vX.X.txt

4.2. Struktura bazy danych
- Tabela/encja Version (lub kolekcja dokumentów w NoSQL):
  • ID / wersja, data, krótki opis, itp.
- Tabela/encja QuestionMetrics:
  • ID pytania, ID wersji, metryki, treść pytania, odpowiedź itp.
- Ewentualnie Tabela/encja QuestionHistory, jeśli chcemy przechowywać historię 
  pytań długoterminowo w inny sposób.
(Struktura może być dopasowana w zależności od używanej technologii bazy danych.)

4.3. Usprawnienia w analizie JSON
- Walidacja struktury pliku JSON (np. czy wszystkie pytania mają odpowiednie 
  metryki).
- Ewentualne logowanie błędów przy wczytywaniu.
- Możliwość wczytywania wielu plików JSON automatycznie (z folderu lub przez 
  panel w aplikacji).

-------------------------------------------------------------------------------
5. PROPOZYCJA TECHNOLOGII I NARZĘDZI
- Backend: Node.js / Python / (inny wybrany język) + framework do API 
  (Express/FastAPI/Django REST).
- Frontend: React / Vue / Angular (dowolny framework SPA), ewentualnie proste SSR.
- Baza danych:
  • PostgreSQL / MySQL, jeśli zależy nam na relacyjnej strukturze,
  • MongoDB, jeśli wolimy elastyczną strukturę NoSQL.
- Wczytywanie JSON-ów: skrypt w Pythonie lub Node.js, który automatycznie parsuje 
  i uzupełnia bazę.
- Hosting: Dowolny (np. Heroku, AWS, Azure, Vercel).

-------------------------------------------------------------------------------
6. PLAN IMPLEMENTACJI (ZADANIA DLA IDE AI)

6.1. Zadania krok po kroku
1) Utworzenie pustego repozytorium:
   • Inicjalizacja projektu (frontend + backend).
   • Konfiguracja środowiska (pliki konfiguracyjne, narzędzia typu ESLint, Prettier).
2) Analiza i ustalenie struktury bazy danych:
   • Zdefiniowanie modeli/dto odpowiadających strukturom JSON.
   • Stworzenie tabel/encji (Version, QuestionMetrics) z polami odpowiadającymi planowi 
     z rozdziału 4.2.
3) Moduł importu plików JSON:
   • Skrypt lub endpoint do wrzucania nowych wyników.
   • Walidacja JSON, wyodrębnienie danych i zapis do bazy.
4) Backend – warstwa logiki:
   • Endpoint do pobierania listy wszystkich wersji i wyliczania średnich metryk.
   • Endpoint do pobierania szczegółów jednej wersji (metryki dla każdego pytania).
   • Endpoint do pobierania historii dla jednego pytania.
5) Frontend – widok główny:
   • Ekran z listą wersji i uśrednionymi metrykami (wykresy, tabele).
   • Link do szczegółów.
6) Frontend – widok szczegółowy wersji:
   • Prezentacja opisu z pliku "description".
   • Lista pytań i ich metryk, link do szczegółów pytania.
7) Frontend – widok pojedynczego pytania:
   • Prezentacja historii metryk w formie wykresu (np. line chart).
8) Testy i integracja:
   • Testy jednostkowe (import plików, metody obliczające średnie, interfejs frontendu).
   • Testy e2e (przepływ przez główne ekrany, wczytywanie przykładowego JSON, itp.).
9) Optymalizacja i wdrożenie:
   • Refaktoryzacja (poprawa kodu, wydajności).
   • Wdrożenie na środowisku produkcyjnym (lub staging).

6.2. Harmonogram (przykładowy)
- Tydzień 1: Inicjalizacja projektu, konfiguracja, ustalenie schematu bazy.
- Tydzień 2: Import JSON, API do zapisu i odczytu danych, baza danych.
- Tydzień 3: Implementacja frontendu (widok główny i szczegółowy).
- Tydzień 4: Widok pojedynczego pytania, testy, przygotowanie do wdrożenia.
- Tydzień 5: Optymalizacja, ewentualne poprawki, wdrożenie.

6.3. Pętle iteracyjne
- Przy każdym etapie włączone testy i konsultacje z zespołem (lub z AI w IDE), 
  aby ewentualnie korygować kierunek prac.
- Możliwość dodawania nowych metryk, raportów lub filtrów w kolejnych sprintach.

-------------------------------------------------------------------------------
7. EWENTUALNE ROZSZERZENIA
- Filtrowanie po typie pytania (jeśli występuje kategoryzacja).
- Automatyczne generowanie raportów PDF z wynikami.
- Notyfikacje (np. e-mail, Slack), jeśli metryki spadają poniżej ustalonego progu.
- Uwierzytelnianie i autoryzacja użytkowników (jeśli dane są poufne).

-------------------------------------------------------------------------------
8. PODSUMOWANIE
Powyższy plan pozwala zbudować aplikację, która w przejrzysty sposób przedstawi 
poprawę (lub spadek) jakości odpowiedzi AI na pytania z procesu due diligence. 
Projekt zakłada modularne podejście – osobne warstwy: import danych, backend, 
frontend, testy. Dzięki temu z łatwością będzie można podłączyć w przyszłości 
kolejne funkcjonalności i zintegrować narzędzie z pipeline’em CI/CD.

Plan jest przygotowany w taki sposób, aby AI w IDE mogło pomagać na każdym 
etapie: od analizy struktury danych, poprzez generowanie kodu do parsowania 
plików JSON, aż po tworzenie backendu, frontendu i testów.

Powodzenia w realizacji projektu!
