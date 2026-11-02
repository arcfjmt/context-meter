export type Fill = { tokens: number; window: number; percent: number }

/**
 * One plan-limit window: its short label, how much of it is used (0 to 100),
 * and when it resets as an ISO 8601 timestamp, when the engine knows.
 */
export type Limit = { label: string; percent: number; resetsAt?: string }

declare module 'claude-code' {
  interface PluginState {
    'context-meter': { fill: Fill | null; limits: Limit[]; version: string | null }
  }
}
