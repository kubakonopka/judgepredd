import React from 'react';
import { DataValidation } from '../types/experiment';

interface ValidationStatusProps {
  validation: DataValidation;
}

export default function ValidationStatus({ validation }: ValidationStatusProps) {
  const getStatusColor = (passed: boolean) => passed ? 'text-green-600' : 'text-red-600';
  const getStatusIcon = (passed: boolean) => passed ? (
    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
    </svg>
  ) : (
    <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );

  return (
    <div className="bg-white shadow rounded-lg p-4">
      <h3 className="text-lg font-semibold mb-4">Data Validation Status</h3>
      
      <div className="space-y-4">
        {/* Status ładowania danych */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getStatusIcon(validation.loadedSuccessfully)}
            <span>Data Loading</span>
          </div>
          <span className={getStatusColor(validation.loadedSuccessfully)}>
            {validation.loadedSuccessfully ? 'Success' : 'Failed'}
          </span>
        </div>

        {/* Szczegóły walidacji */}
        <div className="border-t pt-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-sm text-gray-600">Total Results</span>
              <p className="text-lg font-medium">{validation.validationDetails.totalResults}</p>
            </div>
            <div>
              <span className="text-sm text-gray-600">Valid Results</span>
              <p className="text-lg font-medium">
                {validation.validationDetails.totalResults - 
                 (validation.validationDetails.resultsWithMissingData + 
                  validation.validationDetails.resultsWithInvalidData)}
              </p>
            </div>
          </div>
        </div>

        {/* Lista sprawdzeń */}
        <div className="border-t pt-4">
          <h4 className="text-sm font-medium mb-2">Validation Checks</h4>
          <div className="space-y-2">
            {validation.validationDetails.checks.map((check, index) => (
              <div key={index} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  {getStatusIcon(check.passed)}
                  <span>{check.description}</span>
                </div>
                {check.details && (
                  <span className="text-gray-500 text-xs">{check.details}</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Błędy walidacji */}
        {validation.validationErrors.length > 0 && (
          <div className="border-t pt-4">
            <h4 className="text-sm font-medium text-red-600 mb-2">Validation Errors</h4>
            <ul className="space-y-1">
              {validation.validationErrors.map((error, index) => (
                <li key={index} className="text-sm text-red-600">{error}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Status obliczeń */}
        <div className="border-t pt-4">
          <div className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span className="text-sm">Metrics are calculated in real-time</span>
          </div>
        </div>
      </div>
    </div>
  );
}
