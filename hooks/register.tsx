import { atom, read, update } from 'claude-code'
import type { Register, SessionContextUsage, SessionRateLimit } from 'claude-code'

import type { Fill, Limit } from '../types'

const fill = atom({ plugin: 'context-meter', key: 'fill' } as const, null)
const limits = atom({ plugin: 'context-meter', key: 'limits' } as const, [])

const BAR_WIDTH = 20

const toFill = (context: SessionContextUsage): Fill | null =>
  context.tokens === undefined
    ? null
    : {
        tokens: context.tokens,
        window: context.window,
        percent: context.percent ?? Math.round((context.tokens / context.window) * 100),
      }

const LIMIT_LABELS: Record<string, string> = { five_hour: '5h', seven_day: '7d', spend_limit: 'Spend' }

const toLimits = (rateLimits: SessionRateLimit[]): Limit[] =>
  rateLimits.map(limit => ({
    label: LIMIT_LABELS[limit.kind] ?? limit.kind,
    percent: Math.round(limit.percentUsed),
    ...(limit.resetsAt === undefined ? {} : { resetsAt: limit.resetsAt }),
  }))

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const pad = (n: number) => String(n).padStart(2, '0')

/**
 * The reset time in the local time zone, 24-hour: `15:00` when it falls on the
 * same day as `now`, else `Thu 09:00`. Empty when the time is missing or unreadable.
 */
const formatReset = (resetsAt: string | undefined, now: number): string => {
  if (resetsAt === undefined) {
    return ''
  }
  const at = new Date(resetsAt)
  if (Number.isNaN(at.getTime())) {
    return ''
  }
  const today = new Date(now)
  const sameDay =
    at.getFullYear() === today.getFullYear() &&
    at.getMonth() === today.getMonth() &&
    at.getDate() === today.getDate()
  const time = `${pad(at.getHours())}:${pad(at.getMinutes())}`

  return sameDay ? time : `${WEEKDAYS[at.getDay()]} ${time}`
}

const formatTokens = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : `${Math.round(n / 1000)}k`

const colorFor = (percent: number) =>
  percent >= 80 ? 'error' : percent >= 50 ? 'warning' : 'success'

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    // Clears the line the status-line version of this mod pinned.
    $.ui.status(undefined)

    const result = await next(e)
    const { context, rateLimits } = await $.session.usage()
    await update($, fill, () => toFill(context))
    await update($, limits, () => toLimits(rateLimits))

    return result
  })

  on('session.measure', async ($, e, next) => {
    if (e.changed.includes('context')) {
      await update($, fill, () => toFill(e.context))
    }
    if (e.changed.includes('rateLimits')) {
      await update($, limits, () => toLimits(e.rateLimits))
    }

    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const current = await read($, fill)
    const windows = await read($, limits)

    if (e.props.hasSurvey || (current === null && windows.length === 0)) {
      return next(e)
    }

    const now = await $.clock.now()
    const { Box, Text } = $.ui.resolve(e)
    const filled =
      current === null ? 0 : Math.min(BAR_WIDTH, Math.round((current.percent / 100) * BAR_WIDTH))

    return (
      <Box>
        {current !== null && [
          <Text key="label" dimColor>Context </Text>,
          <Text key="filled" color={colorFor(current.percent)}>{'█'.repeat(filled)}</Text>,
          <Text key="empty" dimColor>{'░'.repeat(BAR_WIDTH - filled)}</Text>,
          <Text key="percent"> {current.percent}%</Text>,
          <Text key="tokens" dimColor>
            {' '}
            ({formatTokens(current.tokens)} / {formatTokens(current.window)})
          </Text>,
        ]}
        {windows.flatMap((limit, index) => {
          const reset = formatReset(limit.resetsAt, now)

          return [
            <Text key={`${limit.label}-label`} dimColor>
              {current === null && index === 0 ? '' : '  '}
              {limit.label}{' '}
            </Text>,
            <Text key={`${limit.label}-percent`} color={colorFor(limit.percent)}>
              {limit.percent}%
            </Text>,
            ...(reset === ''
              ? []
              : [
                  <Text key={`${limit.label}-reset`} dimColor>
                    {' '}
                    ({reset})
                  </Text>,
                ]),
          ]
        })}
      </Box>
    )
  })
}
