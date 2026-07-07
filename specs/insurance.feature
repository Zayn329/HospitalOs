Feature: Insurance Processing

  As a billing administrator
  I want insurance information to be verified
  So that eligible claims are processed correctly.

  Scenario: Verify insurance eligibility
    Given a patient provides insurance details
    When eligibility is checked
    Then the insurance status should be displayed

  Scenario: Submit insurance claim
    Given treatment has been completed
    When the claim is submitted
    Then the claim should be recorded
    And its status should be tracked

  Scenario: Invalid insurance information
    Given incorrect insurance details
    When verification is attempted
    Then the claim should not proceed
    And the user should be informed of the issue
