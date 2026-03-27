# CLAUDE.md — AI Assistant Guide for Mearas

This file provides instructions and context for AI coding assistants (Claude, Copilot, etc.) working in this repository. Keep it up to date as the project evolves.

---

## Repository Overview

**Mearas** is a project maintained by [mearassports](https://github.com/mearassports). This repository is currently in initial setup. Update this section with a description of the project's purpose, domain, and high-level architecture once development begins.

---

## Project Status

> **This repository is new and has no source code yet.** The sections below establish conventions and workflows to follow as the project is built out. Update this file whenever the stack, structure, or workflows change.

---

## Directory Structure

Populate this section once the initial structure is established. A typical layout to aim for:

```
Mearas/
├── CLAUDE.md          # This file
├── README.md          # User-facing project documentation
├── .github/
│   └── workflows/     # CI/CD pipeline definitions
├── src/               # Primary source code
├── tests/             # Automated tests
├── docs/              # Extended documentation
└── ...
```

---

## Development Workflow

### Branching Strategy

- **`main`** — production-ready code only; protected branch
- **`develop`** (or `dev`) — integration branch for completed features
- **`feature/<short-description>`** — new features; branch from `develop`
- **`fix/<short-description>`** — bug fixes; branch from `develop` or `main` (hotfix)
- **`claude/<description>`** — branches created by AI assistants for their work

Never push directly to `main`. All changes go through pull requests.

### Commit Message Convention

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <short summary>

[optional body]

[optional footer]
```

**Types:** `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `ci`

Examples:
```
feat(auth): add JWT-based login endpoint
fix(api): handle null response from payment provider
docs: update setup instructions in README
chore: upgrade dependency versions
```

### Pull Request Guidelines

- Keep PRs small and focused on a single concern
- Include a clear description of **what** changed and **why**
- Reference related issues: `Closes #42`
- All CI checks must pass before merging
- Require at least one review for `main`-targeting PRs

---

## Setup & Installation

> To be filled in once the tech stack is decided. Document steps to:
> 1. Clone the repository
> 2. Install dependencies
> 3. Configure environment variables (provide a `.env.example`)
> 4. Run the application locally
> 5. Run the test suite

---

## Testing

> Document the testing framework, how to run tests, and coverage expectations once chosen.

General expectations:
- New features must ship with tests
- Bug fixes should include a regression test
- Aim for meaningful coverage over 100% line coverage

---

## Code Style & Conventions

> Fill in language- and framework-specific linting/formatting rules once the stack is chosen. General rules:

- Use a linter and formatter (e.g., ESLint + Prettier for JS/TS, Black + Ruff for Python)
- Formatting is enforced in CI — do not skip it
- No commented-out code in merged PRs
- Prefer explicit over clever

---

## Environment Variables

> Document all required environment variables in `.env.example`. Never commit secrets.

| Variable | Description | Required |
|----------|-------------|----------|
| *(none yet)* | | |

---

## CI/CD

> Document the CI/CD pipeline once configured. Include:
> - What triggers a build (push, PR, tag)
> - What checks run (lint, test, build, deploy)
> - Where artifacts are deployed

---

## AI Assistant Instructions

The following rules apply specifically when an AI assistant (Claude, Copilot, etc.) is working in this repository:

### Do
- Read `CLAUDE.md` at the start of every session
- Follow the branching strategy above — develop on `claude/<description>` branches
- Write tests for any non-trivial logic you introduce
- Keep changes minimal and focused — do not refactor unrelated code
- Commit with clear conventional commit messages
- Push to the designated branch and do **not** create a pull request unless explicitly asked

### Do Not
- Push to `main` or `develop` directly
- Introduce new dependencies without confirming with the user
- Delete files or branches without explicit instruction
- Leave debugging code, `console.log`, `print()`, or TODO comments without flagging them
- Generate or guess URLs unless directly related to programming help
- Add unnecessary boilerplate, comments, or docstrings to unchanged code

### Sensitive Files
Never read or commit:
- `.env` files (use `.env.example` as reference)
- Files matching `*secret*`, `*credential*`, `*key*`, `*token*`
- `~/.ssh/` or any key material

---

## Getting Help

- File bugs and feature requests in the [GitHub Issues](https://github.com/mearassports/Mearas/issues)
- For Claude Code questions: `/help` in the CLI or https://github.com/anthropics/claude-code/issues
