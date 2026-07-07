Feature: Audit Trail

  As a hospital administrator
  I want important system activities recorded
  So that actions remain traceable and accountable.

  Scenario: Record user activity
    Given a user updates patient information
    When the update is completed
    Then the action should be recorded in the audit log

  Scenario: View audit history
    Given audit records exist
    When an administrator reviews system activity
    Then the relevant audit entries should be displayed

  Scenario: Preserve historical records
    Given patient information has changed
    When previous records are requested
    Then historical versions should remain available
