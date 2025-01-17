import React, { useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Experiment, ExperimentResult } from '../types/experiment';
import { loadExperiment, getExperimentOrder } from '../data/experimentLoader';
import { formatMetricValue } from '../utils/formatters';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, ResponsiveContainer, ReferenceArea, ReferenceLine, Tooltip } from 'recharts';
import MetricTooltip from '../components/MetricTooltip';
import ValidationStatusCard from '../components/ValidationStatusCard';
import ExperimentResults from '../components/ExperimentResults';

interface MetricDataPoint {
  questionNumber: number;
  correctness: number | null;
  correctness_weighted: number | null;
  faithfulness: number | null;
  prompt: string;
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: MetricDataPoint;
    name: string;
    value: number | null;
    fill: string;
  }>;
}

type MetricKey = 'correctness' | 'correctness_weighted' | 'faithfulness';

interface ExperimentInfo {
  name: string;
  description: string;
  version: number;
  path: string;
}

export default function ExperimentDetails() {
  const { experimentId } = useParams<{ experimentId: string }>();
  const [experiment, setExperiment] = useState<Experiment | null>(null);
  const [allExperiments, setAllExperiments] = useState<{ [key: string]: ExperimentResult[] }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [hoveredQuestion, setHoveredQuestion] = useState<number | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [visibleMetrics, setVisibleMetrics] = useState({
    correctness: true,
    correctness_weighted: true,
    faithfulness: true
  });
  const [experimentOrder, setExperimentOrder] = useState<{ [key: string]: number }>({});
  const [comparisonVersion, setComparisonVersion] = useState(
    experimentId === 'results_basic_prompts' ? 'results_perfect_prompts' : 'results_basic_prompts'
  );

  const resultsRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadData = async () => {
      if (experimentId) {
        try {
          setLoading(true);
          setError(null);

          // Załaduj kolejność eksperymentów
          const order = await getExperimentOrder();
          setExperimentOrder(order);

          // Załaduj główny eksperyment
          const mainExperiment = await loadExperiment(experimentId);
          if (!mainExperiment) {
            throw new Error('Failed to load main experiment');
          }
          setExperiment(mainExperiment);

          // Załaduj wszystkie eksperymenty
          const allVersions = Object.keys(order);
          const experimentsData: { [key: string]: ExperimentResult[] } = {};
          
          await Promise.all(allVersions.map(async (version: string) => {
            try {
              const versionData = await loadExperiment(version);
              if (versionData && versionData.results) {
                experimentsData[version] = versionData.results;
              }
            } catch (err) {
              console.error(`Error loading version ${version}:`, err);
            }
          }));

          setAllExperiments(experimentsData);
        } catch (err) {
          console.error('Error loading experiments:', err);
          setError('Failed to load experiment data. Please try again later.');
        } finally {
          setLoading(false);
        }
      }
    };

    loadData();
  }, [experimentId]);

  useEffect(() => {
    // Aktualizuj wersję porównawczą przy zmianie experimentId
    setComparisonVersion(
      experimentId === 'results_basic_prompts' ? 'results_perfect_prompts' : 'results_basic_prompts'
    );
  }, [experimentId]);

  const getFilteredResults = () => {
    if (!experiment) return [];
    return experiment.results.filter(result => 
      result.prompt.toLowerCase().includes(searchTerm.toLowerCase()) ||
      result.response.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const calculatePercentageChange = (current: number, previous: number): number => {
    if (previous === 0) return current > 0 ? 100 : 0; // Handle division by zero
    return ((current - previous) / previous) * 100;
  };

  const calculateMetricChanges = (currentResults: ExperimentResult[], previousResults: ExperimentResult[] | undefined) => {
    if (!previousResults || !currentResults) return { biggest_improvement: null, biggest_decline: null };

    const changes = currentResults.map((current, index) => {
      const previous = previousResults[index]; 
      if (!previous) return null;

      const correctnessValid = current.correctness !== -1 && previous.correctness !== -1;
      const weightedValid = current.correctness_weighted !== -1 && previous.correctness_weighted !== -1;
      const faithfulnessValid = current.faithfulness !== -1 && previous.faithfulness !== -1;

      const metricChanges = {
        questionNumber: index + 1,
        prompt: current.prompt,
        correctness: correctnessValid ? calculatePercentageChange(current.correctness, previous.correctness) : 0,
        correctness_weighted: weightedValid ? calculatePercentageChange(current.correctness_weighted, previous.correctness_weighted) : 0,
        faithfulness: faithfulnessValid ? calculatePercentageChange(current.faithfulness, previous.faithfulness) : 0,
        previous: {
          correctness: previous.correctness,
          correctness_weighted: previous.correctness_weighted,
          faithfulness: previous.faithfulness
        },
        current: {
          correctness: current.correctness,
          correctness_weighted: current.correctness_weighted,
          faithfulness: current.faithfulness
        }
      };

      let validMetrics = 0;
      let totalChange = 0;

      if (correctnessValid) {
        validMetrics++;
        totalChange += metricChanges.correctness;
      }
      if (weightedValid) {
        validMetrics++;
        totalChange += metricChanges.correctness_weighted;
      }
      if (faithfulnessValid) {
        validMetrics++;
        totalChange += metricChanges.faithfulness;
      }

      if (validMetrics === 0) return null;

      const avgChange = totalChange / validMetrics;
      return { ...metricChanges, avgChange };
    }).filter(change => change !== null);

    if (changes.length === 0) {
      return { biggest_improvement: null, biggest_decline: null };
    }

    const sortedChanges = changes.sort((a, b) => (b?.avgChange || 0) - (a?.avgChange || 0));
    
    return {
      biggest_improvement: sortedChanges[0] || null,
      biggest_decline: sortedChanges[sortedChanges.length - 1] || null,
    };
  };

  const getMetricsDistributionPieData = () => {
    if (!experiment) return [];

    const validResults = experiment.results.filter(r => 
      r.correctness !== -1 && 
      r.correctness_weighted !== -1 && 
      r.faithfulness !== -1
    );

    return [
      { name: 'Scored Questions', value: validResults.length, color: '#4ade80' },
      { name: 'Unscored Questions', value: experiment.results.length - validResults.length, color: '#f87171' }
    ];
  };

  const scrollToQuestion = (questionNumber: number) => {
    const questionElement = document.getElementById(`question-${questionNumber}`);
    if (questionElement) {
      questionElement.scrollIntoView({ behavior: 'smooth' });
      // Highlight the question temporarily
      questionElement.classList.add('bg-yellow-50');
      setTimeout(() => {
        questionElement.classList.remove('bg-yellow-50');
      }, 2000);
    }
  };

  const normalizeValue = (value: number) => Math.max(0, Math.min(1, value));

  const getMetricsChartData = (): MetricDataPoint[] => {
    if (!experiment) return [];
    
    return experiment.results.map((result, index) => ({
      questionNumber: index + 1,
      correctness: result.correctness === -1 ? null : normalizeValue(result.correctness),
      correctness_weighted: result.correctness_weighted === -1 ? null : normalizeValue(result.correctness_weighted),
      faithfulness: result.faithfulness === -1 ? null : normalizeValue(result.faithfulness),
      prompt: result.prompt
    }));
  };

  const handleMetricToggle = (metric: MetricKey) => {
    setVisibleMetrics(prev => ({
      ...prev,
      [metric]: !prev[metric]
    }));
  };

  const handleMouseEnter = (questionNumber: number, event: React.MouseEvent) => {
    const chartRect = chartRef.current?.getBoundingClientRect();
    if (chartRect) {
      setTooltipPosition({
        x: event.clientX - chartRect.left,
        y: event.clientY - chartRect.top
      });
    }
    setHoveredQuestion(questionNumber);
  };

  const handleMouseLeave = () => {
    setHoveredQuestion(null);
  };

  const handleMouseMove = (event: React.MouseEvent) => {
    if (hoveredQuestion !== null) {
      const chartRect = chartRef.current?.getBoundingClientRect();
      if (chartRect) {
        setTooltipPosition({
          x: event.clientX - chartRect.left,
          y: event.clientY - chartRect.top
        });
      }
    }
  };

  const getComparisonResults = () => {
    return allExperiments[comparisonVersion] || [];
  };

  const filteredResults = getFilteredResults();

  return (
    <div className="p-8">
      {/* Breadcrumbs */}
      <nav className="flex mb-8" aria-label="Breadcrumb">
        <ol className="inline-flex items-center space-x-1 md:space-x-3">
          <li className="inline-flex items-center">
            <Link to="/" className="inline-flex items-center text-sm font-medium text-gray-700 hover:text-blue-600">
              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"></path>
              </svg>
              Experiments
            </Link>
          </li>
          <li>
            <div className="flex items-center">
              <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd"></path>
              </svg>
              <span className="ml-1 text-sm font-medium text-gray-500 md:ml-2">{experiment?.description}</span>
            </div>
          </li>
        </ol>
      </nav>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">{experiment?.description}</h1>
        <div className="text-gray-600 mt-2">Version: {experiment?.name}</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center mb-4">
            <h3 className="text-lg font-semibold">Correctness</h3>
            <div className="relative group ml-2">
              <div className="text-gray-400 hover:text-gray-600 cursor-help">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="hidden group-hover:block absolute z-10 w-80 p-2 mt-1 text-sm bg-gray-900 text-white rounded shadow-lg">
                Basic metric evaluating the correctness of answers. Each correctness is scored as either incorrect or correct on scale 0-100%. 
                The final score is the average of all questions correctness scores, shown as a percentage. If there were no data to prove 
                question correctness then it is shown as non available.
              </div>
            </div>
          </div>
          <div className="text-3xl font-bold text-blue-600">
            {experiment && formatMetricValue(experiment.metrics.correctness)}
          </div>
          <div className="text-sm text-gray-500 mt-2">
            Average score across {experiment?.results.filter(r => r.correctness !== -1).length} scored questions
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center mb-4">
            <h3 className="text-lg font-semibold">Weighted Correctness</h3>
            <div className="relative group ml-2">
              <div className="text-gray-400 hover:text-gray-600 cursor-help">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="hidden group-hover:block absolute z-10 w-80 p-2 mt-1 text-sm bg-gray-900 text-white rounded shadow-lg">
                Advanced metric evaluating the correctness of answers with importance weights. Each correctness is scored as either incorrect 
                or correct on scale 0-100% and multiplied by its importance weight. The final score is the weighted average of all questions 
                correctness scores. If there were no data to prove question correctness then it is shown as non available.
              </div>
            </div>
          </div>
          <div className="text-3xl font-bold text-blue-600">
            {experiment && formatMetricValue(experiment.metrics.correctness_weighted)}
          </div>
          <div className="text-sm text-gray-500 mt-2">
            Weighted average score across {experiment?.results.filter(r => r.correctness_weighted !== -1).length} scored questions
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center mb-4">
            <h3 className="text-lg font-semibold">Faithfulness</h3>
            <div className="relative group ml-2">
              <div className="text-gray-400 hover:text-gray-600 cursor-help">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="hidden group-hover:block absolute z-10 w-80 p-2 mt-1 text-sm bg-gray-900 text-white rounded shadow-lg">
                Metric evaluating how well answers stick to provided context. Each answer is scored on scale 0-100% based on how much it 
                relies on given context versus making up information. The final score is the average of all questions faithfulness scores. 
                If there were no data to evaluate faithfulness then it is shown as non available.
              </div>
            </div>
          </div>
          <div className="text-3xl font-bold text-blue-600">
            {experiment && formatMetricValue(experiment.metrics.faithfulness)}
          </div>
          <div className="text-sm text-gray-500 mt-2">
            Average faithfulness score across {experiment?.results.filter(r => r.faithfulness !== -1).length} scored questions
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Panel z wykresem */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Metrics Progression</h3>
          <div className="flex justify-center gap-8 mb-4">
            <button
              className={`text-sm font-medium cursor-pointer ${!visibleMetrics.correctness ? 'opacity-50' : ''}`}
              onClick={() => handleMetricToggle('correctness')}
            >
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#3b82f6]"></div>
                Correctness
              </div>
            </button>
            <button
              className={`text-sm font-medium cursor-pointer ${!visibleMetrics.correctness_weighted ? 'opacity-50' : ''}`}
              onClick={() => handleMetricToggle('correctness_weighted')}
            >
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#22c55e]"></div>
                Weighted Correctness
              </div>
            </button>
            <button
              className={`text-sm font-medium cursor-pointer ${!visibleMetrics.faithfulness ? 'opacity-50' : ''}`}
              onClick={() => handleMetricToggle('faithfulness')}
            >
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#a855f7]"></div>
                Faithfulness
              </div>
            </button>
          </div>
          <div className="relative" onMouseMove={handleMouseMove} ref={chartRef}>
            <ResponsiveContainer width="100%" height={300}>
              <ScatterChart
                margin={{
                  top: 20,
                  right: 20,
                  bottom: 20,
                  left: 20,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="questionNumber" 
                  type="number"
                  domain={[0, getMetricsChartData().length + 1]}
                  hide={false}
                  label={{ value: 'Question Number', position: 'bottom', offset: 5 }}
                  tick={{ fontSize: 12 }}
                />
                <YAxis 
                  type="number" 
                  domain={[0, 1]}
                  label={{ value: 'Score', angle: -90, position: 'insideLeft', offset: 10 }}
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => `${(value * 100).toFixed(0)}%`}
                  allowDataOverflow={false}
                />
                {/* Stałe pionowe linie pomocnicze */}
                {getMetricsChartData().map((data) => (
                  <ReferenceLine
                    key={`line-${data.questionNumber}`}
                    x={data.questionNumber}
                    stroke="#e5e7eb"
                    strokeWidth={1}
                    strokeDasharray="3 3"
                  />
                ))}
                {/* Obszary hover */}
                {getMetricsChartData().map((data) => (
                  <ReferenceArea
                    key={data.questionNumber}
                    x1={data.questionNumber - 0.5}
                    x2={data.questionNumber + 0.5}
                    y1={0}
                    y2={1}
                    fill={hoveredQuestion === data.questionNumber ? "#94a3b8" : "transparent"}
                    fillOpacity={hoveredQuestion === data.questionNumber ? 0.15 : 0}
                    onMouseEnter={(e: any) => handleMouseEnter(data.questionNumber, e)}
                    onMouseLeave={handleMouseLeave}
                    onClick={() => scrollToQuestion(data.questionNumber)}
                    className="cursor-pointer"
                  />
                ))}
                {visibleMetrics.correctness && (
                  <Scatter
                    name="Correctness"
                    data={getMetricsChartData()}
                    dataKey="correctness"
                    fill="#3b82f6"
                    cursor="pointer"
                    shape="circle"
                    legendType="none"
                  />
                )}
                {visibleMetrics.correctness_weighted && (
                  <Scatter
                    name="Weighted Correctness"
                    data={getMetricsChartData()}
                    dataKey="correctness_weighted"
                    fill="#22c55e"
                    cursor="pointer"
                    shape="circle"
                    legendType="none"
                  />
                )}
                {visibleMetrics.faithfulness && (
                  <Scatter
                    name="Faithfulness"
                    data={getMetricsChartData()}
                    dataKey="faithfulness"
                    fill="#a855f7"
                    cursor="pointer"
                    shape="circle"
                    legendType="none"
                  />
                )}
              </ScatterChart>
            </ResponsiveContainer>
            {hoveredQuestion && (
              <div 
                className="absolute pointer-events-none z-50"
                style={{ 
                  left: tooltipPosition.x + 15,
                  top: tooltipPosition.y - 100,
                }}
              >
                <MetricTooltip 
                  active={true} 
                  payload={[{ 
                    payload: getMetricsChartData().find(d => d.questionNumber === hoveredQuestion) 
                  }]} 
                />
              </div>
            )}
          </div>
          <div className="mt-4 text-sm text-gray-600 flex justify-center gap-6">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
              </svg>
              <span>Click on a question area to navigate to its details</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span>Click on metric labels above to toggle their visibility</span>
            </div>
          </div>
        </div>

        {/* Panel z informacjami o największych zmianach */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center gap-2 mb-4">
            <h3 className="text-lg font-semibold">Metrics Changes Highlights (compared to</h3>
            <select
              className="text-sm border rounded-md py-1 px-2"
              value={comparisonVersion}
              onChange={(e) => setComparisonVersion(e.target.value)}
            >
              {Object.entries(experimentOrder)
                .filter(([key]) => key !== experimentId)
                .map(([key, value]) => (
                  <option key={key} value={key}>
                    Version {value}
                  </option>
                ))}
            </select>
            <h3 className="text-lg font-semibold">)</h3>
          </div>
          {experiment && (
            <div className="space-y-6">
              {(() => {
                const changes = calculateMetricChanges(experiment.results, getComparisonResults());
                return (
                  <>
                    <div className="space-y-2">
                      <div className="flex items-center">
                        <h4 className="font-medium text-green-600">Biggest Improvement</h4>
                        <div className="relative group ml-2">
                          <div className="text-gray-400 hover:text-gray-600 cursor-help">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          <div className="hidden group-hover:block absolute z-10 w-80 p-2 mt-1 text-sm bg-gray-900 text-white rounded shadow-lg">
                            Question with the highest percentage improvement compared to the previous version. 
                            The change is calculated as a percentage change for each metric ((current - previous) / previous * 100%) 
                            and averaged across valid metrics. For example, a change from 60% to 80% is shown as +33.33% increase.
                          </div>
                        </div>
                      </div>
                      {changes.biggest_improvement ? (
                        <div className="bg-green-50 p-4 rounded">
                          <p className="text-sm font-medium mb-2">Question #{changes.biggest_improvement.questionNumber}</p>
                          <div className="grid grid-cols-3 gap-2 text-sm">
                            <div>
                              <span className="text-gray-600">Correctness:</span>
                              <div className="flex items-center">
                                <span className={`${changes.biggest_improvement.correctness > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {changes.biggest_improvement.correctness > 0 ? '+' : ''}
                                  {changes.biggest_improvement.correctness.toFixed(1)}%
                                </span>
                                <span className="text-gray-500 ml-1">
                                  ({formatMetricValue(changes.biggest_improvement.previous.correctness)} → {formatMetricValue(changes.biggest_improvement.current.correctness)})
                                </span>
                              </div>
                            </div>
                            <div>
                              <span className="text-gray-600">Weighted:</span>
                              <div className="flex items-center">
                                <span className={`${changes.biggest_improvement.correctness_weighted > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {changes.biggest_improvement.correctness_weighted > 0 ? '+' : ''}
                                  {changes.biggest_improvement.correctness_weighted.toFixed(1)}%
                                </span>
                                <span className="text-gray-500 ml-1">
                                  ({formatMetricValue(changes.biggest_improvement.previous.correctness_weighted)} → {formatMetricValue(changes.biggest_improvement.current.correctness_weighted)})
                                </span>
                              </div>
                            </div>
                            <div>
                              <span className="text-gray-600">Faithfulness:</span>
                              <div className="flex items-center">
                                <span className={`${changes.biggest_improvement.faithfulness > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {changes.biggest_improvement.faithfulness > 0 ? '+' : ''}
                                  {changes.biggest_improvement.faithfulness.toFixed(1)}%
                                </span>
                                <span className="text-gray-500 ml-1">
                                  ({formatMetricValue(changes.biggest_improvement.previous.faithfulness)} → {formatMetricValue(changes.biggest_improvement.current.faithfulness)})
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">No improvements found</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center">
                        <h4 className="font-medium text-red-600">Biggest Decline</h4>
                        <div className="relative group ml-2">
                          <div className="text-gray-400 hover:text-gray-600 cursor-help">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          <div className="hidden group-hover:block absolute z-10 w-80 p-2 mt-1 text-sm bg-gray-900 text-white rounded shadow-lg">
                            Question with the biggest percentage decline compared to the previous version. 
                            The change is calculated as a percentage change for each metric ((current - previous) / previous * 100%) 
                            and averaged across valid metrics. For example, a change from 90% to 70% is shown as -22.22% decrease.
                          </div>
                        </div>
                      </div>
                      {changes.biggest_decline ? (
                        <div className="bg-red-50 p-4 rounded">
                          <p className="text-sm font-medium mb-2">Question #{changes.biggest_decline.questionNumber}</p>
                          <div className="grid grid-cols-3 gap-2 text-sm">
                            <div>
                              <span className="text-gray-600">Correctness:</span>
                              <div className="flex items-center">
                                <span className={`${changes.biggest_decline.correctness > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {changes.biggest_decline.correctness > 0 ? '+' : ''}
                                  {changes.biggest_decline.correctness.toFixed(1)}%
                                </span>
                                <span className="text-gray-500 ml-1">
                                  ({formatMetricValue(changes.biggest_decline.previous.correctness)} → {formatMetricValue(changes.biggest_decline.current.correctness)})
                                </span>
                              </div>
                            </div>
                            <div>
                              <span className="text-gray-600">Weighted:</span>
                              <div className="flex items-center">
                                <span className={`${changes.biggest_decline.correctness_weighted > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {changes.biggest_decline.correctness_weighted > 0 ? '+' : ''}
                                  {changes.biggest_decline.correctness_weighted.toFixed(1)}%
                                </span>
                                <span className="text-gray-500 ml-1">
                                  ({formatMetricValue(changes.biggest_decline.previous.correctness_weighted)} → {formatMetricValue(changes.biggest_decline.current.correctness_weighted)})
                                </span>
                              </div>
                            </div>
                            <div>
                              <span className="text-gray-600">Faithfulness:</span>
                              <div className="flex items-center">
                                <span className={`${changes.biggest_decline.faithfulness > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {changes.biggest_decline.faithfulness > 0 ? '+' : ''}
                                  {changes.biggest_decline.faithfulness.toFixed(1)}%
                                </span>
                                <span className="text-gray-500 ml-1">
                                  ({formatMetricValue(changes.biggest_decline.previous.faithfulness)} → {formatMetricValue(changes.biggest_decline.current.faithfulness)})
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">No declines found</p>
                      )}
                    </div>
                  </>
                );
              })()}
            </div>
          )}
          {!experiment && (
            <p className="text-sm text-gray-500">No experiment data available</p>
          )}
        </div>
      </div>

      {/* Panel walidacji */}
      {experiment && (
        <div className="mb-4">
          <ValidationStatusCard validation={experiment.rawData.dataValidation} />
        </div>
      )}

      {/* Panel z wynikami */}
      {experiment && (
        <ExperimentResults
          results={experiment.results}
          previousResults={getComparisonResults()}
          currentVersion={`v${experimentOrder[experimentId || ''] || '?'}`}
          previousVersion={comparisonVersion ? `v${experimentOrder[comparisonVersion] || '?'}` : undefined}
          experimentId={experimentId || ''}
          allExperiments={allExperiments}
        />
      )}
    </div>
  );
}
