import { z } from 'zod';

export const REPORT_REASONS = ['already_taken', 'not_free', 'spam_or_scam'] as const;

export const ReportReasonSchema = z.enum(REPORT_REASONS);

export const CreateReportSchema = z.object({
  listingId: z.string().uuid(),
  reason: ReportReasonSchema,
});

export type ReportReason = z.infer<typeof ReportReasonSchema>;
export type CreateReportInput = z.infer<typeof CreateReportSchema>;
