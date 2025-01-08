import { ExperimentResult } from '../types/experiment';

interface ValidationResult {
  isValid: boolean;
  validResults: ExperimentResult[];
  errors: string[];
  summary: {
    totalResults: number;
    resultsWithMissingData: number;
    resultsWithInvalidData: number;
  };
}

export function validateExperimentResults(results: ExperimentResult[]): ValidationResult {
  const validationResult: ValidationResult = {
    isValid: true,
    validResults: [],
    errors: [],
    summary: {
      totalResults: results.length,
      resultsWithMissingData: 0,
      resultsWithInvalidData: 0
    }
  };

  if (!Array.isArray(results)) {
    validationResult.isValid = false;
    validationResult.errors.push('Results must be an array');
    return validationResult;
  }

  results.forEach((result, index) => {
    const errors: string[] = [];

    // Sprawdź wymagane pola
    if (!result.prompt) {
      errors.push(`Result ${index}: Missing prompt`);
      validationResult.summary.resultsWithMissingData++;
    }
    if (!result.response) {
      errors.push(`Result ${index}: Missing response`);
      validationResult.summary.resultsWithMissingData++;
    }

    // Sprawdź poprawność metryk
    if (typeof result.correctness !== 'number' || (result.correctness !== -1 && (result.correctness < 0 || result.correctness > 1))) {
      errors.push(`Result ${index}: Invalid correctness value`);
      validationResult.summary.resultsWithInvalidData++;
    }
    if (typeof result.correctness_weighted !== 'number' || (result.correctness_weighted !== -1 && (result.correctness_weighted < 0 || result.correctness_weighted > 1))) {
      errors.push(`Result ${index}: Invalid weighted correctness value`);
      validationResult.summary.resultsWithInvalidData++;
    }
    if (typeof result.faithfulness !== 'number' || (result.faithfulness !== -1 && (result.faithfulness < 0 || result.faithfulness > 1))) {
      errors.push(`Result ${index}: Invalid faithfulness value`);
      validationResult.summary.resultsWithInvalidData++;
    }

    if (errors.length === 0) {
      validationResult.validResults.push(result);
    } else {
      validationResult.errors.push(...errors);
    }
  });

  validationResult.isValid = validationResult.errors.length === 0;
  return validationResult;
}

export function logValidationResults(validation: ValidationResult): void {
  console.log('Validation Results:');
  console.log(`Total Results: ${validation.summary.totalResults}`);
  console.log(`Valid Results: ${validation.validResults.length}`);
  console.log(`Results with Missing Data: ${validation.summary.resultsWithMissingData}`);
  console.log(`Results with Invalid Data: ${validation.summary.resultsWithInvalidData}`);
  
  if (validation.errors.length > 0) {
    console.log('Errors:');
    validation.errors.forEach(error => console.log(`- ${error}`));
  }
}
