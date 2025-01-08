import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Experiment } from '../types/experiment';
import { loadExperiment } from '../data/experimentLoader';

export default function ValidationStatusPage() {
  const { experimentId } = useParams<{ experimentId: string }>();
  const [experiment, setExperiment] = useState<Experiment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      if (!experimentId) return;
      
      try {
        setLoading(true);
        const data = await loadExperiment(experimentId);
        setExperiment(data);
        setError(null);
      } catch (err) {
        console.error('Error loading experiment:', err);
        setError('Failed to load experiment');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [experimentId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !experiment) {
    return (
      <div className="min-h-screen bg-gray-100 px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white shadow rounded-lg p-6">
            <div className="text-center">
              <h3 className="text-lg font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">{error || 'Failed to load experiment'}</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
    <div className="min-h-screen bg-gray-100 px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-2xl font-bold mb-6">Validation Status</h2>
          
          {/* Sekcja statusu danych */}
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-3">Data Loading Status</h3>
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  {getStatusIcon(experiment.rawData.dataValidation.loadedSuccessfully)}
                  <span>Data Loading</span>
                </div>
                <span className={getStatusColor(experiment.rawData.dataValidation.loadedSuccessfully)}>
                  {experiment.rawData.dataValidation.loadedSuccessfully ? 'Success' : 'Failed'}
                </span>
              </div>
            </div>

            {/* Sekcja statystyk */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Validation Statistics</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-600">Total Results</div>
                  <div className="text-2xl font-bold">
                    {experiment.rawData.dataValidation.validationDetails.totalResults}
                  </div>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-600">Valid Results</div>
                  <div className="text-2xl font-bold">
                    {experiment.rawData.dataValidation.validationDetails.totalResults -
                     (experiment.rawData.dataValidation.validationDetails.resultsWithMissingData +
                      experiment.rawData.dataValidation.validationDetails.resultsWithInvalidData)}
                  </div>
                </div>
              </div>
            </div>

            {/* Sekcja sprawdzeń */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Validation Checks</h3>
              <div className="space-y-2">
                {experiment.rawData.dataValidation.validationDetails.checks.map((check, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(check.passed)}
                      <span>{check.description}</span>
                    </div>
                    {check.details && (
                      <span className="text-sm text-gray-500">{check.details}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Sekcja błędów */}
            {experiment.rawData.dataValidation.validationErrors.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-3 text-red-600">Validation Errors</h3>
                <div className="space-y-2">
                  {experiment.rawData.dataValidation.validationErrors.map((error, index) => (
                    <div key={index} className="p-4 bg-red-50 text-red-700 rounded-lg">
                      {error}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Sekcja statusu obliczeń */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Calculation Status</h3>
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                  <span>Metrics are calculated in real-time for each question</span>
                </div>
                <div className="mt-2 text-sm text-gray-600">
                  All metrics (correctness, weighted correctness, faithfulness) are computed dynamically
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
