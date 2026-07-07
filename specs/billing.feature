Feature: Billing

  As a billing administrator
  I want to generate accurate hospital bills
  So that patients are charged correctly.

  Scenario: Generate bill
    Given patient services have been completed
    When billing is requested
    Then a bill should be generated
    And all applicable charges should be included

  Scenario: Process payment
    Given an unpaid bill exists
    When payment is received
    Then the bill status should become Paid
    And a receipt should be generated

  Scenario: Attempt duplicate payment
    Given the bill has already been paid
    When another payment is submitted
    Then the payment should be rejected
