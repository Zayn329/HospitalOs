# Database Schema

---

# User

Purpose

Stores authenticated users.

Fields

* _id
* firstName
* lastName
* email
* passwordHash
* roleId
* departmentId
* status
* createdAt
* updatedAt

Indexes

* email

---

# Role

Fields

* _id
* name
* permissions

---

# Patient

Fields

* _id
* hospitalId
* firstName
* lastName
* gender
* dateOfBirth
* phone
* email
* address
* bloodGroup
* allergies
* emergencyContact
* medicalHistory
* status
* createdAt
* updatedAt

Indexes

* hospitalId
* phone

---

# Doctor

Fields

* _id
* userId
* specialization
* department
* experience
* availability
* consultationFee
* status

Indexes

* specialization

---

# Appointment

Fields

* _id
* patientId
* doctorId
* appointmentDate
* appointmentTime
* appointmentType
* reason
* status
* createdAt
* updatedAt

Status

* requested
* confirmed
* checked_in
* completed
* cancelled

Indexes

* patientId
* doctorId
* appointmentDate

---

# Consultation

Fields

* _id
* appointmentId
* patientId
* doctorId
* symptoms
* diagnosis
* treatmentPlan
* status
* createdAt
* updatedAt

Status

* open
* in_progress
* completed

Indexes

* patientId
* doctorId

---

# Clinical Note

Fields

* _id
* consultationId
* content
* author
* createdAt

---

# Lab Report

Fields

* _id
* patientId
* consultationId
* reportType
* reportUrl
* summary
* uploadedAt
* reviewedAt
* status

Status

* ordered
* uploaded
* reviewed

---

# Prescription

Fields

* _id
* consultationId
* patientId
* medications
* instructions
* createdAt
* status

Status

* draft
* active
* completed

---

# Medication

Fields

* _id
* name
* dosage
* manufacturer
* stock
* expiryDate
* status

---

# Bill

Fields

* _id
* patientId
* consultationId
* totalAmount
* paymentStatus
* insuranceStatus
* createdAt

Payment Status

* pending
* paid
* refunded

---

# Notification

Fields

* _id
* recipientId
* type
* title
* message
* sentAt
* readAt
* status

---

# Audit Log

Fields

* _id
* actorId
* action
* resource
* resourceId
* timestamp
* metadata

---

# Entity Relationships

Patient

├── Appointments

├── Consultations

├── Lab Reports

├── Prescriptions

├── Bills

Doctor

├── Appointments

├── Consultations

Appointment

└── Consultation

Consultation

├── Clinical Notes

├── Prescription

└── Lab Reports

---

# Common Metadata

All major collections should contain

* createdAt
* updatedAt
* status

Critical records should additionally include

* createdBy

* updatedBy

* softDelete (optional where required)
s