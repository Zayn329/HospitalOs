Project Context & AI Agent Directives

1. Tech Stack Overview

- Frontend: React.js, Tailwind CSS, shadcn/ui

- Backend (Main): Node.js, Express.js, MongoDB

- Backend (Agent/MCP Services): FastAPI

- AI Agent Frameworks: LangGraph, LangChain, LangSmith

---

2. Core Behavioral Rules

- Think Before You Act

Always plan and reason through a step-by-step breakdown before creating a feature, debugging, or fixing an error.

Explicitly state assumptions and surface technical tradeoffs before writing code.

- Halt on Ambiguity

If requirements are unclear or critical context is missing, stop and ask the user for clarification.

Never silently guess implementation details.

- Goal-Driven Execution

Break complex tasks into clear, sequential steps.

Define measurable success criteria (e.g., reproduce a bug with a failing test before implementing a fix).

- Consult Primary Sources

When framework-specific behavior is uncertain, prioritize official documentation for the project's technology stack.

---

3. Hard Code Guardrails

- Surgical Edits Only

Write only the minimum amount of code necessary to solve the immediate problem.

Restrict modifications to the exact lines required, leaving unrelated code untouched.

- Strict Scope Boundary

Always ask for explicit user approval before modifying more than one file.

- No Temporary Hacks

Never implement placeholders, band-aids, or workaround fixes.

Solve problems using production-grade, first-principles engineering.

- Backend First Principles

Follow production-ready architectural standards for Express.js and FastAPI.

Ensure proper validation, error handling, logging, and secure data handling.

---

4. Agent Skills Router

The following capabilities are available as Agent Skills. Do not guess their implementation. Load them dynamically whenever their trigger conditions are met.

Frontend & UI Skills

- "shadcn-ui-generator"

TRIGGER: Build, modify, or style React/Tailwind/shadcn UI components.

- "visual-critique-reviewer"

TRIGGER: Perform automated UI/UX and visual design reviews before finalizing frontend layouts.

---

Backend & Data Skills

- "database-operations"

TRIGGER: MongoDB schema changes, complex database queries, indexes, aggregations, or data migrations.

- "json-to-pydantic"

TRIGGER: Building FastAPI routes or converting JSON payloads/responses into strict Pydantic models.

- "api-contract-validator"

TRIGGER: Validating communication between the React frontend and Express/FastAPI backends to ensure strict API contracts and type safety.

---

Security & Quality Skills

- "stride-threat-modeling"

TRIGGER: Planning any major feature to identify architectural security risks before implementation.

- "automated-code-reviewer"

TRIGGER: Reviewing pull requests or code diffs for bugs, hardcoded secrets, edge cases, and maintainability issues.

- "tdd-test-generator"

TRIGGER: Before implementing a new feature, generate isolated failing tests (Pytest/Jest) following TDD principles.

---

Workflow Skills

- "git-commit-formatter"

TRIGGER: Creating commits after staging changes.

Automatically formats commit messages according to the Conventional Commits specification.
