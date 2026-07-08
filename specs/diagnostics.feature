Feature: Diagnostics Management

  As a doctor
  I want to review lab reports and have abnormal findings automatically highlighted by AI
  So that I can quickly identify critical values and make informed treatment decisions.

  Scenario: Upload a laboratory report with AI parsing
    Given a patient record exists
    When the nurse uploads a laboratory report with text "Hemoglobin: 9.5 g/dL (Normal: 12-16), WBC: 12.5 K/uL (Normal: 4.5-11.0)"
    Then the Diagnostics Agent should parse the report
    And identify the findings as "abnormal"
    And generate an AI summary highlighting low Hemoglobin and high WBC
    And link the report to the patient record

  Scenario: Review diagnostic reports list
    Given diagnostic reports are available for a patient
    When the doctor opens the diagnostics tab
    Then all reports should be displayed
    And the abnormal reports should show a red warning indicator
    And the AI summary of abnormal findings should be clearly visible

  Scenario: Doctor signs off on lab report
    Given an abnormal lab report with status "pending_review"
    When the doctor reviews and marks it as "reviewed"
    Then the report status should become "reviewed"
    And the alert badge should clear

  Scenario: No diagnostic reports available
    Given no reports exist for a patient
    When the doctor views diagnostics
    Then the system should indicate that no reports are available
