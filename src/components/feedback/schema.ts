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

export const actionResponse = z.object({
  destinationUrl: safeDestinationUrl,
  submitted: z.boolean(),
});

export const storedSubmission = z.object({
  feedback: pageFeedback,
  response: actionResponse,
});

export type ActionResponse = z.infer<typeof actionResponse>;
export type PageFeedback = z.infer<typeof pageFeedback>;
export type StoredSubmission = z.infer<typeof storedSubmission>;
