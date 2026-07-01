import { create } from 'zustand';

interface SimulationState {
  scenario: string;
  delayYears: number;
  invisiblePopulationEstimate: string;
  cocNumber: string;
  cocName: string | null;
  results: any | null;
  setScenario: (scenario: string) => void;
  setDelayYears: (years: number) => void;
  setInvisiblePopulation: (estimate: string) => void;
  setCocNumber: (coc: string) => void;
  setCocName: (name: string | null) => void;
  setResults: (results: any) => void;
}

export const useSimulationStore = create<SimulationState>((set) => ({
  scenario: 'delay',
  delayYears: 3,
  invisiblePopulationEstimate: 'medium',
  cocNumber: 'national',
  cocName: null,
  results: null,
  setScenario: (scenario) => set({ scenario }),
  setDelayYears: (delayYears) => set({ delayYears }),
  setInvisiblePopulation: (invisiblePopulationEstimate) => set({ invisiblePopulationEstimate }),
  setCocNumber: (cocNumber) => set({ cocNumber }),
  setCocName: (cocName) => set({ cocName }),
  setResults: (results) => set({ results }),
}));
