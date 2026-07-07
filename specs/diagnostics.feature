Feature: Diagnostics Management

  As a doctor
  I want to review diagnostic results
  So that I can make informed treatment decisions.

  Scenario: Upload a laboratory report
    Given a patient record exists
    When a laboratory report is uploaded
    Then the report should be linked to the patient's record

  Scenario: Review diagnostic results
    Given diagnostic reports are available
    When the doctor opens the patient's record
    Then all available reports should be displayed
    And abnormal findings should be clearly highlighted

  Scenario: Diagnostic report unavailable
    Given no reports exist
    When the doctor views diagnostics
    Then the system should indicate that no reports are available
