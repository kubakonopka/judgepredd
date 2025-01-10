import React, { useState, useRef } from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Legend, ResponsiveContainer, ReferenceArea, ReferenceLine } from 'recharts';
import { ExperimentResult } from '../types/experiment';
import { formatMetricValue } from '../utils/formatters';

interface QuestionMetricsChartProps {
  questionIndex: number;
  experiments: Record<string, ExperimentResult[]>;
  currentExperimentId: string;
  experimentOrder: Record<string, number>;
}

const CustomTooltip: React.FC<any> = ({ data }) => {
  if (!data) return null;

  const metrics = [
    { name: 'Correctness', value: data.correctness, color: '#3b82f6' },
    { name: 'Weighted Score', value: data.correctness_weighted, color: '#10b981' },
    { name: 'Faithfulness', value: data.faithfulness, color: '#f59e0b' }
  ];

  return (
    <div className="bg-white p-3 border rounded shadow-lg text-sm">
      <p className="font-medium mb-2">{data.name}</p>
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

export default function QuestionMetricsChart({ questionIndex, experiments, currentExperimentId, experimentOrder }: QuestionMetricsChartProps) {
  const [hoveredVersion, setHoveredVersion] = useState<number | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const chartRef = useRef<HTMLDivElement>(null);

  const data = Object.entries(experimentOrder).map(([expId, version]) => {
    const result = experiments[expId]?.[questionIndex];
    return {
      name: `Version ${version}`,
      version,
      correctness: result?.correctness === -1 ? null : result?.correctness || 0,
      correctness_weighted: result?.correctness_weighted === -1 ? null : result?.correctness_weighted || 0,
      faithfulness: result?.faithfulness === -1 ? null : result?.faithfulness || 0,
    };
  });

  const currentVersion = experimentOrder[currentExperimentId];
  const versionStep = 0.2;
  const highlightStart = currentVersion - versionStep/2;
  const highlightEnd = currentVersion + versionStep/2;

  const handleMouseMove = (event: React.MouseEvent) => {
    console.log("Mouse move", event.clientX, event.clientY);
    const chartRect = chartRef.current?.getBoundingClientRect();
    if (chartRect) {
      console.log("Chart rect", chartRect);
      setTooltipPosition({
        x: event.clientX - chartRect.left,
        y: event.clientY - chartRect.top
      });
    }
  };

  console.log("Render with hoveredVersion:", hoveredVersion);
  console.log("Data:", data);

  return (
    <div className="bg-white p-6 rounded-lg relative" onMouseMove={handleMouseMove} ref={chartRef}>
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
            dataKey="version" 
            type="number"
            domain={[0, Math.max(...Object.values(experimentOrder)) + 1]}
            ticks={Object.values(experimentOrder)}
            tickFormatter={(value) => `Version ${value}`}
            tick={{ fontSize: 12 }}
          />
          <YAxis
            domain={[0, 1]}
            tickFormatter={formatMetricValue}
            tick={{ fontSize: 12 }}
            allowDataOverflow={false}
          />
          <Legend />
          
          {/* Obszary referencyjne dla hoverów */}
          {data.map((entry) => (
            <ReferenceArea
              key={entry.version}
              x1={entry.version - versionStep/2}
              x2={entry.version + versionStep/2}
              y1={0}
              y2={1}
              fill={hoveredVersion === entry.version ? "#94a3b8" : "transparent"}
              fillOpacity={hoveredVersion === entry.version ? 0.15 : 0}
              onMouseEnter={() => setHoveredVersion(entry.version)}
              onMouseLeave={() => setHoveredVersion(null)}
            />
          ))}

          {/* Podświetlenie aktualnej wersji */}
          <ReferenceArea
            x1={highlightStart}
            x2={highlightEnd}
            fill="#6366f1"
            fillOpacity={0.15}
            strokeOpacity={0.3}
            stroke="#6366f1"
            isFront={false}
          />
          <ReferenceLine
            x={highlightEnd}
            stroke="none"
            label={{
              value: "currently viewed version",
              position: "center",
              fill: "#000000",
              fontSize: 11,
              angle: -90,
              offset: 5,
            }}
          />

          <Scatter
            name="Correctness"
            data={data}
            fill="#3b82f6"
            shape="circle"
            legendType="circle"
            xAxisId={0}
            yAxisId={0}
            dataKey="correctness"
          >
            {data.map((entry, index) => (
              <circle
                key={index}
                r={6}
                fill="#3b82f6"
              />
            ))}
          </Scatter>
          <Scatter
            name="Weighted Score"
            data={data}
            fill="#10b981"
            shape="circle"
            legendType="circle"
            xAxisId={0}
            yAxisId={0}
            dataKey="correctness_weighted"
          >
            {data.map((entry, index) => (
              <circle
                key={index}
                r={6}
                fill="#10b981"
              />
            ))}
          </Scatter>
          <Scatter
            name="Faithfulness"
            data={data}
            fill="#f59e0b"
            shape="circle"
            legendType="circle"
            xAxisId={0}
            yAxisId={0}
            dataKey="faithfulness"
          >
            {data.map((entry, index) => (
              <circle
                key={index}
                r={6}
                fill="#f59e0b"
              />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
      {hoveredVersion && (
        <div 
          className="absolute pointer-events-none z-50"
          style={{ 
            left: tooltipPosition.x + 15,
            top: tooltipPosition.y - 100,
          }}
        >
          <CustomTooltip data={data.find(d => d.version === hoveredVersion)} />
        </div>
      )}
    </div>
  );
}
