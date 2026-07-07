Feature: Prescription Management

  As a doctor
  I want to prescribe medications digitally
  So that prescriptions are accurate and accessible.

  Scenario: Create a prescription
    Given an active consultation
    When the doctor prescribes medication
    Then the prescription should be saved
    And linked to the patient's record

  Scenario: Modify a prescription
    Given an existing prescription
    When the doctor updates the medication
    Then the latest prescription should replace the previous version
    And the modification should be recorded

  Scenario: Prescription without medication
    Given no medication has been selected
    When the doctor attempts to issue the prescription
    Then the prescription should not be generated
