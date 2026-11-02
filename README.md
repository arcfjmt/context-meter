# context-meter

A Claude Code mod that shows how full the context window is, as a bar just above the prompt, with the plan's usage limits beside it:

```
Context ████████░░░░░░░░░░░░ 42% (84k / 200k)  5h 23% (15:00)  7d 41% (Thu 09:00)  v0.4.0
```

- The bar is green under 50%, yellow under 80%, and red from 80%.
- The figures are the status line's: the input tokens of the last response over the model's context window.
- `5h` and `7d` are how much of the plan's 5-hour and weekly usage limits is used, as `/usage` reports them, in the same colors. In parentheses is when each resets, in local time: the time alone when it is today, the weekday and time when it is later. They show only on a Claude subscription, once a response has reported them.
- At the end is the mod's own version, read from its `plugin.json`.
- It updates after every turn. Before the first response there is nothing to show, so the row stays empty.

## Install

At the prompt of a Claude Code terminal session:

```
/plugin install context-meter --marketplace arcfjmt/context-meter
```

Answer `y` to add the marketplace, then pick a scope (user scope shows it in every session).

## Develop

```
claude plugin validate .
claude plugin test .
claude --plugin-dir .
```
