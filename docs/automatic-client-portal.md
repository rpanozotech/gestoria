# Automatic portal access for new CRM clients

New CRM clients are created as `activo` on the server, including requests carrying `prospecto` or `inactivo`. Manual, AI and CSV creation generate separate portal accounts atomically with the client. Email is optional; unique internal `@portal.local` identities are not delivery addresses.

The operator receives a unique username and a cryptographically random initial password once in the creation response. Only bcrypt hashes are stored. Normal/AI success views and the CSV import access dialog show the credentials in memory; closing or leaving loses the plaintext. Existing clients use the existing Generate access/Regenerate password action if needed.

This creation rule does not activate existing clients. Editing/deactivation and per-request portal status checks remain intact. AI duplicate-review updates preserve the existing status instead of taking an extracted activation state.

AI drafts and AI history strip credential fields recursively. Successful creation responses are not cacheable. No mandatory client-password rotation/expiration is implied by the term initial password.

## Regression gates

- Frontend: `node --test --experimental-strip-types test/client-draft.test.ts` from frontend/.
- Backend: `node test/client-autoactivation.integration.mjs` from backend/ against a dedicated schema-only backend on port 5000. It refuses databases whose hostname is not `portal-gate-db`. Requires the backend dependencies and dist build. Never point this fixture test at production.
- Backend gate covers missing email, distinct accounts, bcrypt, real MFA staff login, real portal login, per-client isolation, duplicate rollback, explicit prospect/inactive -> active creation, retained existing suspension and CSV provisioning.

No production fixtures are needed to deploy or verify this behavior.
