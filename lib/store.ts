import { create } from 'zustand';

interface SimulationState {
  scenario: string;
  delayYears: number;
  invisiblePopulationEstimate: string;
  results: any | null;
  setScenario: (scenario: string) => void;
  setDelayYears: (years: number) => void;
  setInvisiblePopulation: (estimate: string) => void;
  setResults: (results: any) => void;
}

export const useSimulationStore = create<SimulationState>((set) => ({
  scenario: 'delay',
  delayYears: 3,
  invisiblePopulationEstimate: 'medium',
  results: null,
  setScenario: (scenario) => set({ scenario }),
  setDelayYears: (delayYears) => set({ delayYears }),
  setInvisiblePopulation: (invisiblePopulationEstimate) => set({ invisiblePopulationEstimate }),
  setResults: (results) => set({ results }),
}));