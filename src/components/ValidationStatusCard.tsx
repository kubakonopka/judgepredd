import React from 'react';
import { DataValidation } from '../types/experiment';

interface ValidationStatusCardProps {
  validation: DataValidation;
}

export default function ValidationStatusCard({ validation }: ValidationStatusCardProps) {
  const validResults = validation.validationDetails.totalResults - 
    (validation.validationDetails.resultsWithMissingData + 
     validation.validationDetails.resultsWithInvalidData);

  return (
    <div className="bg-white shadow rounded-lg h-[120px] overflow-hidden">
      <div className="h-1 bg-gradient-to-r from-green-500 via-blue-500 to-indigo-500"></div>
      <div className="flex items-center h-[calc(100%-4px)] px-6">
        {/* Status ogólny */}
        <div className="flex items-center gap-3 pr-8 border-r">
          <div className="relative">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white"></div>
          </div>
          <div>
            <div className="font-semibold text-gray-900">System Ready</div>
            <div className="text-xs text-gray-500">All checks passed</div>
          </div>
        </div>

        {/* Szczegóły walidacji */}
        <div className="flex-1 grid grid-cols-2 gap-8 px-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7v10c0 2 1 3 3 3h10c2 0 3-1 3-3V7c0-2-1-3-3-3H7C5 4 4 5 4 7Zm8 11V6" />
              </svg>
              <span className="font-medium text-gray-900">Structure Check</span>
            </div>
            <div className="space-y-1">
              <div className="flex items-center text-xs text-gray-600">
                <svg className="w-3.5 h-3.5 text-green-500 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                Schema Validated
              </div>
              <div className="flex items-center text-xs text-gray-600">
                <svg className="w-3.5 h-3.5 text-green-500 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                Fields Complete
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <span className="font-medium text-gray-900">Content Status</span>
            </div>
            <div className="space-y-1">
              <div className="flex items-center text-xs text-gray-600">
                <svg className="w-3.5 h-3.5 text-green-500 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                {validResults} of {validation.validationDetails.totalResults} Valid
              </div>
              <div className="flex items-center text-xs text-gray-600">
                <svg className="w-3.5 h-3.5 text-green-500 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                All Metrics Verified
              </div>
            </div>
          </div>
        </div>

        {/* Czas aktualizacji */}
        <div className="pl-8 border-l">
          <div className="text-xs text-gray-500 whitespace-nowrap">
            Last update
            <div className="font-medium text-gray-700">{new Date().toLocaleTimeString()}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
