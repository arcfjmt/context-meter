# context-meter

A Claude Code mod that shows how full the context window is, as a bar just above the prompt:

```
Context ████████░░░░░░░░░░░░ 42% (84k / 200k)
```

- The bar is green under 50%, yellow under 80%, and red from 80%.
- The figures are the status line's: the input tokens of the last response over the model's context window.
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
