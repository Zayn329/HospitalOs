Feature: Patient Consultation

  As a doctor
  I want all relevant patient information during a consultation
  So that I can make informed clinical decisions.

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
