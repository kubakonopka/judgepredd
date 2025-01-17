import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Experiment } from '../types/experiment';
import { loadAllExperiments } from '../data/experimentLoader';
import { formatMetricValue } from '../utils/formatters';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { experimentOrder } from '../constants';

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

const CustomTooltip: React.FC<any> = ({ active, payload, label }) => {
  if (!active || !payload) return null;

  const metrics = [
    { name: 'Correctness', value: payload[0]?.value, color: '#3b82f6' },
    { name: 'Weighted Correctness', value: payload[1]?.value, color: '#10b981' },
    { name: 'Faithfulness', value: payload[2]?.value, color: '#f59e0b' }
  ];

  return (
    <div className="bg-white p-3 border rounded shadow-lg text-sm">
      <p className="font-medium mb-2">{label}</p>
      <div className="space-y-1">
        {metrics.map((metric, idx) => (
          <div key={idx} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: metric.color }}></div>
              <span>{metric.name}:</span>
            </div>
            <span className="font-medium">
              {metric.value === undefined ? 'N/A' : `${metric.value.toFixed(1)}%`}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

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
      <div className="flex justify-center mb-4">
        <h1 className="text-2xl font-bold">JudgePredd Proof of Concept Results - HALT USE CASE</h1>
      </div>

      <div className="flex flex-col items-center mb-8">
        <h2 className="text-xl font-semibold mb-4">Metrics Progression Across Versions</h2>
        <div className="w-full overflow-x-auto flex justify-center">
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={getChartData()} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={true} horizontal={true} />
              <XAxis 
                dataKey="name" 
                padding={{ left: 30, right: 30 }}
                tick={{ fill: '#4B5563' }}
              />
              <YAxis 
                domain={[0, 100]} 
                tick={{ fill: '#4B5563' }}
                tickFormatter={(value) => `${value}%`}
              />
              <Tooltip 
                content={<CustomTooltip />}
              />
              <Legend 
                verticalAlign="top" 
                height={36}
                wrapperStyle={{
                  paddingTop: '10px'
                }}
              />
              <Line 
                type="monotone" 
                dataKey="correctness" 
                stroke="#3b82f6" 
                name="Correctness"
                strokeWidth={2}
                dot={{ fill: '#3b82f6', r: 4 }}
                activeDot={{ r: 6 }}
              />
              <Line 
                type="monotone" 
                dataKey="correctness_weighted" 
                stroke="#10b981" 
                name="Weighted Correctness"
                strokeWidth={2}
                dot={{ fill: '#10b981', r: 4 }}
                activeDot={{ r: 6 }}
              />
              <Line 
                type="monotone" 
                dataKey="faithfulness" 
                stroke="#f59e0b" 
                name="Faithfulness"
                strokeWidth={2}
                dot={{ fill: '#f59e0b', r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
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
