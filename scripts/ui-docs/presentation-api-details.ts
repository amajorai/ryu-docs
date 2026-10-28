/** Curated presentation API sections, keyed by component import path. */
import { PRESENTATION_API_DETAILS_1 } from "./presentation-api-details-1.ts";
import { PRESENTATION_API_DETAILS_2 } from "./presentation-api-details-2.ts";
import { PRESENTATION_API_DETAILS_3 } from "./presentation-api-details-3.ts";

export const PRESENTATION_API_DETAILS = {
  ...PRESENTATION_API_DETAILS_1,
  ...PRESENTATION_API_DETAILS_2,
  ...PRESENTATION_API_DETAILS_3,
} satisfies Record<string, string[]>;
