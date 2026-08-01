import { describe, expect, it } from 'vitest';
import { CreateReportSchema, ReportReasonSchema } from './schemas';

describe('ReportReasonSchema', () => {
  it('accepts three Italian reason enum values', () => {
    expect(ReportReasonSchema.safeParse('already_taken').success).toBe(true);
    expect(ReportReasonSchema.safeParse('not_free').success).toBe(true);
    expect(ReportReasonSchema.safeParse('spam_or_scam').success).toBe(true);
  });

  it('rejects unknown reasons', () => {
    expect(ReportReasonSchema.safeParse('invalid').success).toBe(false);
  });
});

describe('CreateReportSchema', () => {
  it('requires listingId UUID and valid reason', () => {
    expect(
      CreateReportSchema.safeParse({
        listingId: '11111111-1111-4111-8111-111111111111',
        reason: 'spam_or_scam',
      }).success,
    ).toBe(true);

    expect(
      CreateReportSchema.safeParse({
        listingId: 'not-a-uuid',
        reason: 'spam_or_scam',
      }).success,
    ).toBe(false);
  });
});
