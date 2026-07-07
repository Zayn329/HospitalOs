# Seed Data Plan

## Purpose

Seed data provides a realistic hospital environment for development, testing, demonstrations, and hackathons.

The objective is to demonstrate a complete patient journey without manually entering data.

---

# Users

Create:

* 1 System Administrator
* 1 Hospital Administrator
* 1 Receptionist
* 2 Doctors
* 1 Laboratory Technician
* 1 Pharmacist
* 1 Billing Executive

---

# Doctors

Doctor 1

Department

Cardiology

Doctor 2

Department

General Medicine

---

# Patients

Patient 1

Returning patient

Previous consultation

Previous prescription

Existing laboratory report

Upcoming appointment

---

Patient 2

New patient

No medical history

New appointment

---

# Appointments

Appointment 1

Patient 1

Confirmed

Today's date

---

Appointment 2

Patient 2

Checked In

Ready for consultation

---

# Consultation

One completed consultation

Includes

* symptoms
* diagnosis
* treatment plan

---

# Clinical Notes

SOAP note

Consultation summary

---

# Laboratory Report

Blood Test

Status

Reviewed

Contains

* uploaded report
* AI summary

---

# Prescription

One active prescription

Contains

* multiple medicines
* dosage
* instructions

---

# Medication Inventory

Include approximately

* 10 commonly used medicines

Stock available

---

# Billing

One completed bill

One pending bill

---

# Notifications

Appointment reminder

Prescription ready

Lab report available

---

# Audit Logs

Generate audit records for

* Patient registration
* Appointment booking
* Consultation completion
* Prescription creation
* Bill payment

---

# Demo Journey

The seed data should support the following 5-minute demonstration:

1. Reception opens Patient 2.
2. Patient checks in.
3. Doctor begins consultation.
4. AI generates clinical notes.
5. Laboratory report is reviewed.
6. Prescription is created.
7. Medication safety is verified.
8. Bill is generated.
9. Patient receives discharge instructions.
10. Follow-up reminder is scheduled.

All seed data should support this journey without requiring manual database edits during the demo.
