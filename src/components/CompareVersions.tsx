import React, { useState } from 'react';
import { experimentOrder } from '../constants';

interface CompareVersionsProps {
  currentExperimentId: string;
  questionNumber: number;
  onCompareStart: () => void;
  onVersionSelect: (version: string) => void;
  onCompareEnd: () => void;
  isComparing: boolean;
}

export default function CompareVersions({ 
  currentExperimentId, 
  questionNumber, 
  onCompareStart,
  onVersionSelect,
  onCompareEnd,
  isComparing 
}: CompareVersionsProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleVersionSelect = (version: string) => {
    onVersionSelect(version);
    setIsOpen(false);
  };

  const handleCompareClick = () => {
    setIsOpen(!isOpen);
  };

  const currentVersionNumber = experimentOrder[currentExperimentId];

  return (
    <div className="relative flex items-center gap-2">
      {isComparing ? (
        <>
          <div className="flex items-center gap-3 text-base">
            <span className="text-gray-900 font-semibold">Current version v{currentVersionNumber}</span>
            <span className="text-gray-500 font-medium">vs</span>
            <button
              onClick={handleCompareClick}
              className="px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-base font-semibold text-gray-900 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 flex items-center gap-2"
            >
              <span>Version {experimentOrder[Object.entries(experimentOrder)
                .filter(([key]) => key !== currentExperimentId)[0][0]]}</span>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {isOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                )}
              </svg>
            </button>
          </div>
          <button
            onClick={onCompareEnd}
            className="w-[400px] px-6 py-2 bg-indigo-600 text-white rounded-md shadow-sm text-base font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 flex items-center justify-center whitespace-nowrap"
          >
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              <span>Close comparison view</span>
            </div>
          </button>
          <div className={`absolute left-0 mt-2 py-2 w-[200px] bg-white rounded-md shadow-xl z-10 border border-gray-200 ${isOpen ? '' : 'hidden'}`} style={{ top: '100%' }}>
            {Object.entries(experimentOrder)
              .filter(([key]) => key !== currentExperimentId)
              .map(([key, value]) => (
                <button
                  key={key}
                  className="block px-4 py-2 text-base text-gray-700 hover:bg-gray-100 w-full text-left transition-colors duration-150"
                  onClick={() => handleVersionSelect(key)}
                >
                  Version {value}
                </button>
              ))}
          </div>
        </>
      ) : (
        <button
          onClick={onCompareStart}
          className="w-[400px] px-6 py-2 bg-indigo-600 text-white rounded-md shadow-sm text-base font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 flex items-center justify-center whitespace-nowrap"
        >
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            <span>Compare current answer with any other version</span>
          </div>
        </button>
      )}
    </div>
  );
}
