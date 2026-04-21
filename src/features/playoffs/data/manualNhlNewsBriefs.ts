/**
 * Hand-picked blurbs that should stay visible even if ESPN RSS hasn’t picked them up yet.
 * Keep wording excerpt-style (not headline-style). Update or remove as stories age out.
 */
export interface ManualNhlNewsBrief {
  id: string;
  blurb: string;
}

export const MANUAL_NHL_NEWS_BRIEFS: ManualNhlNewsBrief[] = [
  {
    id: '2026-durzi-fine-mammoth',
    blurb:
      'Utah Mammoth defenseman Sean Durzi was fined $5,000—the maximum allowed under the CBA—by NHL Player Safety for head-butting Vegas Golden Knights defenseman Rasmus Andersson during a first-period scrum in Game 1 of their first-round series (April 19, 2026). Durzi was given a minor penalty for roughing on the play and was not suspended.',
  },
];
