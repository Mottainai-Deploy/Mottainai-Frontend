# Changelog

## Unreleased

### Fixed

- Distinguish Firebase password failures from rejected operational sessions and profiles.
- Remove misleading operational-password guidance from login errors.
- Reject empty Firebase ID tokens before requesting an operational session.

### Tests

- Cover the login contract for administrator, manager, supervisor and operator roles, including denied access, inactive profiles, server failures and logout races.
