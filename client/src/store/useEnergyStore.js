import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';

export const DEMO_PRESETS = {
  normal: {
    name: 'Normal Day Scenario',
    description: 'Typical commercial facility with midday solar and evening peak tariff.',
    battery: {
      capacity: 100,
      initial_energy: 50,
      min_reserve: 20,
      max_charge: 25,
      max_discharge: 25,
      efficiency: 0.94,
    },
    operator_notes: [
      'Do not charge the battery between 2 PM and 4 PM.',
      'Maintain at least 25 kWh in the battery.',
    ],
    generateHours: () =>
      Array.from({ length: 24 }, (_, i) => {
        const demand = 60 + 50 * Math.pow(Math.sin((Math.PI * (i - 5)) / 14), 2);
        const solar = i >= 6 && i <= 18 ? 75 * Math.sin((Math.PI * (i - 6)) / 12) : 0;
        const tariff = i >= 17 && i <= 21 ? 14.5 : i >= 9 && i <= 16 ? 9.2 : 6.5;
        return {
          hour: i,
          demand: Math.round(demand * 10) / 10,
          solar: Math.round(solar * 10) / 10,
          tariff: tariff,
        };
      }),
  },
  high_demand: {
    name: 'High Demand Industrial Day',
    description: 'Heavy machinery operation during afternoon hours with strict grid peak limits.',
    battery: {
      capacity: 150,
      initial_energy: 80,
      min_reserve: 30,
      max_charge: 35,
      max_discharge: 40,
      efficiency: 0.92,
    },
    operator_notes: [
      'Limit grid import to 80 kWh between 1 PM and 5 PM.',
      'Ensure maximum battery availability for evening shift.',
    ],
    generateHours: () =>
      Array.from({ length: 24 }, (_, i) => {
        const demand = i >= 12 && i <= 18 ? 120 + 30 * Math.sin(i) : 55 + 20 * Math.sin(i);
        const solar = i >= 7 && i <= 17 ? 85 * Math.sin((Math.PI * (i - 7)) / 10) : 0;
        const tariff = i >= 17 && i <= 22 ? 16.0 : 8.5;
        return {
          hour: i,
          demand: Math.round(demand * 10) / 10,
          solar: Math.round(solar * 10) / 10,
          tariff: tariff,
        };
      }),
  },
  low_solar: {
    name: 'Low Solar / Overcast Day',
    description: 'Cloudy weather reduces solar generation by 70%. Heavy reliance on battery arbitration.',
    battery: {
      capacity: 120,
      initial_energy: 90,
      min_reserve: 20,
      max_charge: 30,
      max_discharge: 30,
      efficiency: 0.95,
    },
    operator_notes: [
      'Reduce solar generation expectation by 50%.',
      'Discharge battery during peak tariff hours to avoid high cost.',
    ],
    generateHours: () =>
      Array.from({ length: 24 }, (_, i) => {
        const demand = 70 + 35 * Math.sin((Math.PI * i) / 12);
        const solar = i >= 7 && i <= 17 ? 22 * Math.sin((Math.PI * (i - 7)) / 10) : 0;
        const tariff = i >= 18 && i <= 21 ? 15.2 : 7.8;
        return {
          hour: i,
          demand: Math.round(demand * 10) / 10,
          solar: Math.round(solar * 10) / 10,
          tariff: tariff,
        };
      }),
  },
  peak_tariff: {
    name: 'Peak Tariff Spike Day',
    description: 'Extreme dynamic spot tariff spikes between 5 PM and 9 PM (up to 24 BDT/kWh).',
    battery: {
      capacity: 100,
      initial_energy: 60,
      min_reserve: 15,
      max_charge: 30,
      max_discharge: 30,
      efficiency: 0.93,
    },
    operator_notes: [
      'Do not discharge before 5 PM.',
      'Maximize discharge between 5 PM and 9 PM.',
    ],
    generateHours: () =>
      Array.from({ length: 24 }, (_, i) => {
        const demand = 65 + 40 * Math.sin((Math.PI * (i - 6)) / 12);
        const solar = i >= 6 && i <= 18 ? 65 * Math.sin((Math.PI * (i - 6)) / 12) : 0;
        const tariff = i >= 17 && i <= 21 ? 24.0 : i >= 8 && i <= 16 ? 10.0 : 5.5;
        return {
          hour: i,
          demand: Math.round(demand * 10) / 10,
          solar: Math.round(solar * 10) / 10,
          tariff: tariff,
        };
      }),
  },
  battery_constraint: {
    name: 'Battery Maintenance Day',
    description: 'Cell temperature constraints require strict maintenance windows and limited C-rates.',
    battery: {
      capacity: 80,
      initial_energy: 40,
      min_reserve: 35,
      max_charge: 15,
      max_discharge: 15,
      efficiency: 0.90,
    },
    operator_notes: [
      'Maintain battery reserve above 35 kWh.',
      'Do not charge the battery between 11 AM and 3 PM.',
    ],
    generateHours: () =>
      Array.from({ length: 24 }, (_, i) => {
        const demand = 50 + 30 * Math.sin((Math.PI * i) / 12);
        const solar = i >= 6 && i <= 18 ? 55 * Math.sin((Math.PI * (i - 6)) / 12) : 0;
        const tariff = i >= 17 && i <= 21 ? 13.5 : 7.2;
        return {
          hour: i,
          demand: Math.round(demand * 10) / 10,
          solar: Math.round(solar * 10) / 10,
          tariff: tariff,
        };
      }),
  },
};

export const useEnergyStore = create((set, get) => {
  const initialPreset = DEMO_PRESETS.normal;
  const initialHours = initialPreset.generateHours();

  // Try to load cached result from sessionStorage
  let cachedResult = null;
  try {
    const raw = sessionStorage.getItem('gridwise_optimization_result');
    if (raw) cachedResult = JSON.parse(raw);
  } catch {
    // ignore
  }

  return {
    scenarioId: uuidv4(),
    scenarioName: initialPreset.name,
    description: initialPreset.description,
    battery: { ...initialPreset.battery },
    operatorNotes: [...initialPreset.operator_notes],
    hours: initialHours,
    activePresetKey: 'normal',

    // Last calculated optimization result
    optimizationResult: cachedResult,

    setScenarioName: (name) => set({ scenarioName: name }),
    setDescription: (desc) => set({ description: desc }),
    setBattery: (updater) =>
      set((state) => ({
        battery: typeof updater === 'function' ? updater(state.battery) : { ...state.battery, ...updater },
      })),
    setOperatorNotes: (notes) => set({ operatorNotes: notes }),
    setHours: (hours) => set({ hours }),

    setOptimizationResult: (result) => {
      try {
        sessionStorage.setItem('gridwise_optimization_result', JSON.stringify(result));
      } catch {
        // ignore
      }
      set({ optimizationResult: result });
    },

    loadPreset: (key) => {
      const preset = DEMO_PRESETS[key] || DEMO_PRESETS.normal;
      const hours = preset.generateHours();
      set({
        scenarioId: uuidv4(),
        scenarioName: preset.name,
        description: preset.description,
        battery: { ...preset.battery },
        operatorNotes: [...preset.operator_notes],
        hours,
        activePresetKey: key,
      });
    },

    resetToDefault: () => {
      get().loadPreset('normal');
    },
  };
});
