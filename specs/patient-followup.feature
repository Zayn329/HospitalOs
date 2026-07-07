Feature: Patient Follow-Up

  As a patient
  I want reminders after treatment
  So that I continue my recovery correctly.

  Scenario: Schedule follow-up
    Given a patient has been discharged
    When a follow-up is recommended
    Then the follow-up appointment should be scheduled
    And the patient should receive a reminder

  Scenario: Medication reminder
    Given medication instructions exist
    When the reminder time arrives
    Then the patient should receive a medication reminder

  Scenario: Missed follow-up
    Given a follow-up appointment is missed
    When the patient does not attend
    Then the system should notify the patient
    And offer available rescheduling options
