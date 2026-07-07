Feature: Authentication and Role-Based Access

  As a hospital user
  I want secure access based on my role
  So that confidential information remains protected.

  Scenario: Successful login
    Given a valid user account
    When valid credentials are provided
    Then access should be granted
    And the appropriate dashboard should be displayed

  Scenario: Unauthorized access
    Given a receptionist is logged in
    When attempting to access administrator functions
    Then access should be denied

  Scenario: Invalid credentials
    Given an incorrect username or password
    When login is attempted
    Then authentication should fail
    And the user should be informed
