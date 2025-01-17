const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Parsuj argumenty
function parseArgs() {
    const args = process.argv.slice(2);
    const dataDir = args.find(arg => arg.startsWith('--data-dir='))?.split('=')[1];
    const outputDir = args.find(arg => arg.startsWith('--output-dir='))?.split('=')[1] || 'dist';

    if (!dataDir) {
        console.error('Użycie: node scripts/bundleData.js --data-dir=/sciezka/do/mlflow_results [--output-dir=dist]');
        process.exit(1);
    }

    return { dataDir, outputDir };
}

// Wczytaj dane z JSONa
function readJSON(filePath) {
    try {
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (error) {
        console.error(`Błąd podczas czytania ${filePath}:`, error);
        process.exit(1);
    }
}

// Zbierz wszystkie dane
function gatherData(dataDir) {
    console.log('Zbieranie danych...');
    const experiments = readJSON(path.join(dataDir, 'experiments.json'));
    const experimentData = {};

    experiments.forEach(exp => {
        const runPath = path.join(dataDir, exp.path, 'run.json');
        experimentData[exp.name] = readJSON(runPath);
    });

    return { experiments, experimentData };
}

// Generuj plik z danymi
function generateDataScript(data) {
    console.log('Generowanie skryptu z danymi...');
    return `
// Dane wygenerowane automatycznie
window.EXPERIMENTS_DATA = ${JSON.stringify(data.experiments)};
window.EXPERIMENT_RESULTS = ${JSON.stringify(data.experimentData)};

// Nadpisujemy funkcje ładujące dane
window.loadExperimentData = function(experimentName) {
    return Promise.resolve(window.EXPERIMENT_RESULTS[experimentName]);
};

window.loadExperiments = function() {
    return Promise.resolve(window.EXPERIMENTS_DATA);
};
`;
}

// Zmodyfikuj kod źródłowy aby używał globalnych zmiennych
function modifySourceCode() {
    console.log('Modyfikowanie kodu źródłowego...');
    
    // Lista plików do modyfikacji
    const filesToModify = [
        'src/data/experimentLoader.ts',
        'src/data/constants.ts',
        'src/pages/ExperimentList.tsx',
        'src/pages/ExperimentDetails.tsx'
    ];

    filesToModify.forEach(filePath => {
        const fullPath = path.join(process.cwd(), filePath);
        if (!fs.existsSync(fullPath)) return;

        let content = fs.readFileSync(fullPath, 'utf8');

        // Zamień wszystkie fetche na użycie globalnych zmiennych
        content = content.replace(
            /const response = await fetch.*experiments\.json.*\n.*experiments = await response\.json\(\);/g,
            'const experiments = window.EXPERIMENTS_DATA;'
        );

        content = content.replace(
            /const response = await fetch.*run\.json.*\n.*const data = await response\.json\(\);/g,
            'const data = window.EXPERIMENT_RESULTS[experimentName];'
        );

        content = content.replace(
            /fetch\(`\${.*}\/mlflow_results\/.*\.json`\)/g,
            'Promise.resolve(window.EXPERIMENTS_DATA)'
        );

        fs.writeFileSync(fullPath, content);
    });
}

// Główna funkcja
async function main() {
    const { dataDir, outputDir } = parseArgs();

    // 1. Zbierz dane
    const data = gatherData(dataDir);

    // 2. Stwórz folder dist
    fs.mkdirSync(outputDir, { recursive: true });

    // 3. Wygeneruj plik z danymi
    const dataScript = generateDataScript(data);

    // 4. Zmodyfikuj kod źródłowy
    modifySourceCode();

    // 5. Zbuduj aplikację
    console.log('Budowanie aplikacji...');
    execSync('npm run build', { stdio: 'inherit' });

    // 6. Połącz wszystko w jeden plik HTML
    console.log('Generowanie finalnego pliku HTML...');
    const buildHtml = fs.readFileSync(path.join('build', 'index.html'), 'utf8');
    const finalHtml = buildHtml
        .replace('</head>', `<script>${dataScript}</script></head>`);

    fs.writeFileSync(path.join(outputDir, 'index.html'), finalHtml);

    // 7. Skopiuj potrzebne assety
    console.log('Kopiowanie assetów...');
    fs.cpSync(path.join('build', 'static'), path.join(outputDir, 'static'), { recursive: true });

    console.log(`\nGotowe! Plik index.html został wygenerowany w folderze ${outputDir}/`);
}

main().catch(error => {
    console.error('Błąd:', error);
    process.exit(1);
});
