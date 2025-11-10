// Poster status constants used for generated_posters.status (Postgres ENUM)
// Intent: prevent invalid enum writes by centralizing allowed values.
export const PosterStatus = {
  PENDING: "PENDING",
  PROCESSING: "PROCESSING",
  AWAITING_PAYMENT: "AWAITING_PAYMENT",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
} as const

export type PosterStatusType = (typeof PosterStatus)[keyof typeof PosterStatus]

