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
      console.log(`${scenario.name}: ${result.interleavings} interleavings`);
      expect(result.counterexample).toBeNull();
    });
  });

  // Known finding F1 (see SKILL.md): Stripe stamps events in whole seconds and the guard keeps "last
  // write wins" on ties, so same-second events delivered out of order can leave the row wrong.
  describe('same second: known finding F1', () => {
    it.each(SAME_SECOND_SCENARIOS.map((scenario) => [scenario.name, scenario] as const))('%s', async (_name, scenario) => {
      const result = await checkScenario(scenario, guard);
      if (result.counterexample) console.log(describeCounterexample(result.counterexample));
      expect(result.counterexample).toBeNull();
    });
  });
});
