import { expect, test } from 'claude-code/testing'

const BAND = {
  plugin: 'context-meter',
  component: 'AbovePrompt',
  props: { hasSurvey: false, isWorking: false, maxRows: 4, bodyColumns: 80 },
} as const

test('the band shows the context fill, on every surface', async ($, on) => {
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('session.usage', () => ({
    value: {
      startedAt: 0,
      context: { tokens: 84_000, window: 200_000, percent: 42 },
      rateLimits: [],
    },
  }))

  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...BAND, surface })
    expect((await ui.find({ type: 'Text', text: /%/ }))?.text).toBe(' 42%')
    expect((await ui.find({ type: 'Text', text: /\// }))?.text).toBe(' (84k / 200k)')
    await ui.unmount()
  }
})

test('before the first response the band leaves the row to the engine', async ($, on) => {
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('session.usage', () => ({ value: { startedAt: 0, context: { window: 200_000 }, rateLimits: [] } }))
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)

    return <Text>engine</Text>
  })

  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect((await ui.find({ type: 'Text' }))?.text).toBe('engine')
  await ui.unmount()
})
