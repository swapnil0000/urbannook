# Bugfix Requirements Document

## Introduction

A guest user who enters an incorrect email address during checkout becomes permanently locked out of their order. The OTP-based login flow sends a one-time password to the email on record — if that email is wrong, the OTP is unreachable and there is no alternative recovery path. The guest has their order ID but cannot authenticate to view or track the order.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a guest completes checkout with a typo or incorrect email THEN the system creates the order tied to that wrong email with no way to correct it
1.2 WHEN a guest attempts to log in via OTP using the wrong email THEN the system sends the OTP to the wrong email address, making it unreachable
1.3 WHEN a guest attempts to log in via OTP using their real (correct) email THEN the system returns "No account found with this email" because the order is tied to the wrong email
1.4 WHEN a guest lands on the GuestOrderConfirmation page THEN the system provides no mechanism to recover access using an alternative email or the order ID alone

### Expected Behavior (Correct)

2.1 WHEN a guest provides their order ID and a corrected email address THEN the system SHALL allow them to verify ownership and update the order's associated email
2.2 WHEN a guest requests an OTP for email correction THEN the system SHALL send the OTP to the newly provided email to confirm they own it
2.3 WHEN a guest successfully verifies the OTP for the corrected email THEN the system SHALL update the order's userEmail and the associated guest user account email to the verified address
2.4 WHEN a guest is on the GuestOrderConfirmation page THEN the system SHALL provide a visible option to correct the email address associated with their order

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a guest enters a correct email during checkout THEN the system SHALL CONTINUE TO create the order and send the OTP to that email without any change to the existing flow
3.2 WHEN a guest with a correct email uses OTP login THEN the system SHALL CONTINUE TO authenticate them and return a valid access token as before
3.3 WHEN a registered (non-guest) user places an order THEN the system SHALL CONTINUE TO handle their account and orders without being affected by the guest email correction flow
3.4 WHEN a guest has already successfully logged in via OTP THEN the system SHALL CONTINUE TO allow them to view their order history normally
