Feature: Clinical Knowledge Search

  As a hospital staff member
  I want to search hospital knowledge
  So that I can quickly find reliable information.

  Scenario: Search hospital policy
    Given hospital policies exist
    When a staff member searches for a policy
    Then relevant policy documents should be displayed

  Scenario: Search clinical guideline
    Given clinical guidelines are available
    When the doctor searches for a medical guideline
    Then the most relevant guideline should be returned

  Scenario: No matching information
    Given no matching documents exist
    When a search is performed
    Then the system should indicate that no relevant information was found
