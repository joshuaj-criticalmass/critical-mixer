export const companies = ["Critical Mass", "artbot.", "Tribal", "RAPP"] as const;
export type Company = (typeof companies)[number];