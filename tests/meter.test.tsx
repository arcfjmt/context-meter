import { expect, mock, test } from 'claude-code/testing'

const BAND = {
  plugin: 'context-meter',
  component: 'AbovePrompt',
  props: {
    hasSurvey: false,
    isWorking: false,
    maxRows: 4,
    bodyColumns: 80,
    scroll: { offset: 0, bodyRows: 40 },
    view: {},
  },
} as const

// Built in the local time zone, as the band reads them, so the expectations hold in any zone.
const NOON = new Date(2026, 10, 2, 12, 0).getTime() // Mon 2 Nov 2026
const at = (day: number, hour: number) => new Date(2026, 10, day, hour, 0).toISOString()

test('the band shows the context fill, on every surface', async ($, on) => {
  mock.clock(on, { now: NOON })
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
  mock.clock(on, { now: NOON })
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

test('the band shows the plan limits beside the context fill', async ($, on) => {
  mock.clock(on, { now: NOON })
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('session.usage', () => ({
    value: {
      startedAt: 0,
      context: { tokens: 84_000, window: 200_000, percent: 42 },
      rateLimits: [
        { kind: 'five_hour', percentUsed: 23.5 },
        { kind: 'seven_day', percentUsed: 81 },
      ],
    },
  }))

  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect((await ui.find({ type: 'Text', text: /5h/ }))?.text).toBe('  5h ')
  expect((await ui.find({ type: 'Text', text: /^24%$/ }))?.props.color).toBe('success')
  expect((await ui.find({ type: 'Text', text: /7d/ }))?.text).toBe('  7d ')
  expect((await ui.find({ type: 'Text', text: /^81%$/ }))?.props.color).toBe('error')
  await ui.unmount()
})

test('off a subscription the band shows the context fill alone', async ($, on) => {
  mock.clock(on, { now: NOON })
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('session.usage', () => ({
    value: { startedAt: 0, context: { tokens: 84_000, window: 200_000, percent: 42 }, rateLimits: [] },
  }))

  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /5h|7d/ })).toBeUndefined()
  await ui.unmount()
})

test('each limit shows when it resets: the time today, the weekday and time later', async ($, on) => {
  mock.clock(on, { now: NOON })
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('session.usage', () => ({
    value: {
      startedAt: 0,
      context: { tokens: 84_000, window: 200_000, percent: 42 },
      rateLimits: [
        { kind: 'five_hour', percentUsed: 23, resetsAt: at(2, 15) },
        { kind: 'seven_day', percentUsed: 41, resetsAt: at(5, 9) },
      ],
    },
  }))

  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect((await ui.find({ type: 'Text', text: /15:00/ }))?.text).toBe(' (15:00)')
  expect((await ui.find({ type: 'Text', text: /09:00/ }))?.text).toBe(' (Thu 09:00)')
  await ui.unmount()
})

test('a limit without a reset time shows its percentage alone', async ($, on) => {
  mock.clock(on, { now: NOON })
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('session.usage', () => ({
    value: {
      startedAt: 0,
      context: { tokens: 84_000, window: 200_000, percent: 42 },
      rateLimits: [{ kind: 'five_hour', percentUsed: 23 }],
    },
  }))

  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect((await ui.find({ type: 'Text', text: /^23%$/ }))?.text).toBe('23%')
  expect(await ui.find({ type: 'Text', text: /\(\d+:\d+\)/ })).toBeUndefined()
  await ui.unmount()
})

test("the band ends with the mod's version, read from its plugin.json", async ($, on) => {
  mock.clock(on, { now: NOON })
  on('fs.read', (_, e) =>
    e.path.endsWith('/.claude-plugin/plugin.json')
      ? { value: JSON.stringify({ name: 'context-meter', version: '9.8.7' }) }
      : { value: '' },
  )
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('session.usage', () => ({
    value: { startedAt: 0, context: { tokens: 84_000, window: 200_000, percent: 42 }, rateLimits: [] },
  }))

  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect((await ui.find({ type: 'Text', text: /v9/ }))?.text).toBe('  v9.8.7')
  await ui.unmount()
})

test('a manifest it cannot read leaves the version out', async ($, on) => {
  mock.clock(on, { now: NOON })
  on('fs.read', () => {
    throw new Error('ENOENT')
  })
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('session.usage', () => ({
    value: { startedAt: 0, context: { tokens: 84_000, window: 200_000, percent: 42 }, rateLimits: [] },
  }))

  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect((await ui.find({ type: 'Text', text: /%/ }))?.text).toBe(' 42%')
  expect(await ui.find({ type: 'Text', text: /^\s*v\d/ })).toBeUndefined()
  await ui.unmount()
})
