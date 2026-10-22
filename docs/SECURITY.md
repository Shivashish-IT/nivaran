# Security and operational limits

## Implemented protections

- Session-based authentication with server-side session records and session cookies.
- Passwords are stored as hashes; password-reset tokens are random, hashed at rest, expiring, single-use, and invalidate prior outstanding reset tokens.
- Password reset revokes existing sessions after a successful reset.
- Express Helmet headers, request rate limiting, JSON body size limits, and origin checks for browser mutations.
- Organization-scoped access checks on issue and collaboration flows.
- Role checks for privileged membership, assignment, and status-change operations.
- Issue attachments use an allow-list of file types, size limits, generated storage names, signature checks, and authenticated organization-scoped downloads.
- Reset and invitation URLs are HTML-escaped before insertion into email markup.

## Required deployment practices

- Keep `.env` files, MongoDB credentials, SMTP credentials, and session secrets out of version control and chat.
- Use a unique random `SESSION_SECRET` of at least 32 characters and HTTPS in production.
- Set `CLIENT_ORIGIN` to the exact deployed frontend origin. Configure the frontend `VITE_API_URL` at build time.
- Use a dedicated disposable database for integration tests; never run tests against production data.
- Configure SMTP before relying on email invitations or account recovery.
- Store attachments on durable private storage for production. Do not expose the upload directory as static public content.
- Restrict MongoDB Atlas network access and use a least-privilege database user.

## Known release limitations

The current source defaults attachments to local disk; multi-instance/ephemeral hosting requires a durable private storage solution. Attachment cleanup/retention needs an operational policy. Production browser flows, actual email delivery, database-backed integration tests, container runtime, and deployment have not been verified in the preparation environment. Run the full release gate and manual checks before launch.

## Minimum tenant-isolation smoke test

Create two organizations with separate users and issues. Confirm that a user in Organization A cannot read or modify Organization B's issues, comments, activity, attachments, members, notifications, or organization settings by changing IDs in requests. Confirm members cannot grant themselves elevated roles. Record and resolve any failure before deployment.
