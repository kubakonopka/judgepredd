import React, { useState } from 'react';
import { ExperimentResult } from '../types/experiment';
import { formatMetricValue as formatMetricValueUtil } from '../utils/formatters';
import ReactMarkdown from 'react-markdown';
import CompareVersions from './CompareVersions';
import QuestionMetricsChart from './QuestionMetricsChart';
import { experimentOrder } from '../constants';

interface ExperimentResultsProps {
  results: ExperimentResult[];
  previousResults?: ExperimentResult[];
  currentVersion?: string;
  previousVersion?: string;
  experimentId: string;
  allExperiments: { [key: string]: ExperimentResult[] };
}

interface MetricChangeProps {
  change: { percentage: number; absolute: number } | null;
  current: number;
  previous?: number;
  currentVersion?: string;
  previousVersion?: string;
}

const calculateChange = (current: number, previous?: number): { percentage: number; absolute: number } | null => {
  if (previous === undefined || previous === -1 || current === -1) return null;
  
  const change = {
    percentage: ((current - previous) / previous) * 100,
    absolute: current - previous
  };

  return change;
};

const MetricChange = ({ change, current, previous, currentVersion, previousVersion }: MetricChangeProps) => {
  // Jeśli nie ma poprzedniej wartości lub current jest -1, nie pokazujemy zmiany
  if (!change || current === -1 || previous === undefined) return null;

  const formatVersion = (version?: string) => {
    if (!version) return '';
    return `v${experimentOrder[version] || ''}`;
  };
  
  // Jeśli obie wartości są 0 lub takie same
  if (current === previous) {
    return (
      <div className="text-sm text-gray-500 mt-1">
        No change ({(current * 100).toFixed(2)}%)
      </div>
    );
  }

  // Jeśli poprzednia wartość była 0
  if (previous === 0 && current > 0) {
    return (
      <div className="text-sm text-green-600 mt-1">
        ↑ New score: {(current * 100).toFixed(2)}%
      </div>
    );
  }

  // Jeśli obecna wartość jest 0
  if (current === 0 && previous > 0) {
    return (
      <div className="text-sm text-red-600 mt-1">
        ↓ Score dropped to 0% (from {(previous * 100).toFixed(2)}%)
      </div>
    );
  }

  const changeColor = change.percentage > 0 ? 'text-green-600' : 'text-red-600';
  const arrow = change.percentage > 0 ? '↑' : '↓';
  
  // Sprawdzamy czy zmiana procentowa jest prawidłową liczbą
  const percentageChange = isNaN(change.percentage) ? 0 : change.percentage;
  
  return (
    <div className={`text-sm ${changeColor} mt-1`}>
      {arrow} {Math.abs(percentageChange).toFixed(1)}% ({formatVersion(previousVersion)} → {formatVersion(currentVersion)})
      <div className="text-gray-500">
        {(previous * 100).toFixed(2)}% → {(current * 100).toFixed(2)}%
      </div>
    </div>
  );
};

const ContentBox = ({ content, isExpanded }: { content: string, isExpanded: boolean }) => (
  <div className="relative">
    <div className="bg-gray-50 p-4 rounded-lg text-gray-700 transition-all duration-200 overflow-hidden">
      <div className="markdown-content">
        <ReactMarkdown 
          className="text-sm text-gray-700 markdown-content"
        >
          {content}
        </ReactMarkdown>
      </div>
    </div>
  </div>
);

