Feature: Patient Portal

  As a patient
  I want to access my healthcare information online
  So that I can manage my healthcare journey independently.

  Scenario: View medical records
    Given I am logged into my patient account
    When I open my medical records
    Then I should see my consultation history
    And my laboratory reports
    And my prescriptions

  Scenario: Download a medical report
    Given a report is available
    When I request to download it
    Then the report should be available for download

  Scenario: No records available
    Given I have no medical history
    When I open my records
    Then the system should indicate that no records are available
