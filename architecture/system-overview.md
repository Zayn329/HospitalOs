# architecture/system-overview.md

# HospitalOS System Overview

## Purpose

HospitalOS is an AI-native Hospital Operating System designed to streamline the complete healthcare workflow by combining traditional hospital management capabilities with intelligent AI agents.

Unlike conventional Hospital Management Systems (HMS), HospitalOS does not simply store information. It actively assists healthcare professionals throughout the patient journey while maintaining human oversight for all clinical decisions.

The platform is designed around the following principles:

* Single source of truth for patient information.
* Modular architecture that allows independent evolution of features.
* AI as an assistant, not a decision-maker.
* Secure handling of sensitive medical information.
* Interoperability through standardized integrations.
* Production-ready engineering practices.

---

# Primary Goals

HospitalOS should:

* Reduce repetitive administrative work.
* Improve access to patient information.
* Assist clinicians during consultations.
* Reduce documentation burden.
* Improve operational efficiency.
* Maintain complete auditability.
* Integrate with external healthcare systems.

---

# Core Components

## Web Application

Provides interfaces for:

* Receptionists
* Doctors
* Laboratory Staff
* Pharmacists
* Billing Staff
* Administrators
* Patients

---

## Backend Services

Responsible for:

* Business logic
* Authentication
* Authorization
* API layer
* Database access
* Event orchestration

---

## AI Services

Responsible for:

* Clinical assistance
* Documentation
* Knowledge retrieval
* Report summarization
* Medication validation
* Workflow automation

---

## Database

Stores persistent hospital data including:

* Patients
* Doctors
* Appointments
* Consultations
* Laboratory reports
* Prescriptions
* Billing
* Insurance
* Notifications
* Audit logs

---

## MCP Integrations

HospitalOS connects to external systems using MCP whenever appropriate.

Typical integrations include:

* Filesystem
* GitHub
* Calendar
* Notification providers
* Payment systems
* Knowledge bases
* Databases
* Browser automation

---

# High-Level Architecture

```
Users
    │
    ▼
React Frontend
    │
    ▼
Express API
    │
 ┌──┴─────────────┐
 │                │
 ▼                ▼
MongoDB      FastAPI AI Services
                  │
                  ▼
          LangGraph Agents
                  │
                  ▼
           External MCP Servers
```

---

# Request Lifecycle

1. User performs an action.
2. Frontend validates user input.
3. Backend authenticates the request.
4. Business rules are executed.
5. Database operations are performed if required.
6. AI services are invoked only when necessary.
7. External MCP servers are used for external resources.
8. A structured response is returned.

---

# Design Philosophy

The platform separates concerns into independent layers.

* UI handles presentation.
* Backend handles business rules.
* AI handles reasoning.
* MCP handles external integrations.
* Database handles persistence.

No layer should assume responsibility belonging to another layer.

---

# Scalability Goals

The architecture should support:

* Multiple hospitals
* Thousands of concurrent users
* Additional AI agents
* New MCP integrations
* Mobile applications
* Third-party integrations
* Future microservice migration without major rewrites

---

# Non-Goals

HospitalOS is not intended to:

* Replace licensed medical professionals.
* Make autonomous clinical decisions.
* Lock hospitals into proprietary integrations.
* Depend on a single AI provider.

AI always provides assistance, while healthcare professionals retain final authority.
