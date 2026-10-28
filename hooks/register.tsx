import { atom, read, update } from 'claude-code'
import type { Register, SessionContextUsage } from 'claude-code'

import type { Fill } from '../types'

const fill = atom({ plugin: 'context-meter', key: 'fill' } as const, null)

const BAR_WIDTH = 20

const toFill = (context: SessionContextUsage): Fill | null =>
  context.tokens === undefined
    ? null
    : {
        tokens: context.tokens,
        window: context.window,
        percent: context.percent ?? Math.round((context.tokens / context.window) * 100),
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
    const { context } = await $.session.usage()
    await update($, fill, () => toFill(context))

    return result
  })

  on('session.measure', async ($, e, next) => {
    if (e.changed.includes('context')) {
      await update($, fill, () => toFill(e.context))
    }

    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const current = await read($, fill)

    if (e.props.hasSurvey || current === null) {
      return next(e)
    }

    const { Box, Text } = $.ui.resolve(e)
    const filled = Math.min(BAR_WIDTH, Math.round((current.percent / 100) * BAR_WIDTH))

    return (
      <Box>
        <Text dimColor>Context </Text>
        <Text color={colorFor(current.percent)}>{'█'.repeat(filled)}</Text>
        <Text dimColor>{'░'.repeat(BAR_WIDTH - filled)}</Text>
        <Text>
          {' '}
          {current.percent}%
        </Text>
        <Text dimColor>
          {' '}
          ({formatTokens(current.tokens)} / {formatTokens(current.window)})
        </Text>
      </Box>
    )
  })
}
