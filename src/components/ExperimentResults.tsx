import React, { useState } from 'react';
import { ExperimentResult } from '../types/experiment';

interface ExperimentResultsProps {
  results: ExperimentResult[];
  previousResults?: ExperimentResult[];
}

const formatMetricValue = (value: number): string => {
  return value.toFixed(2);
};

const calculateChange = (current: number, previous?: number): { percentage: number; absolute: number } | null => {
  if (previous === undefined || previous === -1 || current === -1) return null;
  
  const change = {
    percentage: ((current - previous) / previous) * 100,
    absolute: current - previous
  };

  console.log(`
    Current: ${current}
    Previous: ${previous}
    Absolute change: ${change.absolute}
    Percentage: ${change.percentage}%
    Raw calculation: (${current} - ${previous}) / ${previous} * 100
  `);

  return change;
};

const MetricChange = ({ change }: { change: { percentage: number; absolute: number } | null }) => {
  if (!change) return null;

  const changeColor = change.percentage > 0 ? 'text-green-600' : 'text-red-600';
  const arrow = change.percentage > 0 ? '↑' : '↓';
  
  return (
    <div className={`text-sm ${changeColor} mt-1`}>
      {arrow} {Math.abs(change.percentage).toFixed(1)}%
      <span className="ml-1 text-gray-500">
        ({change.absolute > 0 ? '+' : ''}{change.absolute.toFixed(2)})
      </span>
    </div>
  );
};

export default function ExperimentResults({ results, previousResults }: ExperimentResultsProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const filteredResults = results.filter(
    (result) =>
      result.prompt.toLowerCase().includes(searchTerm.toLowerCase()) ||
      result.response.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getMetricColor = (value: number) => {
    if (value === -1) return 'text-gray-400';
    if (value >= 0.8) return 'text-green-600';
    if (value >= 0.5) return 'text-yellow-600';
    return 'text-red-600';
  };

  const toggleExpand = (itemId: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedItems(newExpanded);
  };

  const ContentBox = ({ content, isExpanded, onToggle }: { content: string, isExpanded: boolean, onToggle: () => void }) => (
    <div className="relative">
      <div className={`bg-gray-50 p-4 rounded-lg text-gray-700 ${!isExpanded ? 'max-h-[200px]' : ''} overflow-hidden`}>
        <div className={!isExpanded ? 'mask-linear-gradient' : ''}>
          {content}
        </div>
      </div>
      <button
        onClick={onToggle}
        className="mt-2 text-sm text-indigo-600 hover:text-indigo-800 font-medium flex items-center"
      >
        {isExpanded ? (
          <>
            Show less
            <svg className="w-4 h-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          </>
        ) : (
          <>
            Show more
            <svg className="w-4 h-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </>
        )}
      </button>
    </div>
  );

  return (
    <div className="bg-white rounded-lg shadow">
      <style>
        {`
          .mask-linear-gradient {
            mask-image: linear-gradient(to bottom, black calc(100% - 40px), transparent 100%);
            -webkit-mask-image: linear-gradient(to bottom, black calc(100% - 40px), transparent 100%);
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
                <div className="border-b bg-gray-50">
                  <div className="px-6 py-3">
                    <div className="mx-[15%] flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-gray-900">
                        Question {index + 1}
                      </h3>
                      <div className="flex items-center justify-center flex-1 space-x-12 px-8">
                        <div className="text-center">
                          <div className="text-sm font-medium text-gray-500">Correctness</div>
                          <div className={`text-xl font-bold ${getMetricColor(result.correctness)}`}>
                            {result.correctness === -1 ? '—' : formatMetricValue(result.correctness)}
                          </div>
                          <MetricChange change={correctnessChange} />
                        </div>
                        <div className="text-center border-x px-12">
                          <div className="text-sm font-medium text-gray-500">Weighted Score</div>
                          <div className={`text-xl font-bold ${getMetricColor(result.correctness_weighted)}`}>
                            {result.correctness_weighted === -1 ? '—' : formatMetricValue(result.correctness_weighted)}
                          </div>
                          <MetricChange change={weightedChange} />
                        </div>
                        <div className="text-center">
                          <div className="text-sm font-medium text-gray-500">Faithfulness</div>
                          <div className={`text-xl font-bold ${getMetricColor(result.faithfulness)}`}>
                            {result.faithfulness === -1 ? '—' : formatMetricValue(result.faithfulness)}
                          </div>
                          <MetricChange change={faithfulnessChange} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Treść w dwóch kolumnach */}
                <div className="grid grid-cols-2 gap-6 p-6">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Prompt</h4>
                    <ContentBox 
                      content={result.prompt}
                      isExpanded={expandedItems.has(`prompt-${index}`)}
                      onToggle={() => toggleExpand(`prompt-${index}`)}
                    />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Response</h4>
                    <ContentBox 
                      content={result.response}
                      isExpanded={expandedItems.has(`response-${index}`)}
                      onToggle={() => toggleExpand(`response-${index}`)}
                    />
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
