/*
 * The landing's public-page type and spacing scale
 * (packages/blocks/src/web/landing-typography.ts and section-title.tsx), mirrored
 * so the docs home reads as the same site: one max-w-6xl left edge, sections
 * separated by whitespace only, and the same headline, section-title and lead
 * sizes. Keep the values in step with those files.
 */

/** H1: the docs home hero headline. */
export const landingHeadlineClass =
  "text-balance font-heading font-medium text-[2.5rem] text-fd-foreground leading-[1.05] tracking-[-0.035em] md:text-5xl lg:text-[4rem] lg:leading-[1.02]";

/** Lead text: hero subhead and section subtitles. */
export const landingSubheadlineClass =
  "mt-6 max-w-2xl text-pretty text-base text-fd-muted-foreground leading-relaxed md:text-lg";

/** Horizontal shell shared by every docs-home section and the footer. */
export const landingContainerClass = "mx-auto w-full max-w-6xl px-6";

/** Shell for every non-hero section. */
export const landingSectionClass =
  "mx-auto w-full max-w-6xl scroll-mt-20 px-6 py-16 md:py-24";

/** Shell for the hero. */
export const landingHeroSectionClass =
  "mx-auto w-full max-w-6xl px-6 pt-12 pb-10 md:pt-24 md:pb-16";

/** H2: section titles (SectionTitle size "default"). */
export const landingSectionTitleClass =
  "text-balance font-heading font-medium text-3xl text-fd-foreground leading-[1.1] tracking-[-0.03em] md:text-4xl lg:text-[2.75rem]";

/** H3: titled groups inside a section (SectionTitle size "small"). */
export const landingGroupTitleClass =
  "text-balance font-heading font-medium text-xl text-fd-foreground leading-[1.1] tracking-[-0.03em] md:text-2xl";

/** Supporting line under a group title. */
export const landingGroupDescriptionClass =
  "mt-2 max-w-2xl text-pretty text-fd-muted-foreground text-sm leading-relaxed md:text-base";
