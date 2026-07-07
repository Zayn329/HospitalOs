# architecture/authentication.md

# Authentication Architecture

## Purpose

Authentication verifies the identity of every user accessing HospitalOS.

No user, service, or AI component should interact with protected resources without successful authentication.

Authentication answers one question:

> Who is making this request?

Authorization is handled separately.

---

# Supported User Types

* Patient
* Receptionist
* Doctor
* Laboratory Staff
* Pharmacist
* Billing Staff
* Administrator
* System Administrator

Every authenticated user belongs to one or more roles.

---

# Authentication Principles

HospitalOS follows these principles:

* Identity before access
* Least privilege
* Secure session management
* Token-based authentication
* Session expiration
* Complete auditability

---

# Authentication Flow

1. User submits credentials.
2. Credentials are verified.
3. Identity is established.
4. User roles are retrieved.
5. Authentication token/session is created.
6. Subsequent requests include authentication credentials.
7. Every protected request validates the user's identity.

---

# Session Management

Authenticated sessions should:

* Expire automatically
* Support logout
* Support token refresh where appropriate
* Prevent reuse of expired credentials

Long-lived credentials should be avoided.

---

# Password Policy

Passwords should:

* Be securely hashed.
* Never be stored in plain text.
* Never be logged.
* Never be returned by APIs.

Credential management must follow industry best practices.

---

# Multi-Factor Authentication

The architecture should support MFA for privileged users including:

* Administrators
* System Administrators

Support for additional roles may be introduced later.

---

# Service Authentication

Backend services communicating internally should authenticate each other using service identities rather than user credentials.

Internal services should never bypass authentication simply because they are inside the same network.

---

# AI Authentication

AI services should never authenticate as administrators.

They should execute under explicitly scoped service identities with only the permissions required for the requested task.

---

# Authentication Failures

When authentication fails:

* Access must be denied.
* The event should be logged.
* Sensitive information must not be revealed.
* Error messages should remain generic.

The system should never indicate whether a username exists.

---

# Security Principles

Authentication credentials must never appear in:

* Source code
* Git repositories
* Logs
* Client-side storage without appropriate protection

Secrets must be managed through secure secret management systems.

---

# Future Enhancements

The authentication architecture should support:

* Single Sign-On (SSO)
* OAuth
* Enterprise identity providers
* Hospital directory services
* Hardware security keys
* Biometric authentication where appropriate

The architecture should evolve without requiring changes to business logic.
