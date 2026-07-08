Feature: Patient Consultation

  As a doctor
  I want all relevant patient information and AI assistance during a consultation
  So that I can make informed clinical decisions and document care accurately.

  Scenario: Start a consultation
    Given a checked-in patient
    When the doctor opens the consultation
    Then the patient's medical history should be available
    And previous prescriptions should be displayed
    And allergies should be visible
    And recent laboratory results should be accessible

  Scenario: Complete a consultation
    Given an active consultation
    When the doctor records findings and treatment
    Then the consultation should be saved
    And the patient's medical record should be updated
    And the appointment status should become "completed"

  Scenario: AI SOAP notes generation
    Given an active consultation with doctor findings and treatment plan
    When the doctor requests clinical notes generation
    Then the AI Scribe should generate structured SOAP format clinical notes
    And the doctor should review and approve them before completion

  Scenario: AI Allergy warning check
    Given a patient has allergy "Penicillin"
    When the doctor proposes a prescription for "Amoxicillin" during consultation
    Then the system should trigger an allergy safety alert
    And require the doctor's override reason or change of medication

  Scenario: Prevent double-consultation start
    Given the consultation status is already "completed"
    When the doctor attempts to open the consultation
    Then the system should reject the request
    And indicate the consultation is already completed
