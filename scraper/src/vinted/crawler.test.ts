import { describe, expect, it } from 'vitest';
import { buildRunRequestQueueName, sessionPoolOptions } from './crawler.js';

describe('sessionPoolOptions', () => {
  it('lets Vinted blocked statuses reach the request handler', () => {
    expect(sessionPoolOptions(5)).toMatchObject({
      maxPoolSize: 5,
      blockedStatusCodes: [],
      persistenceOptions: { enable: false },
    });
  });

  it('uses a distinct retry queue name for long run ids', () => {
    const runId = 'manual-vinted-direct-403-check-12345678901234567890';

    expect(buildRunRequestQueueName(runId)).not.toBe(
      buildRunRequestQueueName(runId, 'retry'),
    );
  });
});
