import { z } from "zod";

const safeDestinationUrl = z.string().refine((value) => {
  try {
    const protocol = new URL(value).protocol;
    return (
      protocol === "http:" || protocol === "https:" || protocol === "mailto:"
    );
  } catch {
    return false;
  }
}, "Feedback destination must use http, https, or mailto");

export const pageFeedback = z.object({
  opinion: z.enum(["good", "bad"]),
  url: z.string().url(),
  message: z.string().trim().min(1).max(2_000),
});

export const blockFeedback = pageFeedback.extend({
  blockId: z
    .string()
    .trim()
    .min(1)
    .max(200)
    .regex(/^[A-Za-z0-9_-]+$/),
  blockBody: z.string().trim().min(1).max(4_000),
});

export const actionResponse = z.object({
  destinationUrl: safeDestinationUrl,
  submitted: z.boolean(),
});

export const storedSubmission = z.object({
  feedback: pageFeedback,
  response: actionResponse,
});

export const storedBlockSubmission = z.object({
  feedback: blockFeedback,
  response: actionResponse,
});

export type ActionResponse = z.infer<typeof actionResponse>;
export type BlockFeedback = z.infer<typeof blockFeedback>;
export type PageFeedback = z.infer<typeof pageFeedback>;
export type StoredBlockSubmission = z.infer<typeof storedBlockSubmission>;
export type StoredSubmission = z.infer<typeof storedSubmission>;
