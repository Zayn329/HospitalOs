Feature: Patient Discharge

  As a doctor
  I want to discharge a patient
  So that the patient receives complete post-treatment information.

  Scenario: Discharge a patient
    Given treatment has been completed
    When the doctor approves discharge
    Then discharge instructions should be generated
    And prescribed medications should be included
    And follow-up recommendations should be recorded

  Scenario: Prevent incomplete discharge
    Given required discharge information is missing
    When discharge is attempted
    Then the system should prevent discharge
    And identify the missing information
