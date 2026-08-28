# AGENTS.md

## Repository Instructions & AI Agent Guidelines

### Project Architecture
HospitalOS is a monorepo containing:
* **Express Backend (`apps/api`):** Node.js REST API server with TypeScript, Mongoose models, and Zod input validation.
* **Vite React Frontend (`apps/web`):** Tailwind CSS, Lucide icons, and React workspace components.
* **Python FastAPI AI Service (`services/ai`):** Specialized agents for triage, clinical scribing, billing, and medication safety.
* **MediKiosk AI Intake Engine (`apps/api/src/routes/medikiosk.ts`):** Pre-consultation voice/touch history, OCR document digitization, AYUSH/SOCRATES adaptive questioning, and DPDP/ABDM compliance.

### Development & Verification Instructions
* **Backend Unit Tests:** Run `npm test --prefix apps/api`.
* **MediKiosk Unit Tests:** Run `npx tsx --test apps/api/src/routes/medikiosk.test.ts`.
* **BDD Specs:** Specifications are located in `specs/`, including `specs/medikiosk-intake.feature`.
* **Runtime Agent Guidelines:** Agent specifications are located in `runtime-agents/`, including `runtime-agents/medikiosk-intake-agent.md`.

### Safety & Compliance Rules
1. Never persist unconsented patient data.
2. Ensure MediKiosk intake sessions wipe ephemeral memory after submission (`DELETE /api/v1/medikiosk/session/:id`).
3. Always mark AI-generated summaries as draft until signed off by the treating physician.
