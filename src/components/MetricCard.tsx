import React from 'react';

interface MetricCardProps {
  label: string;
  value: number;
  previousValue?: number;
  color: string;
}

export function MetricCard({ label, value, previousValue, color }: MetricCardProps) {
  const change = previousValue !== undefined 
    ? ((value - previousValue) / previousValue * 100)
    : undefined;

  const changeColor = change 
    ? (change > 0 ? 'text-green-600' : 'text-red-600')
    : 'text-gray-600';

  const barHeight = Math.max(value * 100, 5); // minimum 5% height for visibility

  return (
    <div className="flex items-center space-x-4">
      <div className="flex-1">
        <span className="font-semibold">{label}:</span>{' '}
        <span>{value.toFixed(2)}</span>
        {change !== undefined && (
          <span className={`ml-2 text-sm ${changeColor}`}>
            {change > 0 ? '↑' : '↓'} {Math.abs(change).toFixed(1)}%
          </span>
        )}
      </div>
      <div className="w-16 h-8 bg-gray-100 rounded flex items-end">
        <div 
          className="w-4 rounded-t" 
          style={{ 
            height: `${barHeight}%`,
            backgroundColor: color
          }} 
        />
      </div>
    </div>
  );
}
