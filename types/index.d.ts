export type Fill = { tokens: number; window: number; percent: number }

/** One plan-limit window: its short label and how much of it is used, 0 to 100. */
export type Limit = { label: string; percent: number }

declare module 'claude-code' {
  interface PluginState {
    'context-meter': { fill: Fill | null; limits: Limit[] }
  }
}
