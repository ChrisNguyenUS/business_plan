# Business Planning — Claude Instructions

## Superpowers Skills

This project uses the [Superpowers](https://github.com/obra/superpowers) skills framework. Skills are stored in `.claude/skills/`.

**Before any response or action**, invoke the `using-superpowers` skill to check which skills apply:

```
Skill("using-superpowers")
```

If there is even a 1% chance a skill applies, invoke it before proceeding.

### Available Skills

- `using-superpowers` — How to use the skills system (invoke first)
- `brainstorming` — Refine ideas before building
- `writing-plans` — Break work into detailed tasks
- `executing-plans` — Work through plans with checkpoints
- `subagent-driven-development` — Parallel subagent workflows
- `dispatching-parallel-agents` — Concurrent agent tasks
- `test-driven-development` — RED-GREEN-REFACTOR cycle
- `systematic-debugging` — Root cause analysis
- `verification-before-completion` — Verify before declaring done
- `requesting-code-review` — Pre-review checklist
- `receiving-code-review` — Responding to feedback
- `using-git-worktrees` — Isolated dev branches
- `finishing-a-development-branch` — Merge/PR decisions
- `writing-skills` — Create new skills
