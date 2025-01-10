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
    <div className={`bg-gray-50 p-4 rounded-lg text-gray-700 transition-all duration-200 ${!isExpanded ? 'max-h-[200px] cursor-pointer hover:bg-gray-100' : ''} overflow-hidden`}>
      <div className={!isExpanded ? 'mask-linear-gradient' : ''}>
        <div className="markdown-content">
          <ReactMarkdown 
            className="text-sm text-gray-700 markdown-content"
          >
            {content}
          </ReactMarkdown>
        </div>
      </div>
      {!isExpanded && (
        <div className="absolute bottom-0 left-0 right-0 text-center text-gray-500 text-sm py-2 bg-gradient-to-t from-gray-50 pointer-events-none">
          •••
        </div>
      )}
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

  const filteredResults = results.filter(
    (result) =>
      result.prompt.toLowerCase().includes(searchTerm.toLowerCase()) ||
      result.response.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCompareStart = (index: number) => {
    setComparingStates(prev => ({ ...prev, [index]: true }));
    // Jeśli jesteśmy w V1, porównuj z V2, w przeciwnym razie z V1
    const defaultVersion = experimentId === 'results_basic_prompts' ? 
      'results_perfect_prompts' : // V2
      'results_basic_prompts';   // V1
    setSelectedVersions(prev => ({ ...prev, [index]: defaultVersion }));
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
    if (newExpanded.has(`prompt-${itemId}`)) {
      newExpanded.delete(`prompt-${itemId}`);
      newExpanded.delete(`response-${itemId}`);
    } else {
      newExpanded.add(`prompt-${itemId}`);
      newExpanded.add(`response-${itemId}`);
    }
    setExpandedItems(newExpanded);
  };

  const getMetricColor = (value: number) => {
    if (value === -1) return 'text-gray-400';
    if (value >= 0.85) return 'text-green-600';
    if (value >= 0.50) return 'text-yellow-600';
    return 'text-red-600';
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
    const newShowingMetricsChart = { ...showingMetricsChart };
    newShowingMetricsChart[index] = !showingMetricsChart[index];
    setShowingMetricsChart(newShowingMetricsChart);
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <style>
        {`
          .mask-linear-gradient {
            mask-image: linear-gradient(to bottom, black calc(100% - 40px), transparent 100%);
            -webkit-mask-image: linear-gradient(to bottom, black calc(100% - 40px), transparent 100%);
          }
          .markdown-content {
            font-size: 0.875rem;
            line-height: 1.5;
          }
          .markdown-content h1 {
            font-size: 1.5rem;
            font-weight: 600;
            margin-top: 1rem;
            margin-bottom: 0.5rem;
          }
          .markdown-content h2 {
            font-size: 1.25rem;
            font-weight: 600;
            margin-top: 1rem;
            margin-bottom: 0.5rem;
          }
          .markdown-content h3 {
            font-size: 1.125rem;
            font-weight: 600;
            margin-top: 1rem;
            margin-bottom: 0.5rem;
          }
          .markdown-content p {
            margin-bottom: 0.75rem;
          }
          .markdown-content ul, .markdown-content ol {
            margin-left: 1.5rem;
            margin-bottom: 0.75rem;
          }
          .markdown-content ul {
            list-style-type: disc;
          }
          .markdown-content ol {
            list-style-type: decimal;
          }
          .markdown-content code {
            background-color: #f3f4f6;
            padding: 0.2em 0.4em;
            border-radius: 0.25rem;
            font-family: monospace;
          }
          .markdown-content pre {
            background-color: #f3f4f6;
            padding: 1rem;
            border-radius: 0.375rem;
            overflow-x: auto;
            margin-bottom: 0.75rem;
          }
          .markdown-content pre code {
            background-color: transparent;
            padding: 0;
          }
          .markdown-content strong {
            font-weight: 600;
          }
          .markdown-content em {
            font-style: italic;
          }
          .markdown-content a {
            color: #3b82f6;
            text-decoration: underline;
          }
          .markdown-content blockquote {
            border-left: 4px solid #e5e7eb;
            padding-left: 1rem;
            margin-left: 0;
            margin-right: 0;
            font-style: italic;
          }
          .prompt-scroll {
            max-height: 150px;
            overflow-y: auto;
            padding-right: 16px;
            position: relative;
            display: block;
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
          .markdown-content > *:first-child {
            margin-top: 0;
          }
          .markdown-content > *:last-child {
            margin-bottom: 0;
          }
        `}
      </style>
      <div className="p-6">
        {/* Nagłówek */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Results</h2>
          <div className="text-sm text-gray-500">
            Showing {filteredResults.length} of {results.length} results
          </div>
        </div>

        {/* Wyszukiwarka */}
        <div className="mb-6">
          <div className="relative">
            <input
              type="text"
              placeholder="Search in prompts and responses..."
              className="w-full px-4 py-2 pl-10 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Lista wyników */}
        <div className="space-y-6">
          {filteredResults.map((result, index) => {
            const previousResult = previousResults?.[index];
            const correctnessChange = calculateChange(result.correctness, previousResult?.correctness);
            const weightedChange = calculateChange(result.correctness_weighted, previousResult?.correctness_weighted);
            const faithfulnessChange = calculateChange(result.faithfulness, previousResult?.faithfulness);

            return (
              <div 
                key={index} 
                className="border rounded-lg overflow-hidden bg-white"
                id={`question-${index + 1}`}
              >
                {/* Nagłówek z metrykami */}
                <div className="border-b bg-gray-50 relative">
                  <div className="px-6 py-3">
                    <div className={`mx-[15%] flex items-center transition-all duration-300 ${comparingStates[index] ? 'opacity-0 absolute inset-0' : ''}`}>
                      <h3 className="text-lg font-semibold text-gray-900 w-32">
                        Question {index + 1}
                      </h3>
                      <div className="flex-1 flex items-center justify-center space-x-12">
                        <div className="text-center">
                          <div className="text-sm font-medium text-gray-500">Correctness</div>
                          <div className={`text-xl font-bold ${getMetricColor(result.correctness)}`}>
                            {result.correctness === -1 ? '—' : formatMetricValueUtil(result.correctness)}
                          </div>
                        </div>
                        <div className="text-center border-x px-12">
                          <div className="text-sm font-medium text-gray-500">Weighted Score</div>
                          <div className={`text-xl font-bold ${getMetricColor(result.correctness_weighted)}`}>
                            {result.correctness_weighted === -1 ? '—' : formatMetricValueUtil(result.correctness_weighted)}
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm font-medium text-gray-500">Faithfulness</div>
                          <div className={`text-xl font-bold ${getMetricColor(result.faithfulness)}`}>
                            {result.faithfulness === -1 ? '—' : formatMetricValueUtil(result.faithfulness)}
                          </div>
                        </div>
                      </div>
                      <div className="w-32 flex justify-end gap-2">
                        <button
                          onClick={() => toggleMetricsChart(index)}
                          className="w-[400px] px-6 py-2 bg-indigo-600 text-white rounded-md shadow-sm text-base font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 flex items-center justify-center whitespace-nowrap"
                        >
                          <div className="flex items-center gap-3">
                            {showingMetricsChart[index] ? (
                              <>
                                <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                                <span>Close metrics progression</span>
                              </>
                            ) : (
                              <>
                                <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                                <span>Show metrics progression</span>
                              </>
                            )}
                          </div>
                        </button>
                        <CompareVersions 
                          currentExperimentId={experimentId}
                          questionNumber={index + 1}
                          onCompareStart={() => handleCompareStart(index)}
                          onVersionSelect={(versionId) => handleVersionSelect(index, versionId)}
                          onCompareEnd={() => handleCompareEnd(index)}
                          isComparing={comparingStates[index] || false}
                        />
                      </div>
                    </div>
                    {showingMetricsChart[index] && !comparingStates[index] && (
                      <div className="mx-[15%] mt-4">
                        <QuestionMetricsChart 
                          experimentOrder={experimentOrder}
                          experiments={allExperiments}
                          questionIndex={index}
                          currentExperimentId={experimentId}
                        />
                      </div>
                    )}
                    {comparingStates[index] && (
                      <div className="mx-[15%] transition-all duration-300">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-lg font-semibold text-gray-900">
                            Comparing responses for Question {index + 1}
                          </h3>
                          <CompareVersions 
                            currentExperimentId={experimentId}
                            questionNumber={index + 1}
                            onCompareStart={() => handleCompareStart(index)}
                            onVersionSelect={(versionId) => handleVersionSelect(index, versionId)}
                            onCompareEnd={() => handleCompareEnd(index)}
                            isComparing={true}
                          />
                        </div>
                        <div className="mx-[15%] mb-4">
                          <QuestionMetricsChart
                            experimentOrder={experimentOrder}
                            experiments={allExperiments}
                            questionIndex={index}
                            currentExperimentId={experimentId}
                          />
                        </div>
                        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 shadow-sm mb-3">
                          <div className="font-medium mb-2">Prompt:</div>
                          <div className="prompt-scroll">
                            <ReactMarkdown className="text-sm text-gray-700 markdown-content">
                              {result.prompt}
                            </ReactMarkdown>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-6 mb-4 bg-white rounded-lg p-4 shadow-sm">
                          <div className="text-center">
                            <div className="text-sm font-medium text-gray-500 mb-2">Correctness</div>
                            <div className="flex items-center justify-center space-x-4">
                              <div>
                                <div className={`text-xl font-bold ${getMetricColor(result.correctness)}`}>
                                  {result.correctness === -1 ? '—' : formatMetricValueUtil(result.correctness)}
                                </div>
                                <div className="text-sm text-gray-500">{currentVersion}</div>
                              </div>
                              <div className="text-lg text-gray-400">→</div>
                              <div>
                                <div className={`text-xl font-bold ${getMetricColor(getComparedResult(index)?.correctness || -1)}`}>
                                  {getComparedResult(index)?.correctness === undefined ? '—' : formatMetricValueUtil(getComparedResult(index)?.correctness || 0)}
                                </div>
                                <div className="text-sm text-gray-500">v{experimentOrder[selectedVersions[index] || 'results_basic_prompts']}</div>
                              </div>
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-sm font-medium text-gray-500 mb-2">Weighted Score</div>
                            <div className="flex items-center justify-center space-x-4">
                              <div>
                                <div className={`text-xl font-bold ${getMetricColor(result.correctness_weighted)}`}>
                                  {result.correctness_weighted === -1 ? '—' : formatMetricValueUtil(result.correctness_weighted)}
                                </div>
                                <div className="text-sm text-gray-500">{currentVersion}</div>
                              </div>
                              <div className="text-lg text-gray-400">→</div>
                              <div>
                                <div className={`text-xl font-bold ${getMetricColor(getComparedResult(index)?.correctness_weighted || -1)}`}>
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
                                <div className={`text-xl font-bold ${getMetricColor(result.faithfulness)}`}>
                                  {result.faithfulness === -1 ? '—' : formatMetricValueUtil(result.faithfulness)}
                                </div>
                                <div className="text-sm text-gray-500">{currentVersion}</div>
                              </div>
                              <div className="text-lg text-gray-400">→</div>
                              <div>
                                <div className={`text-xl font-bold ${getMetricColor(getComparedResult(index)?.faithfulness || -1)}`}>
                                  {getComparedResult(index)?.faithfulness === undefined ? '—' : formatMetricValueUtil(getComparedResult(index)?.faithfulness || 0)}
                                </div>
                                <div className="text-sm text-gray-500">v{experimentOrder[selectedVersions[index] || 'results_basic_prompts']}</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Treść w dwóch kolumnach */}
                <div className="p-6 space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="bg-white rounded-lg shadow-sm p-4">
                      <h4 className="font-medium text-gray-900 mb-3 flex items-center justify-between">
                        {comparingStates[index] ? 'Current Response' : 'Prompt'}
                        {!expandedItems.has(`prompt-${index}`) && (
                          <span className="text-xs text-gray-500">(click to expand)</span>
                        )}
                      </h4>
                      <div 
                        className="cursor-pointer" 
                        onClick={() => toggleExpand(`${index}`)}
                      >
                        <ContentBox 
                          content={comparingStates[index] ? result.response : result.prompt}
                          isExpanded={expandedItems.has(`prompt-${index}`)}
                        />
                      </div>
                    </div>
                    <div className="bg-white rounded-lg shadow-sm p-4">
                      <h4 className="font-medium text-gray-900 mb-3 flex items-center justify-between">
                        {comparingStates[index] ? 'Compared Response' : 'Response'}
                        {!expandedItems.has(`response-${index}`) && (
                          <span className="text-xs text-gray-500">(click to expand)</span>
                        )}
                      </h4>
                      <div 
                        className="cursor-pointer" 
                        onClick={() => toggleExpand(`${index}`)}
                      >
                        <ContentBox 
                          content={comparingStates[index] ? (getComparedResult(index)?.response || 'No response available') : result.response}
                          isExpanded={expandedItems.has(`response-${index}`)}
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-center">
                    <button
                      onClick={() => toggleExpand(`${index}`)}
                      className="px-4 py-2 text-sm font-medium text-indigo-600 hover:text-indigo-800 bg-white rounded-md shadow-sm border border-gray-200 hover:bg-gray-50 transition-colors duration-200 flex items-center space-x-2"
                    >
                      {expandedItems.has(`prompt-${index}`) ? (
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
            );
          })}
        </div>
      </div>
    </div>
  );
}
