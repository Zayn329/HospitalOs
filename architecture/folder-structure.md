# architecture/folder-structure.md

# Project Structure

This document defines the canonical folder structure for HospitalOS.

Every contributor and AI coding agent should follow this structure unless an Architecture Decision Record (ADR) explicitly changes it.

---

# Root Structure

```text
apps/
services/
packages/
agents/
skills/
specs/
contracts/
architecture/
shared/
scripts/
tests/
configs/
docker/
docs/
```

---

# apps/

Contains deployable applications.

```
apps/

    web/
        React
        Tailwind
        shadcn/ui

    api/
        Express API
```

No business logic should live inside UI components.

---

# services/

Contains backend services.

Example:

```
services/

    ai/

    notifications/

    billing/

    authentication/

    analytics/
```

Each service owns one business responsibility.

---

# packages/

Reusable shared libraries.

Examples:

* API clients
* Shared models
* Utility libraries
* Validation
* Common types

Packages must remain framework-agnostic whenever possible.

---

# agents/

Contains runtime AI agent implementations.

Examples:

```
ReceptionAgent

ClinicalAssistant

MedicalScribe

Diagnostics

MedicationSafety

Billing

PatientCare

Knowledge

Operations
```

Each agent must own exactly one responsibility.

---

# skills/

Development-only Agent Skills.

Each skill contains:

```
skill-name/

SKILL.md

references/

scripts/

assets/
```

Skills are never used by the HospitalOS application itself.

They exist solely to improve AI-assisted software development.

---

# specs/

Business Behaviour Specifications.

Contains BDD `.feature` files.

Each feature describes system behaviour rather than implementation.

---

# contracts/

Contains API contracts.

Examples:

* Request schemas
* Response schemas
* Event contracts
* JSON examples
* OpenAPI specifications

Contracts define communication, not implementation.

---

# architecture/

Contains architecture documentation.

These documents explain how the platform is organised.

They are considered the architectural source of truth.

---

# shared/

Reusable resources shared across applications.

Examples:

* constants
* validation
* logging
* configuration
* permissions

---

# tests/

Organised by testing type.

```
unit/

integration/

e2e/

performance/

ai-evaluations/
```

BDD specifications are not stored here.

---

# scripts/

Development automation.

Examples:

* migrations
* generators
* validation
* database seeding

Scripts should remain deterministic.

---

# docs/

General documentation.

Examples:

* onboarding
* deployment
* user guides

Architecture documents should not be duplicated here.

---

# Engineering Rules

* One folder should represent one responsibility.
* Business logic belongs in services.
* UI remains presentation-focused.
* Shared code must not create circular dependencies.
* AI logic stays inside the AI layer.
* External integrations remain isolated.
* Specifications should remain implementation-independent.

Following these rules ensures the project remains maintainable as additional developers and AI agents contribute.
