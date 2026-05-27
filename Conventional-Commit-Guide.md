# Conventional Commit Standard

This document defines the **Conventional Commits** specification as implemented for this repository. Adherence to this standard is mandatory for all commits to ensure maintainability and automated Changelog generation.

## 1. Commit Message Structure

Every commit message must follow the following format:

```html
<type>[optional scope]: <subject>

[optional body]

[optional footer(s)]
```

## 2. Commit Types (Mandatory)

Each commit must start with one of the following types:

| Type | Description | Scope | Example |
| :--- | :--- | :--- | :--- |
| **`feat`** | A new feature for the end-user. | Project, Feature, UI | `feat: introduce custom cursor` |
| **`fix`** | A bug fix for the end-user. | Project, Component, Logic | `fix: resolve scroll lag on mobile` |
| **`docs`** | Documentation only changes. | README, Contributing, Context | `docs: update project overview` |
| **`style`** | Formatting, missing semi-colons, etc. | CSS, UI, Assets | `style: update hover transition timing` |
| **`refactor`** | Code cleanup; no feature or fix. | Component, Utility, Architecture | `refactor: simplify parallax calculations` |
| **`chore`** | Build process, tooling, dependencies. | Dependencies, GitHub, Config | `chore: update next.js version` |
| **`perf`** | Performance improvements. | Optimization, Loading, Rendering | `perf: implement lazy loading for assets` |
| **`test`** | Adding or correcting tests. | Tests, Specs | `test: add unit tests for Hero` |
| **`ci`** | CI configuration and scripts. | GitHub Actions, Deploy | `ci: update workflow triggers` |
| **`revert`** | Reverts a previous commit. | Any | `revert: "feat: add initial parallax"` |

---

## 3. Scopes (mandatory)

Scopes provide context about the change. Format as `<type>(scope):`. Examples:

- `(project)`
- `(cursor)`
- `(hero)`
- `(performance)`
- `(ui)`

Example: `feat(hero): implement high-fidelity background image`

---

## 4. Commit Body (mandatory)

- Use the body to explain the **what** and **why**, not the **how**.
- Describe the problem and the solution.
- Use imperative mood (e.g., "Fixes...", not "Fixed...").

---

## 5. Commit Footer (mandatory)

Use footers for metadata:

- Breaking changes: `BREAKING CHANGE: <description>`
- Related issues: `Fixes #45`, `Closes #22`
- References: `See: [context.md](file:///c:/Users/CarixStudio/my-portfolio-website/context.md)`

---

## 6. Imperative Mood (Mandatory)

- Write commit subjects in the **imperative mood**.
- Write as if giving a command to the codebase.
- Use verbs like `Add`, `Fix`, `Refactor`, `Update`, `Remove`, `Implement`.

**Good**:

- `feat: add parallax scrolling effect`
- `fix: resolve mobile layout shift`

**Bad**:

- `feat: added parallax scrolling effect`
- `fix: fixed mobile layout shift`

---

## 7. Git Commit Rules

1. **One logical change per commit**.
2. **Never commit corrupted references**.
3. **Use `git fsck` to verify repository health**.
4. **Maintain branch integrity**.

---

## 8. Documentation Updates

- When a significant feature is added, update `context.md`.
- List the feature under **Completed Milestones**.
- Update the **Last Updated** date.
