Feature: Medication Safety

  As a healthcare provider
  I want unsafe prescriptions to be identified
  So that patient safety is protected.

  Scenario: Allergy conflict detected
    Given the patient has a recorded allergy
    When a conflicting medication is prescribed
    Then the system should display an allergy warning

  Scenario: Drug interaction detected
    Given the patient is taking existing medications
    When a new medication interacts with them
    Then the interaction should be highlighted
    And the doctor should review before proceeding

  Scenario: Safe prescription
    Given no safety issues exist
    When the prescription is validated
    Then the prescription should be approved
