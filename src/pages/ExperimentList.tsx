import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Experiment } from '../types/experiment';
import { loadAllExperiments } from '../data/experimentLoader';
import { formatMetricValue } from '../utils/formatters';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

// Mapowanie nazw eksperymentów na ich numery wersji
const experimentOrder: { [key: string]: number } = {
  'results_basic_prompts': 1,
  'results_perfect_prompts': 2,
  'results_perfect_prompts_no_ref': 3,
  'results_perfect_prompts_4o_no_ref': 4,
  'results_perfect_prompts_4o': 5
};

function calculatePercentageChange(current: number, previous: number): string {
  if (previous === 0) return '-';
  const change = ((current - previous) / previous) * 100;
  const sign = change > 0 ? '+' : '';
  return `${sign}${change.toFixed(1)}%`;
}

function MetricWithChange({ 
  current, 
  previous, 
  metric 
}: { 
  current: number; 
  previous: number | null; 
  metric: string;
}) {
  const formattedValue = formatMetricValue(current);
  if (previous === null) {
    return <div>{formattedValue}</div>;
  }

  const change = calculatePercentageChange(current, previous);
  const changeColor = current > previous ? 'text-green-600' : current < previous ? 'text-red-600' : 'text-gray-600';

  return (
    <div>
      <div>{formattedValue}</div>
      <div className={`text-xs ${changeColor}`}>
        {change}
      </div>
    </div>
  );
}

function getHighFaithfulnessStats(experiment: Experiment) {
  const validResults = experiment.results.filter(r => r.faithfulness !== -1);
  const highFaithfulnessResults = validResults.filter(r => r.faithfulness >= 0.85);
  
  return {
    highFaithfulness: highFaithfulnessResults.length,
    totalValid: validResults.length
  };
}

export default function ExperimentList() {
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: 'ascending' | 'descending';
  }>({ key: 'version', direction: 'ascending' });

  const fetchExperiments = async () => {
    try {
      setLoading(true);
      const data = await loadAllExperiments();
      // Sortuj eksperymenty chronologicznie
      const sortedData = data.sort((a, b) => 
        (experimentOrder[a.name] || 0) - (experimentOrder[b.name] || 0)
      );
      setExperiments(sortedData);
      setError(null);
    } catch (err) {
      console.error('Error loading experiments:', err);
      setError('Failed to load experiments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExperiments();
  }, []);

  const requestSort = (key: string) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const getSortedExperiments = () => {
    const sortedExperiments = [...experiments];
    sortedExperiments.sort((a, b) => {
      if (sortConfig.key === 'version') {
        const aOrder = experimentOrder[a.name] || 0;
        const bOrder = experimentOrder[b.name] || 0;
        return sortConfig.direction === 'ascending'
          ? aOrder - bOrder
          : bOrder - aOrder;
      }
      if (sortConfig.key === 'name') {
        return sortConfig.direction === 'ascending'
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name);
      }
      
      const aValue = a.metrics[sortConfig.key as keyof typeof a.metrics] || 0;
      const bValue = b.metrics[sortConfig.key as keyof typeof b.metrics] || 0;
      
      return sortConfig.direction === 'ascending'
        ? aValue - bValue
        : bValue - aValue;
    });
    return sortedExperiments;
  };

  const getChartData = () => {
    return experiments.map(exp => ({
      name: exp.name.replace('results_', '').replace(/_/g, ' '),
      correctness: exp.metrics.correctness * 100,
      correctness_weighted: exp.metrics.correctness_weighted * 100,
      faithfulness: exp.metrics.faithfulness * 100
    }));
  };

  if (loading) {
    return <div className="p-4">Loading experiments...</div>;
  }

  if (error) {
    return (
      <div className="p-4 text-red-600">
        {error}
        <button 
          onClick={fetchExperiments}
          className="ml-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Retry
        </button>
      </div>
    );
  }

  const sortedExperiments = getSortedExperiments();

  return (
    <div className="p-4">
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <h1 className="text-2xl font-bold">Experiments</h1>
          <button 
            onClick={fetchExperiments}
            className="px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm flex items-center gap-2"
            disabled={loading}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
        <div className="w-full overflow-x-auto">
          <LineChart width={800} height={400} data={getChartData()} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis domain={[0, 100]} />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="correctness" stroke="#8884d8" name="Correctness" />
            <Line type="monotone" dataKey="correctness_weighted" stroke="#82ca9d" name="Weighted Correctness" />
            <Line type="monotone" dataKey="faithfulness" stroke="#ffc658" name="Faithfulness" />
          </LineChart>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full bg-white">
          <thead>
            <tr>
              <th 
                className="px-6 py-3 border-b-2 border-gray-300 text-left text-xs leading-4 font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => requestSort('version')}
              >
                Version
              </th>
              <th 
                className="px-6 py-3 border-b-2 border-gray-300 text-left text-xs leading-4 font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => requestSort('name')}
              >
                Name
              </th>
              <th 
                className="px-6 py-3 border-b-2 border-gray-300 text-left text-xs leading-4 font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => requestSort('correctness')}
              >
                Correctness
              </th>
              <th 
                className="px-6 py-3 border-b-2 border-gray-300 text-left text-xs leading-4 font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => requestSort('correctness_weighted')}
              >
                Weighted Correctness
              </th>
              <th 
                className="px-6 py-3 border-b-2 border-gray-300 text-left text-xs leading-4 font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => requestSort('faithfulness')}
              >
                Faithfulness
              </th>
              <th className="px-6 py-3 border-b-2 border-gray-300 text-left text-xs leading-4 font-medium text-gray-500 uppercase tracking-wider">
                High Faithfulness ({'>'}85%)
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedExperiments.map((experiment, index) => {
              const previousExperiment = index > 0 ? sortedExperiments[index - 1] : null;
              return (
                <tr key={experiment.name} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-no-wrap border-b border-gray-300">
                    v{experimentOrder[experiment.name] || '?'}
                  </td>
                  <td className="px-6 py-4 whitespace-no-wrap border-b border-gray-300">
                    <Link to={`/experiment/${experiment.name}`} className="text-blue-600 hover:text-blue-900">
                      <div className="font-medium">{experiment.description}</div>
                      <div className="text-sm text-gray-500">{experiment.name}</div>
                    </Link>
                  </td>
                  <td className="px-6 py-4 whitespace-no-wrap border-b border-gray-300">
                    <MetricWithChange
                      current={experiment.metrics.correctness}
                      previous={previousExperiment?.metrics.correctness || null}
                      metric="correctness"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-no-wrap border-b border-gray-300">
                    <MetricWithChange
                      current={experiment.metrics.correctness_weighted}
                      previous={previousExperiment?.metrics.correctness_weighted || null}
                      metric="correctness_weighted"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-no-wrap border-b border-gray-300">
                    <MetricWithChange
                      current={experiment.metrics.faithfulness}
                      previous={previousExperiment?.metrics.faithfulness || null}
                      metric="faithfulness"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-no-wrap border-b border-gray-300">
                    {(() => {
                      const stats = getHighFaithfulnessStats(experiment);
                      return (
                        <div>
                          <div>{stats.highFaithfulness} out of {stats.totalValid} questions</div>
                        </div>
                      );
                    })()}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
