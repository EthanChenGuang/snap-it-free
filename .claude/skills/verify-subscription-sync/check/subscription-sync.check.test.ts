import { describe, expect, it } from 'vitest';
import {
  DISTINCT_SECOND_SCENARIOS,
  SAME_SECOND_SCENARIOS,
  checkScenario,
  describeCounterexample,
  loadApplyGuard,
} from './subscription-sync.check';

const guard = loadApplyGuard();

describe(`Converges (guard "${guard.op}" from ${guard.source})`, () => {
  describe('distinct seconds: must hold', () => {
    it.each(DISTINCT_SECOND_SCENARIOS.map((scenario) => [scenario.name, scenario] as const))('%s', async (_name, scenario) => {
      const result = await checkScenario(scenario, guard);
      if (result.counterexample) console.log(describeCounterexample(result.counterexample));
      console.log(`${scenario.name}: ${result.states} distinct states`);
      expect(result.counterexample).toBeNull();
    });
  });

  // Regression for finding F1 (fixed 2026-10-30, see SKILL.md): Stripe stamps events in whole seconds, so
  // two changes in one second delivered out of order used to leave the row wrong.
  describe('same second: must hold (F1 regression)', () => {
    it.each(SAME_SECOND_SCENARIOS.map((scenario) => [scenario.name, scenario] as const))('%s', async (_name, scenario) => {
      const result = await checkScenario(scenario, guard);
      if (result.counterexample) console.log(describeCounterexample(result.counterexample));
      console.log(`${scenario.name}: ${result.states} distinct states`);
      expect(result.counterexample).toBeNull();
    });
  });
});
