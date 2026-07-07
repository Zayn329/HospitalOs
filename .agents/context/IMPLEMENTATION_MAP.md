# IMPLEMENTATION_MAP.md

# Purpose

This document defines **how each business feature should be implemented**.

BDD specifications describe **what** the system must accomplish.

This document specifies **how the implementation should be approached**, including required AI capabilities, runtime agents, LangGraph orchestration, MCP integrations, and minimum intelligence expectations.

This prevents implementation from degrading into simple CRUD applications.

---

# Implementation Categories

## Standard CRUD

Traditional frontend, backend and database implementation.

No AI required.

Example:

Authentication

Role Management

---

## AI Assisted

Traditional application behaviour enhanced by one or more AI agents.

AI assists the user but does not make autonomous decisions.

LangGraph should be used whenever multiple reasoning steps or tool invocations are required.

---

## Intelligent Workflow

Multiple AI agents collaborate to complete a workflow.

The workflow should be orchestrated through LangGraph.

External systems should be accessed through MCP whenever appropriate.

---

# Runtime Agent Catalogue

Reception Agent

Responsible for:

* patient registration assistance
* appointment assistance
* hospital navigation

---

Clinical Assistant

Responsible for:

* retrieving patient history
* summarising previous visits
* highlighting allergies
* surfacing relevant information

---

Medical Scribe

Responsible for:

* consultation notes
* SOAP generation
* discharge summaries

---

Diagnostics Agent

Responsible for:

* laboratory report summarisation
* abnormal finding detection
* diagnostic explanations

---

Medication Safety Agent

Responsible for:

* allergy checking
* interaction checking
* duplicate medication detection
* dosage validation

---

Billing Agent

Responsible for:

* billing explanation
* insurance support
* payment assistance

---

Patient Care Agent

Responsible for:

* discharge instructions
* reminders
* follow-up planning

---

Knowledge Agent

Responsible for:

* hospital SOP retrieval
* clinical guideline retrieval
* policy search

---

Operations Intelligence Agent

Responsible for:

* analytics
* operational insights
* hospital dashboards

---

# MCP Catalogue

Knowledge MCP

Provides retrieval over hospital documentation.

---

Filesystem MCP

Provides controlled filesystem access.

---

MongoDB MCP

Provides database inspection.

---

Browser / Playwright MCP

Used for browser automation and testing.

---

GitHub MCP

Repository interaction.

---

Context7 MCP

Framework documentation retrieval.

---

Future runtime integrations may include:

* Laboratory MCP
* Pharmacy MCP
* Insurance MCP
* Calendar MCP
* Notification MCP
* Payment MCP

---

# Feature Implementation Map

## Patient Registration

Implementation

Standard CRUD

Runtime Agent

Reception Agent (optional assistance)

LangGraph

No

MCP

None required

Minimum Intelligence

Suggest possible duplicate patients before creating a new record.

---

## Appointment Management

Implementation

AI Assisted

Runtime Agent

Reception Agent

LangGraph

Optional

MCP

Calendar MCP (future)

Minimum Intelligence

Suggest available appointment slots and reduce scheduling conflicts.

---

## Patient Check-In

Implementation

Standard CRUD

Runtime Agent

Reception Agent

LangGraph

No

MCP

None

Minimum Intelligence

Automatically update patient workflow state.

---

## Patient Consultation

Implementation

Intelligent Workflow

Runtime Agents

Clinical Assistant

Medical Scribe

Knowledge Agent

LangGraph

Required

MCP

Knowledge MCP

Future EMR MCP

Minimum Intelligence

Retrieve relevant patient history.

Generate consultation assistance.

Generate structured clinical notes.

Surface relevant medical knowledge.

---

## Medical Documentation

Implementation

AI Assisted

Runtime Agent

Medical Scribe

LangGraph

Required

Minimum Intelligence

Generate structured consultation documentation instead of plain text storage.

---

## Diagnostics

Implementation

AI Assisted

Runtime Agent

Diagnostics Agent

LangGraph

Required

Future MCP

Laboratory MCP

Minimum Intelligence

Summarise reports and highlight abnormal findings.

---

## Prescription Management

Implementation

Standard CRUD

Runtime Agent

None

LangGraph

No

Minimum Intelligence

Generate structured prescriptions.

---

## Medication Safety

Implementation

AI Assisted

Runtime Agent

Medication Safety Agent

LangGraph

Required

Future MCP

Pharmacy MCP

Minimum Intelligence

Check allergies.

Check interactions.

Check duplicate medications.

Warn before prescription completion.

---

## Billing

Implementation

AI Assisted

Runtime Agent

Billing Agent

LangGraph

Optional

Future MCP

Insurance MCP

Payment MCP

Minimum Intelligence

Explain billing items and support insurance verification.

---

## Patient Follow-up

Implementation

AI Assisted

Runtime Agent

Patient Care Agent

LangGraph

Required

Future MCP

Notification MCP

Calendar MCP

Minimum Intelligence

Generate reminders and personalised follow-up plans.

---

## Patient Portal

Implementation

Standard Web Application

Runtime Agent

None

LangGraph

No

Minimum Intelligence

Display healthcare information clearly.

---

## Notifications

Implementation

Standard Backend Service

Runtime Agent

Patient Care Agent (future)

LangGraph

No

Minimum Intelligence

Deliver reminders through configured channels.

---

## Clinical Knowledge

Implementation

AI Assisted

Runtime Agent

Knowledge Agent

LangGraph

Required

MCP

Knowledge MCP

Minimum Intelligence

Answer questions using retrieved hospital documentation rather than model memory.

---

## Hospital Analytics

Implementation

AI Assisted

Runtime Agent

Operations Intelligence Agent

LangGraph

Optional

Minimum Intelligence

Generate operational insights from hospital data.

---

## Authentication

Implementation

Standard Backend

AI

None

---

## Audit Logs

Implementation

Standard Backend

AI

None

---

# Mandatory Implementation Rules

Before implementing any feature:

1. Read the corresponding BDD specification.
2. Read the related domain contract.
3. Consult this Implementation Map.
4. Load the required development skills.
5. If the feature is marked **AI Assisted** or **Intelligent Workflow**, implement the required runtime agents and LangGraph orchestration.
6. Do not replace required AI workflows with static CRUD logic simply because it is easier to implement.
7. If an MCP integration is marked as "future" and is unavailable during the hackathon, abstract the integration behind an interface so it can be added later without changing business logic.

---

# Guiding Principle

The objective of HospitalOS is not to demonstrate CRUD development.

The objective is to demonstrate modern AI-native software engineering where traditional application logic, runtime AI agents, LangGraph workflows, and MCP integrations work together to improve healthcare workflows while maintaining human oversight.
