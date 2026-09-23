/** The words a category's UI needs that vary by subject — everything else in the shared drill UI is generic. */
export interface DrillCopy {
  /** singular noun for one target, e.g. "country", "feature" */
  noun: string;
  /** plural noun, e.g. "countries", "features" */
  nounPlural: string;
  /** label above the region/type chips, e.g. "Region", "Type" */
  groupLabel: string;
  /** how to describe "every target" when a run covers the whole set, e.g. "the world", "everything" */
  wholeSet: string;
}

export function pluralize(n: number, copy: DrillCopy): string {
  return `${n} ${n === 1 ? copy.noun : copy.nounPlural}`;
}
