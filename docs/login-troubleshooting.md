# Operational login troubleshooting

The website authenticates the password with Firebase, exchanges the Firebase ID token at `POST /api/v1/auth/firebase`, then confirms the operational profile at `GET /api/v1/auth/profile`. Only the Firebase request receives the password. No operational password is required by this login flow.

Successful Firebase authentication does not create an employee, grant a role or activate operational access. The same Firebase UID must be linked to an operational user with an active employee, supported role, store and company. Complete the existing authorized employee/invitation process; do not bypass access checks or automatically link accounts using an unverified email address.

Distinguish these failures:

| Stage | Check |
|---|---|
| Firebase | Email/password provider, credentials, public web API key and correct Firebase project. |
| Operational session | API Firebase project, UID binding, active employee assignment, supported role and database bootstrap permissions. |
| Profile | Session validation, current employee visibility and protected profile-data configuration. |
| Network/server | API URL, CORS origin, cold start and service health. A server outage is not an invalid password. |

A session/profile `401` or `403` after Firebase success must not tell the user to change the operational password. It must keep access denied and direct the user to review the operational registration. Invalid or inactive profiles must never publish an authenticated UI session.

The automated contract tests cover all four supported role labels, password isolation, rejected sessions/profiles, server failures, malformed Firebase responses and logout during login. They use synthetic responses; passing them does not prove that a particular production employee has been provisioned.

For production investigation, compare the affected account with the exact database configured in the deployed API. Use read-only queries and do not paste passwords, tokens, decrypted personal data or environment secrets into issues or browser logs.
