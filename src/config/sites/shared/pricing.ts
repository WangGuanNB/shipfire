/** Retail credit examples, not vendor invoices. */

export const IMAGE_RETAIL = { perSecond: { "480p": 4, "720p": 5, "1080p": 8 }, minimum: 16 };

/** Billable seconds = template length + output length. */
export const VIDEO_RETAIL = { perSecond: { "480p": 1, "720p": 1, "1080p": 1 }, minimum: 30 };

/** Fixed site credits per template render; unrelated to Kie credits or clip duration. */
export const TEMPLATE_RETAIL = { perGeneration: { "480p": 100, "720p": 200 }, perSecond: {}, minimum: 0 };

export const BASIC_RETAIL = { perSecond: { "480p": 4, "720p": 4, "1080p": 8 }, minimum: 20 };
