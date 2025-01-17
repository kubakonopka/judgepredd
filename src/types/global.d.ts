import { ExperimentInfo, ExperimentResult } from './experiment';

declare global {
    interface Window {
        EXPERIMENTS_DATA: ExperimentInfo[];
        EXPERIMENT_RESULTS: { [key: string]: ExperimentResult[] };
        loadExperimentData: (experimentName: string) => Promise<ExperimentResult[]>;
        loadExperiments: () => Promise<ExperimentInfo[]>;
    }
}
