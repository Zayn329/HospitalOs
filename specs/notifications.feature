Feature: Notifications

  As a hospital user
  I want to receive important healthcare notifications
  So that I do not miss critical events.

  Scenario: Appointment reminder
    Given an appointment is scheduled
    When the reminder time arrives
    Then the patient should receive an appointment reminder

  Scenario: Prescription ready
    Given medication is ready for collection
    When the pharmacy completes preparation
    Then the patient should receive a notification

  Scenario: New laboratory report
    Given a laboratory report becomes available
    When the report is published
    Then the patient and doctor should be notified
