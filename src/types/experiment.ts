export interface Claim {
  statement: string;
  score: number;
  context: string;
}

export interface Metrics {
  correctness: number;
  correctness_weighted: number;
  faithfulness: number;
}

export interface ValidationCheck {
  description: string;
  passed: boolean;
  details?: string;
}

export interface ValidationDetails {
  totalResults: number;
  resultsWithMissingData: number;
  resultsWithInvalidData: number;
  checks: ValidationCheck[];
}

export interface DataValidation {
  dataPath: string;
  loadedSuccessfully: boolean;
  validationErrors: string[];
  validationDetails: ValidationDetails;
}

export interface ExperimentRawData {
  dataValidation: DataValidation;
  totalQuestions: number;
  validQuestions: number;
  results: ExperimentResult[];
  individualScores: {
    correctness: number[];
    correctness_weighted: number[];
    faithfulness: number[];
  };
  correctness: number[];
  correctness_weighted: number[];
  faithfulness: number[];
}

export interface ExperimentResult {
  run_name: string;
  prompt: string;
  response: string;
  correctness: number;
  correctness_weighted: number;
  faithfulness: number;
  correctness_claims: Claim[];
  correctness_weighted_claims: Claim[];
  faithfulness_claims: Claim[];
}

export interface Experiment {
  name: string;
  description: string;
  results: ExperimentResult[];
  metrics: Metrics;
  correctness: number;
  correctness_weighted: number;
  faithfulness: number;
  rawData: ExperimentRawData;
  previousVersion?: Experiment | null;
}
