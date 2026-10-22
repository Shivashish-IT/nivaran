# API reference

Base URL: `/api/v1`. Unless noted otherwise, endpoints return JSON with a `success` field and a `data` payload on success. Most application routes require an authenticated session and an active organization membership.

## Health

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | Liveness check |
| GET | `/health/ready` | Readiness check, including database connectivity |

## Authentication and profile

| Method | Path | Purpose |
|---|---|---|
| GET | `/auth/google/config` | Return the configured public Google Client ID |
| POST | `/auth/google` | Verify a Google ID token and start a session |
| POST | `/auth/register` | Register an account |
| POST | `/auth/login` | Start a session |
| POST | `/auth/logout` | End the current session |
| GET | `/auth/me` | Get the current user and memberships |
| PATCH | `/auth/profile` | Update the current profile |
| POST | `/auth/password-reset/request` | Request password recovery |
| POST | `/auth/password-reset/confirm` | Confirm password recovery with a reset token |

## Organizations and members

| Method | Path | Purpose |
|---|---|---|
| POST | `/organizations` | Create an organization |
| POST | `/organizations/:organizationId/select` | Select an organization |
| PATCH | `/organizations/current` | Update the current organization |
| GET | `/organizations/members` | List current organization members |
| POST | `/organizations/members/invite` | Invite a member |
| PATCH | `/organizations/members/:membershipId` | Update a membership |
| GET | `/organizations/invitations` | List invitations for the current user |
| POST | `/organizations/invitations/:membershipId/accept` | Accept an invitation |
| GET | `/organizations/analytics` | Organization analytics |
| GET | `/organizations/activity` | Organization activity feed |

## Issues and collaboration

| Method | Path | Purpose |
|---|---|---|
| GET | `/issues` | List/filter issues |
| POST | `/issues` | Create an issue |
| GET | `/issues/assignable-members` | List eligible assignees |
| GET | `/issues/:issueId` | Get issue details |
| PATCH | `/issues/:issueId/status` | Change issue status |
| POST | `/issues/:issueId/assign` | Assign or unassign an issue |
| GET | `/issues/:issueId/comments` | List issue comments |
| POST | `/issues/:issueId/comments` | Add a comment |
| GET | `/issues/:issueId/activity` | Get issue activity |
| POST | `/issues/:issueId/feedback` | Submit resolution feedback |
| POST | `/issues/:issueId/attachments` | Upload an attachment (`multipart/form-data`, field `file`) |
| GET | `/issues/:issueId/attachments/:attachmentId` | Download an authorized attachment |

## Notifications

| Method | Path | Purpose |
|---|---|---|
| GET | `/notifications` | List current user's notifications |
| POST | `/notifications/read-all` | Mark all notifications as read |
| POST | `/notifications/:notificationId/read` | Mark one notification as read |

## Access-control expectations

The server must enforce authentication, organization membership, role restrictions, and issue-level access. Do not treat this reference as proof that a route has been tested; integration tests and tenant-isolation smoke tests are still required before release.
