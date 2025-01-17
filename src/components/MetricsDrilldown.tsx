import React, { useState } from 'react';
import { ExperimentResult, Claim } from '../types/experiment';

interface ClaimListProps {
  claims: Claim[];
  title: string;
  description: string;
}

const ClaimList: React.FC<ClaimListProps> = ({ claims, title, description }) => {
  // Sprawdzamy czy claims istnieją i czy nie są puste
  if (!claims || claims.length === 0) {
    return (
      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-lg font-semibold">{title}</h4>
          <div className="text-sm">
            <span className="text-gray-500">No data available</span>
          </div>
        </div>
        <p className="text-sm text-gray-500 mb-4">{description}</p>
      </div>
    );
  }

  const confirmedClaims = claims.filter(claim => claim.score >= 0.5).length;
  const unconfirmedClaims = claims.length - confirmedClaims;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-lg font-semibold">{title}</h4>
        <div className="text-sm space-x-2">
          <span className="text-green-600">Confirmed: {confirmedClaims}</span>
          <span>•</span>
          <span className="text-red-600">Unconfirmed: {unconfirmedClaims}</span>
          <span>•</span>
          <span className="text-gray-600">Total: {claims.length}</span>
        </div>
      </div>
      <p className="text-sm text-gray-500 mb-4">{description}</p>
      <div className="space-y-3">
        {claims.map((claim, index) => (
          <div 
            key={index}
            className={`p-3 rounded-lg ${claim.score >= 0.5 ? 'bg-green-50' : 'bg-red-50'}`}
          >
            <p className={`text-sm ${claim.score >= 0.5 ? 'text-green-700' : 'text-red-700'}`}>
              {claim.statement}
            </p>
            {claim.context && (
              <p className="text-sm text-gray-500 mt-2">
                Context: {claim.context}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

interface MetricsDrilldownProps {
  result: ExperimentResult;
}

const MetricsDrilldown: React.FC<MetricsDrilldownProps> = ({ result }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Debug log
  console.log('MetricsDrilldown result:', {
    correctness_claims: result.correctness_claims,
    faithfulness_claims: result.faithfulness_claims
  });

  // Sprawdzamy czy w ogóle są jakieś claims
  const hasClaims = (result.correctness_claims?.length > 0 || result.faithfulness_claims?.length > 0);

  if (!hasClaims) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-3 py-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-800 bg-white rounded-md shadow-sm border border-gray-200 hover:bg-gray-50 transition-colors duration-200 flex items-center justify-between"
      >
        <span className="text-lg font-semibold">Metrics Drilldown</span>
        <svg 
          className={`w-4 h-4 transform transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <div 
        className={`transition-all duration-300 ease-in-out overflow-hidden ${
          isExpanded ? 'max-h-[2000px] opacity-100 mt-4' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <ClaimList
              claims={result.correctness_claims || []}
              title="Correctness Drilldown"
              description="List of claims generated from ground truth. Green items indicate claims confirmed in the source materials, red items indicate unconfirmed claims."
            />
          </div>
          <div>
            <ClaimList
              claims={result.faithfulness_claims || []}
              title="Faithfulness Drilldown"
              description="List of claims generated from model response. Green items indicate claims confirmed in the source materials, red items indicate unconfirmed claims."
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default MetricsDrilldown;
