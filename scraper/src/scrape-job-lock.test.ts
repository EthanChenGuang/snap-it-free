import { describe, expect, it } from 'vitest';
import {
  DuplicateJobRunError,
  isActiveJobRunUniqueViolation,
  isDuplicateJobRunError,
} from './scrape-job-lock.js';

describe('scrape-job-lock', () => {
  it('detects duplicate job run errors', () => {
    const err = new DuplicateJobRunError('job-1');
    expect(isDuplicateJobRunError(err)).toBe(true);
    expect(isActiveJobRunUniqueViolation(err, 'job-1')).toBe(true);
    expect(isActiveJobRunUniqueViolation(err, 'job-2')).toBe(false);
  });

  it('detects postgres unique violations for active job runs', () => {
    expect(isActiveJobRunUniqueViolation({ code: '23505' }, 'job-1')).toBe(true);
    expect(isActiveJobRunUniqueViolation({ code: '23505' }, null)).toBe(false);
  });
});
