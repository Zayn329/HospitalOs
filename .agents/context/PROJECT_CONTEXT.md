# PROJECT_CONTEXT.md

# HospitalOS — Project Context

## Purpose

HospitalOS is an AI-native Hospital Operating System built to demonstrate how modern AI technologies can improve healthcare workflows while maintaining human oversight.

Unlike traditional Hospital Management Systems that primarily store information, HospitalOS actively assists hospital staff throughout the patient journey using specialized AI agents and standardized integrations.

This project is being developed primarily for a hackathon and portfolio demonstration while following production-inspired Agentic Engineering principles.

---

# Project Vision

Build a modern hospital platform that demonstrates how AI can assist—not replace—healthcare professionals.

The system should reduce repetitive administrative work, improve access to information, automate documentation, and provide intelligent assistance throughout the patient's journey.

Every AI-generated recommendation remains subject to human review and approval.

---

# Primary Objectives

The project should demonstrate:

* AI-assisted healthcare workflows
* Multi-agent architecture
* Modern full-stack engineering
* Clean software architecture
* Production-inspired development practices
* Modular system design
* Standardized integrations using MCP

The objective is not to build a complete enterprise Hospital Management System but to build a polished, realistic prototype that showcases strong engineering practices.

---

# Core Demonstration Flow

The primary demonstration follows a single patient from arrival to discharge.

Patient Registration

↓

Appointment

↓

Patient Check-In

↓

Doctor Consultation

↓

Clinical Documentation

↓

Laboratory Report Review

↓

Prescription Generation

↓

Medication Safety Check

↓

Billing

↓

Discharge

↓

Patient Follow-up

Every implemented feature should contribute to this demonstration journey.

---

# Technology Stack

## Frontend

* React
* Vite
* Tailwind CSS
* shadcn/ui
* React Router
* TanStack Query

---

## Backend

* Node.js
* Express.js
* MongoDB

---

## AI Services

* FastAPI
* LangGraph
* LangChain
* LangSmith

---

## Development

* TypeScript
* Git
* Docker (optional)
* MCP

---

# Project Structure

The project is organized into several major areas.

* apps/
* services/
* agents/
* skills/
* specs/
* contracts/
* database/
* architecture/
* shared/
* tests/

Each folder has a single responsibility.

Detailed organization is documented in the Architecture folder.

---

# Source of Truth Hierarchy

When multiple documents describe the same concept, follow this priority.

1. BDD Specifications (`specs/`)
2. Domain Contracts (`contracts/`)
3. Database Design (`database/`)
4. Architecture Documents (`architecture/`)
5. AGENTS.md
6. Development Skills (`skills/`)

Business behaviour should always be derived from the BDD specifications.

---

# Development Philosophy

Development follows an implementation-first workflow driven by specifications.

The expected sequence is:

BDD

↓

Database Design

↓

Contracts

↓

Backend

↓

Frontend

↓

AI Integration

↓

Testing

Every feature should be completed independently before moving to the next feature whenever possible.

---

# AI Development Workflow

The coding agent should follow this process whenever implementing a feature.

1. Read the relevant BDD specification.
2. Identify the corresponding domain contract.
3. Review the database schema.
4. Load any required development skills.
5. Generate backend components.
6. Generate frontend components.
7. Generate tests.
8. Verify behaviour against the original BDD specification.

The agent should avoid making architectural assumptions not supported by the project documents.

---

# AI Development Skills

Development Skills provide specialized engineering knowledge.

Typical skills include:

* Database Operations
* API Contract Validation
* shadcn UI Generation
* TDD Test Generation
* Code Review
* JSON to Pydantic
* Git Commit Formatting
* Visual Critique

Skills are loaded only when relevant to the current task.

---

# Runtime AI Agents

HospitalOS contains specialized runtime AI agents.

These are application features and should not be confused with Development Skills.

Current agents include:

* Reception Agent
* Clinical Assistant
* Medical Scribe
* Diagnostics Agent
* Medication Safety Agent
* Billing Agent
* Patient Care Agent
* Operations Intelligence Agent
* Knowledge Agent

These agents collaborate to assist users throughout the patient journey.

---

# MCP Usage

HospitalOS uses external MCP servers whenever standardized integrations are available.

Typical integrations include:

* Filesystem
* Git
* GitHub
* MongoDB
* Browser Automation
* Playwright
* Context7

Business logic should remain independent of any specific MCP implementation.

---

# Engineering Principles

The project follows these principles:

* Build only what the current feature requires.
* Avoid unnecessary complexity.
* Keep responsibilities modular.
* Prefer composition over duplication.
* Maintain clear separation between frontend, backend, AI, and data layers.
* Human approval remains required for important healthcare decisions.
* AI augments users rather than replacing them.

---

# Implementation Priorities

Features should generally be implemented in the following order.

1. Project Scaffolding
2. Authentication
3. Patient Registration
4. Appointment Management
5. Patient Check-In
6. Consultation Workspace
7. Medical Documentation
8. Diagnostics
9. Prescription Management
10. Medication Safety
11. Billing
12. Patient Portal
13. Notifications
14. Analytics

Additional features should only be added after the core patient journey is complete.

---

# Definition of Done

A feature is considered complete when:

* The BDD scenarios pass.
* Backend implementation is complete.
* Frontend implementation is complete.
* Database integration is complete.
* Required AI functionality is implemented (if applicable).
* Validation and error handling are present.
* The feature integrates cleanly into the end-to-end patient journey.

---

# Project Goal

HospitalOS should demonstrate that modern AI engineering can produce software that is modular, maintainable, and genuinely useful in real-world healthcare workflows.

The emphasis of this project is not on the number of features implemented, but on the quality of the architecture, user experience, AI integration, and engineering practices demonstrated during the final hackathon presentation.
