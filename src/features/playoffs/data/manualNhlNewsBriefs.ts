/**
 * Hand-picked blurbs that should stay visible even if ESPN RSS hasn’t picked them up yet.
 * Keep wording excerpt-style (not headline-style). Update or remove as stories age out.
 */
export interface ManualNhlNewsBrief {
  id: string;
  blurb: string;
  /**
   * When the live RSS feed already has an equivalent item, the manual tile is hidden
   * so readers see the auto-updating excerpt (and OG enrichment) instead of a duplicate.
   */
  supersededWhen?: (row: { title: string; link: string; blurb: string }) => boolean;
}

export const MANUAL_NHL_NEWS_BRIEFS: ManualNhlNewsBrief[] = [
  {
    id: '2026-durzi-fine-mammoth',
    blurb:
      'Utah Mammoth defenseman Sean Durzi was fined $5,000—the maximum allowed under the CBA—by NHL Player Safety for head-butting Vegas Golden Knights defenseman Rasmus Andersson during a first-period scrum in Game 1 of their first-round series (April 19, 2026). On-ice officials did not call a head-butting penalty; the fine followed a league review. He was not suspended.',
    supersededWhen: (row) => {
      const h = `${row.title} ${row.blurb} ${row.link}`.toLowerCase();
      return (
        /\bdurzi\b/.test(h) &&
        (h.includes('5000') || h.includes('5,000') || h.includes('fine')) &&
        (h.includes('mammoth') || h.includes('utah') || h.includes('andersson') || h.includes('golden knights'))
      );
    },
  },
];