export default function ExperimentResults({ 
  results, 
  previousResults, 
  currentVersion, 
  previousVersion, 
  experimentId,
  allExperiments 
}: ExperimentResultsProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [comparingStates, setComparingStates] = useState<{ [key: number]: boolean }>({});
  const [selectedVersions, setSelectedVersions] = useState<{ [key: number]: string }>({});
  const [showingMetricsChart, setShowingMetricsChart] = useState<Record<number, boolean>>({});
  const [expandedQuestions, setExpandedQuestions] = useState<Set<number>>(new Set());

  const filteredResults = results.filter(
    (result) =>
      result.prompt.toLowerCase().includes(searchTerm.toLowerCase()) ||
      result.response.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Dodajemy funkcję do automatycznego wyboru wersji do porównania
  const getDefaultComparisonVersion = (currentExperimentId: string) => {
    const currentVersion = experimentOrder[currentExperimentId];
    if (currentVersion === 1) {
      // Jeśli jesteśmy w wersji 1, znajdź ID wersji 2
      const version2Id = Object.entries(experimentOrder).find(([_, version]) => version === 2)?.[0];
      return version2Id || '';
    } else {
      // W przeciwnym razie znajdź ID wersji 1
      const version1Id = Object.entries(experimentOrder).find(([_, version]) => version === 1)?.[0];
      return version1Id || '';
    }
  };

  const handleCompareStart = (index: number) => {
    const newComparingStates = { ...comparingStates };
    newComparingStates[index] = true;
    setComparingStates(newComparingStates);

    // Automatycznie wybierz wersję do porównania
    const defaultVersion = getDefaultComparisonVersion(experimentId);
    const newSelectedVersions = { ...selectedVersions };
    newSelectedVersions[index] = defaultVersion;
    setSelectedVersions(newSelectedVersions);

    // Rozwiń pytanie
    const newExpanded = new Set(expandedQuestions);
    newExpanded.add(index);
    setExpandedQuestions(newExpanded);
  };

  const handleVersionSelect = (index: number, versionId: string) => {
    setSelectedVersions(prev => ({ ...prev, [index]: versionId }));
  };

  const getComparedResult = (index: number): ExperimentResult | undefined => {
    const selectedVersion = selectedVersions[index];
    return selectedVersion ? allExperiments[selectedVersion]?.[index] : undefined;
  };

  const toggleExpand = (itemId: string) => {
    const newExpanded = new Set(expandedItems);
    const index = itemId.split('-')[1]; // Wyciągamy indeks z ID
    
    // Sprawdzamy, czy to prompt czy response
    const isPrompt = itemId.includes('prompt');
    const isResponse = itemId.includes('response');
    
    if (isPrompt || isResponse) {
      // Jeśli kliknięto w prompt lub response w normalnym widoku
      if (!itemId.includes('current-') && !itemId.includes('compared-')) {
        const promptId = `prompt-${index}`;
        const responseId = `response-${index}`;
        
        if (newExpanded.has(promptId) && newExpanded.has(responseId)) {
          newExpanded.delete(promptId);
          newExpanded.delete(responseId);
        } else {
          newExpanded.add(promptId);
          newExpanded.add(responseId);
        }
      }
      // Jeśli kliknięto w prompt lub response w trybie porównania
      else {
        const currentId = `current-${isPrompt ? 'prompt' : 'response'}-${index}`;
        const comparedId = `compared-${isPrompt ? 'prompt' : 'response'}-${index}`;
        
        if (newExpanded.has(currentId) && newExpanded.has(comparedId)) {
          newExpanded.delete(currentId);
          newExpanded.delete(comparedId);
        } else {
          newExpanded.add(currentId);
          newExpanded.add(comparedId);
        }
      }
    }
    
    setExpandedItems(newExpanded);
  };

  const handleCompareEnd = (index: number) => {
    const newComparingStates = { ...comparingStates };
    newComparingStates[index] = false;
    setComparingStates(newComparingStates);
    
    const newSelectedVersions = { ...selectedVersions };
    newSelectedVersions[index] = '';
    setSelectedVersions(newSelectedVersions);
  };

  const toggleMetricsChart = (index: number) => {
    // Nie pozwalamy na włączenie wykresu podczas porównywania
    if (comparingStates[index]) {
      return;
    }

    const newShowingMetricsChart = { ...showingMetricsChart };
    newShowingMetricsChart[index] = !showingMetricsChart[index];
    setShowingMetricsChart(newShowingMetricsChart);

    // Jeśli włączamy wykres, upewniamy się że belka jest rozwinięta
    if (newShowingMetricsChart[index]) {
      const newExpandedQuestions = new Set(expandedQuestions);
      newExpandedQuestions.add(index);
      setExpandedQuestions(newExpandedQuestions);
    }
  };

  const toggleQuestionExpand = (index: number, event: React.MouseEvent) => {
    // Ignoruj kliknięcia w przyciski
    if ((event.target as HTMLElement).closest('button')) {
      return;
    }
    
    // Ignoruj kliknięcia jeśli jesteśmy w trybie porównania
    if (comparingStates[index]) {
      return;
    }
    
    const newExpanded = new Set(expandedQuestions);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedQuestions(newExpanded);
  };

  // Funkcja do przełączania wszystkich elementów w danym widoku
  const toggleAllItems = (index: number, itemType: 'normal' | 'prompts' | 'responses') => {
    const newExpanded = new Set(expandedItems);
    
    if (itemType === 'normal') {
      const normalItemsExpanded = expandedItems.has(`prompt-${index}`) && expandedItems.has(`response-${index}`);
      
      if (normalItemsExpanded) {
        newExpanded.delete(`prompt-${index}`);
        newExpanded.delete(`response-${index}`);
      } else {
        newExpanded.add(`prompt-${index}`);
        newExpanded.add(`response-${index}`);
      }
    } else if (itemType === 'prompts') {
      const promptsExpanded = expandedItems.has(`current-prompt-${index}`) && expandedItems.has(`compared-prompt-${index}`);
      
      if (promptsExpanded) {
        newExpanded.delete(`current-prompt-${index}`);
        newExpanded.delete(`compared-prompt-${index}`);
      } else {
        newExpanded.add(`current-prompt-${index}`);
        newExpanded.add(`compared-prompt-${index}`);
      }
    } else if (itemType === 'responses') {
      const responsesExpanded = expandedItems.has(`current-response-${index}`) && expandedItems.has(`compared-response-${index}`);
      
      if (responsesExpanded) {
        newExpanded.delete(`current-response-${index}`);
        newExpanded.delete(`compared-response-${index}`);
      } else {
        newExpanded.add(`current-response-${index}`);
        newExpanded.add(`compared-response-${index}`);
      }
    }
    
    setExpandedItems(newExpanded);
  };

  const getMetricColor = (value: number) => {
    if (value === -1) return 'text-gray-400';
    if (value >= 0.85) return 'text-green-600';
    if (value >= 0.50) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="bg-white">
      <style>
        {`
          .markdown-content h1 {
            font-size: 1.5rem;
            line-height: 2rem;
            font-weight: 600;
            margin-top: 1.5rem;
            margin-bottom: 1rem;
          }
          .markdown-content h2 {
            font-size: 1.25rem;
            line-height: 1.75rem;
            font-weight: 600;
            margin-top: 1.5rem;
            margin-bottom: 1rem;
          }
          .markdown-content p {
            margin-top: 1rem;
            margin-bottom: 1rem;
          }
          .markdown-content ul {
            list-style-type: disc;
            padding-left: 1.5rem;
            margin-top: 1rem;
            margin-bottom: 1rem;
          }
          .markdown-content ol {
            list-style-type: decimal;
            padding-left: 1.5rem;
            margin-top: 1rem;
            margin-bottom: 1rem;
          }
          .markdown-content li {
            margin-top: 0.5rem;
            margin-bottom: 0.5rem;
          }
          .markdown-content pre {
            background-color: #f3f4f6;
            padding: 1rem;
            border-radius: 0.375rem;
            overflow-x: auto;
            margin-top: 1rem;
            margin-bottom: 1rem;
          }
          .markdown-content code {
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
            font-size: 0.875rem;
            line-height: 1.25rem;
            padding: 0.25rem;
            background-color: #f3f4f6;
            border-radius: 0.25rem;
          }
          .markdown-content blockquote {
            border-left-width: 4px;
            border-color: #e5e7eb;
            padding-left: 1rem;
            font-style: italic;
            margin-left: 0;
            margin-right: 0;
          }
          .prompt-scroll {
            max-height: 150px;
            overflow-y: auto;
            padding-right: 16px;
          }
          .prompt-scroll::-webkit-scrollbar {
            width: 8px;
          }
          .prompt-scroll::-webkit-scrollbar-track {
            background: #f1f1f1;
            border-radius: 4px;
          }
          .prompt-scroll::-webkit-scrollbar-thumb {
            background: #888;
            border-radius: 4px;
          }
          .prompt-scroll::-webkit-scrollbar-thumb:hover {
            background: #666;
          }
          .expanded-content {
            max-height: none !important;
            overflow: visible !important;
            height: auto !important;
            white-space: pre-wrap;
            word-break: break-word;
            position: relative;
            z-index: 1;
          }
          .content-container {
            transition: all 0.3s ease-in-out;
            overflow: hidden;
            height: auto;
            position: relative;
          }
          .markdown-content {
            white-space: pre-wrap;
            word-break: break-word;
            height: auto;
            width: 100%;
            display: block;
          }
          .markdown-content > * {
            width: 100%;
            height: auto;
            display: block;
          }
          .markdown-content pre {
            white-space: pre-wrap;
            word-break: break-word;
            overflow-x: auto;
            width: 100%;
          }
          .markdown-content code {
            white-space: pre-wrap;
            word-break: break-word;
          }
          .markdown-content p {
            margin: 0.5em 0;
            width: 100%;
          }
        `}
      </style>
      <div className="p-4">
        {/* Nagłówek z wyszukiwarką */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div className="text-sm text-gray-500">
            Showing {filteredResults.length} of {results.length} results
          </div>
          <div className="relative flex-1 sm:max-w-md">
            <input
              type="text"
              placeholder="Search in prompts and responses..."
              className="w-full px-4 py-1.5 pl-9 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Lista wyników */}
        <div className="space-y-3">
          {filteredResults.map((result, index) => {
            const previousResult = previousResults?.[index];
            const correctnessChange = calculateChange(result.correctness, previousResult?.correctness);
            const weightedChange = calculateChange(result.correctness_weighted, previousResult?.correctness_weighted);
            const faithfulnessChange = calculateChange(result.faithfulness, previousResult?.faithfulness);

            return (
              <div 
                key={index} 
                className="border rounded-lg overflow-hidden bg-white shadow-sm"
                id={`question-${index + 1}`}
              >
                {/* Nagłówek z metrykami */}
                <div 
                  className={`border-b bg-gray-50 relative ${!comparingStates[index] ? 'cursor-pointer group' : ''}`}
                  onClick={(e) => !comparingStates[index] && toggleQuestionExpand(index, e)}
                >
                  <div className={`px-4 py-2 transform transition-transform duration-200 ${!comparingStates[index] && 'group-hover:translate-y-[2px]'}`}>
                    {/* Normalny widok (bez porównania) */}
                    {!comparingStates[index] && (
                      <div className="flex flex-col lg:flex-row items-start lg:items-center">
                        <h3 className="text-lg font-semibold text-gray-900 min-w-[100px] mb-2 lg:mb-0 flex items-center gap-2">
                          Question {index + 1}
                          <svg 
                            className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${expandedQuestions.has(index) ? 'rotate-180' : ''}`} 
                            fill="none" 
                            viewBox="0 0 24 24" 
                            stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </h3>
                        <div className="flex-1 flex items-center justify-center space-x-6 lg:space-x-8 mb-2 lg:mb-0">
                          <div className="text-center">
                            <div className="text-sm font-medium text-gray-500 mb-0.5">Correctness</div>
                            <div className={`text-lg font-bold ${getMetricColor(result.correctness)}`}>
                              {result.correctness === -1 ? '—' : formatMetricValueUtil(result.correctness)}
                            </div>
                          </div>
                          <div className="text-center border-x px-6 lg:px-8">
                            <div className="text-sm font-medium text-gray-500 mb-2">Weighted Correctness</div>
                            <div className={`text-lg font-bold ${getMetricColor(result.correctness_weighted)}`}>
                              {result.correctness_weighted === -1 ? '—' : formatMetricValueUtil(result.correctness_weighted)}
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-sm font-medium text-gray-500 mb-2">Faithfulness</div>
                            <div className={`text-lg font-bold ${getMetricColor(result.faithfulness)}`}>
                              {result.faithfulness === -1 ? '—' : formatMetricValueUtil(result.faithfulness)}
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-row justify-end gap-2 w-full lg:w-auto">
                          <button
                            onClick={() => toggleMetricsChart(index)}
                            className="px-3 py-1.5 bg-indigo-600 text-white rounded-md shadow-sm text-sm font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 flex items-center gap-2 min-w-[160px]"
                          >
                            {showingMetricsChart[index] ? (
                              <>
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                                <span>CLOSE CHART</span>
                              </>
                            ) : (
                              <>
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                                <div className="text-left">
                                  <span>Question Metrics</span>
                                  <span className="block text-xs text-indigo-200">Progression Chart</span>
                                </div>
                              </>
                            )}
                          </button>
                          <button
                            onClick={() => handleCompareStart(index)}
                            className="px-3 py-1.5 bg-indigo-600 text-white rounded-md shadow-sm text-sm font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 flex items-center gap-2 min-w-[160px]"
                          >
                            {comparingStates[index] ? (
                              <>
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                                <span>Close</span>
                              </>
                            ) : (
                              <>
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                </svg>
                                <div className="text-left">
                                  <span>Compare Versions</span>
                                  <span className="block text-xs text-indigo-200">Side by Side View</span>
                                </div>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Widok porównania */}
                    {comparingStates[index] && (
                      <>
                        <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
                          <div className="flex flex-col lg:flex-row items-center gap-4 w-full lg:w-auto">
                            <h3 className="text-lg font-semibold text-gray-900">
                              Question {index + 1} - Version Comparison
                            </h3>
                            <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg border border-gray-200 w-full lg:w-auto">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-gray-700">Compare:</span>
                                <span className="px-2 py-1 bg-white rounded border border-gray-300 text-sm">
                                  Current Version (v{experimentOrder[experimentId]})
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-gray-700">with:</span>
                                <select
                                  value={selectedVersions[index] || getDefaultComparisonVersion(experimentId)}
                                  onChange={(e) => {
                                    const newSelectedVersions = { ...selectedVersions };
                                    newSelectedVersions[index] = e.target.value;
                                    setSelectedVersions(newSelectedVersions);
                                  }}
                                  className="px-2 py-1 border-gray-300 rounded text-sm focus:ring-indigo-500 focus:border-indigo-500 min-w-[120px]"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {Object.entries(experimentOrder)
                                    .filter(([id]) => id !== experimentId)
                                    .map(([id, version]) => (
                                      <option key={id} value={id}>
                                        Version {version}
                                      </option>
                                    ))}
                                </select>
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const newComparingStates = { ...comparingStates };
                              delete newComparingStates[index];
                              setComparingStates(newComparingStates);
                              
                              const newSelectedVersions = { ...selectedVersions };
                              delete newSelectedVersions[index];
                              setSelectedVersions(newSelectedVersions);
                            }}
                            className="px-3 py-1.5 text-sm font-medium text-gray-700 hover:text-gray-900 bg-white rounded-md shadow-sm border border-gray-200 hover:bg-gray-50 transition-colors duration-200 flex items-center gap-2 whitespace-nowrap"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            <span>Close comparison</span>
                          </button>
                        </div>

                        {/* Prompt */}
                        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 shadow-sm mb-3 mt-4">
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            {/* Current Version Prompt */}
                            <div>
                              <h4 className="text-sm font-medium text-gray-900 mb-2 flex items-center justify-between">
                                <span>Current Version Prompt (v{experimentOrder[experimentId]})</span>
                                {!expandedItems.has(`current-prompt-${index}`) && (
                                  <span className="text-xs text-gray-500">(click to expand)</span>
                                )}
                              </h4>
                              <div 
                                className="cursor-pointer" 
                                onClick={() => toggleExpand(`current-prompt-${index}`)}
                              >
                                <div className={`content-container bg-white rounded p-3 border border-gray-200`}>
                                  <div className={`markdown-content text-sm text-gray-700 ${
                                    expandedItems.has(`current-prompt-${index}`) ? 'expanded-content' : 'prompt-scroll'
                                  }`}>
                                    <ReactMarkdown>
                                      {result.prompt}
                                    </ReactMarkdown>
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            {/* Compared Version Prompt */}
                            <div>
                              <h4 className="text-sm font-medium text-gray-900 mb-2 flex items-center justify-between">
                                <span>Compared Version Prompt (v{experimentOrder[selectedVersions[index] || getDefaultComparisonVersion(experimentId)]})</span>
                                {!expandedItems.has(`compared-prompt-${index}`) && (
                                  <span className="text-xs text-gray-500">(click to expand)</span>
                                )}
                              </h4>
                              <div 
                                className="cursor-pointer" 
                                onClick={() => toggleExpand(`compared-prompt-${index}`)}
                              >
                                <div className={`content-container bg-white rounded p-3 border border-gray-200`}>
                                  <div className={`markdown-content text-sm text-gray-700 ${
                                    expandedItems.has(`compared-prompt-${index}`) ? 'expanded-content' : 'prompt-scroll'
                                  }`}>
                                    <ReactMarkdown>
                                      {getComparedResult(index)?.prompt || 'No prompt available'}
                                    </ReactMarkdown>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Przycisk Show more/less dla promptów */}
                        <div className="flex justify-center mb-8">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleAllItems(index, 'prompts');
                            }}
                            className="px-3 py-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-800 bg-white rounded-md shadow-sm border border-gray-200 hover:bg-gray-50 transition-colors duration-200 flex items-center space-x-2"
                          >
                            {(expandedItems.has(`current-prompt-${index}`) && expandedItems.has(`compared-prompt-${index}`)) ? (
                              <>
                                <span>Show less</span>
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                </svg>
                              </>
                            ) : (
                              <>
                                <span>Show more</span>
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              </>
                            )}
                          </button>
                        </div>

                        {/* Porównanie metryk */}
                        <div className="grid grid-cols-3 gap-6 mb-4 bg-white rounded-lg p-4 shadow-sm mt-4">
                          <div className="text-center">
                            <div className="text-sm font-medium text-gray-500 mb-2">Correctness</div>
                            <div className="flex items-center justify-center space-x-4">
                              <div>
                                <div className={`text-lg font-bold ${getMetricColor(result.correctness)}`}>
                                  {result.correctness === -1 ? '—' : formatMetricValueUtil(result.correctness)}
                                </div>
                                <div className="text-sm text-gray-500">{currentVersion}</div>
                              </div>
                              <div className="text-lg text-gray-400">→</div>
                              <div>
                                <div className={`text-lg font-bold ${getMetricColor(getComparedResult(index)?.correctness || -1)}`}>
                                  {getComparedResult(index)?.correctness === undefined ? '—' : formatMetricValueUtil(getComparedResult(index)?.correctness || 0)}
                                </div>
                                <div className="text-sm text-gray-500">v{experimentOrder[selectedVersions[index] || 'results_basic_prompts']}</div>
                              </div>
                            </div>
                          </div>

                          <div className="text-center">
                            <div className="text-sm font-medium text-gray-500 mb-2">Weighted Correctness</div>
                            <div className="flex items-center justify-center space-x-4">
                              <div>
                                <div className={`text-lg font-bold ${getMetricColor(result.correctness_weighted)}`}>
                                  {result.correctness_weighted === -1 ? '—' : formatMetricValueUtil(result.correctness_weighted)}
                                </div>
                                <div className="text-sm text-gray-500">{currentVersion}</div>
                              </div>
                              <div className="text-lg text-gray-400">→</div>
                              <div>
                                <div className={`text-lg font-bold ${getMetricColor(getComparedResult(index)?.correctness_weighted || -1)}`}>
                                  {getComparedResult(index)?.correctness_weighted === undefined ? '—' : formatMetricValueUtil(getComparedResult(index)?.correctness_weighted || 0)}
                                </div>
                                <div className="text-sm text-gray-500">v{experimentOrder[selectedVersions[index] || 'results_basic_prompts']}</div>
                              </div>
                            </div>
                          </div>

                          <div className="text-center">
                            <div className="text-sm font-medium text-gray-500 mb-2">Faithfulness</div>
                            <div className="flex items-center justify-center space-x-4">
                              <div>
                                <div className={`text-lg font-bold ${getMetricColor(result.faithfulness)}`}>
                                  {result.faithfulness === -1 ? '—' : formatMetricValueUtil(result.faithfulness)}
                                </div>
                                <div className="text-sm text-gray-500">{currentVersion}</div>
                              </div>
                              <div className="text-lg text-gray-400">→</div>
                              <div>
                                <div className={`text-lg font-bold ${getMetricColor(getComparedResult(index)?.faithfulness || -1)}`}>
                                  {getComparedResult(index)?.faithfulness === undefined ? '—' : formatMetricValueUtil(getComparedResult(index)?.faithfulness || 0)}
                                </div>
                                <div className="text-sm text-gray-500">v{experimentOrder[selectedVersions[index] || 'results_basic_prompts']}</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Treść pytania */}
                <div 
                  className={`transition-all duration-300 ease-in-out overflow-hidden ${
                    expandedQuestions.has(index) || comparingStates[index] ? 'max-h-full opacity-100' : 'max-h-0 opacity-0'
                  }`}
                  style={{
                    height: expandedQuestions.has(index) || comparingStates[index] ? 'auto' : '0'
                  }}
                >
                  <div className="mt-4">
                    {/* Wykres metryk */}
                    {showingMetricsChart[index] && !comparingStates[index] && (
                      <div className="mb-6 bg-white rounded-lg p-4 shadow-sm w-1/2 mx-auto">
                        <QuestionMetricsChart
                          questionIndex={index}
                          experiments={allExperiments}
                          currentExperimentId={experimentId}
                          experimentOrder={experimentOrder}
                        />
                      </div>
                    )}

                    {/* Prompt i Response */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <div className="bg-gray-50 rounded-lg p-3">
                        <h4 className="text-sm font-medium text-gray-900 mb-2 flex items-center justify-between">
                          <span>{comparingStates[index] ? `Current Version Response (v${experimentOrder[experimentId]})` : 'Prompt'}</span>
                          {!expandedItems.has(`prompt-${index}`) && (
                            <span className="text-xs text-gray-500">(click to expand)</span>
                          )}
                        </h4>
                        <div 
                          className="cursor-pointer" 
                          onClick={() => toggleExpand(`prompt-${index}`)}
                        >
                          <div className={`content-container bg-white rounded p-3 border border-gray-200`}>
                            <div className={`markdown-content text-sm text-gray-700 ${
                              expandedItems.has(`prompt-${index}`) ? 'expanded-content' : 'prompt-scroll'
                            }`}>
                              <ReactMarkdown>
                                {comparingStates[index] ? result.response : result.prompt}
                              </ReactMarkdown>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <h4 className="text-sm font-medium text-gray-900 mb-2 flex items-center justify-between">
                          <span>{comparingStates[index] ? `Compared Version Response (v${experimentOrder[selectedVersions[index] || 'results_basic_prompts']})` : 'Response'}</span>
                          {!expandedItems.has(`response-${index}`) && (
                            <span className="text-xs text-gray-500">(click to expand)</span>
                          )}
                        </h4>
                        <div 
                          className="cursor-pointer" 
                          onClick={() => toggleExpand(`response-${index}`)}
                        >
                          <div className={`content-container bg-white rounded p-3 border border-gray-200`}>
                            <div className={`markdown-content text-sm text-gray-700 ${
                              expandedItems.has(`response-${index}`) ? 'expanded-content' : 'prompt-scroll'
                            }`}>
                              <ReactMarkdown>
                                {comparingStates[index] ? (getComparedResult(index)?.response || 'No response available') : result.response}
                              </ReactMarkdown>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Przycisk Show more/less dla normalnego widoku */}
                    <div className="flex justify-center mt-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleAllItems(index, 'normal');
                        }}
                        className="px-3 py-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-800 bg-white rounded-md shadow-sm border border-gray-200 hover:bg-gray-50 transition-colors duration-200 flex items-center space-x-2"
                      >
                        {(expandedItems.has(`prompt-${index}`) && expandedItems.has(`response-${index}`)) ? (
                          <>
                            <span>Show less</span>
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                            </svg>
                          </>
                        ) : (
                          <>
                            <span>Show more</span>
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
