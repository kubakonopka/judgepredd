import React from 'react';
import { formatMetricValue } from '../utils/formatters';
import { TooltipProps } from 'recharts';

interface MetricDataPoint {
  questionNumber: number;
  correctness: number | null;
  correctness_weighted: number | null;
  faithfulness: number | null;
}

const MetricTooltip: React.FC<TooltipProps<any, any>> = ({ active, payload }) => {
  if (!active || !payload || payload.length === 0) return null;

  const data = payload[0].payload as MetricDataPoint;
  if (!data) return null;

  const metrics = [
    { name: 'Correctness', value: data.correctness, color: '#3b82f6' },
    { name: 'Weighted Correctness', value: data.correctness_weighted, color: '#22c55e' },
    { name: 'Faithfulness', value: data.faithfulness, color: '#a855f7' }
  ];

  return (
    <div className="bg-white p-3 border rounded shadow-lg text-sm">
      <p className="font-medium mb-2">Question {data.questionNumber}</p>
      <div className="space-y-1">
        {metrics.map((metric, idx) => (
          <div key={idx} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: metric.color }}></div>
              <span>{metric.name}:</span>
            </div>
            <span className="font-medium">
              {metric.value === null || metric.value === -1 ? 'Not scored' : formatMetricValue(metric.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MetricTooltip;
