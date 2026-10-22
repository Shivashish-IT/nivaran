import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { rm } from 'node:fs/promises';

test('API integration: persistence, organization isolation, and member invitation', { skip: !process.env.TEST_MONGODB_URI }, async t => {
  process.env.MONGODB_URI = process.env.TEST_MONGODB_URI;
  if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) process.env.SESSION_SECRET = 'integration-test-session-secret-at-least-32-chars';
  process.env.NODE_ENV = 'test';
  const testUploadDir = path.join(tmpdir(), `nivaran-integration-uploads-${randomUUID()}`);
  process.env.UPLOAD_DIR = testUploadDir;
  let server;
  let mongoose;
  let User;
  let Organization;
  let Membership;
  let Session;
  let Issue;
  let Comment;
  let ActivityLog;
  let Notification;
  const createdOrgIds = [];
  const createdUserIds = [];
  try {
    const [mongooseModule, appModule, databaseModule] = await Promise.all([
      import('mongoose'), import('../src/app.js'), import('../src/config/database.js'),
    ]);
    mongoose = mongooseModule.default;
    const app = appModule.default;
    const connectDatabase = databaseModule.connectDatabase;
    User = (await import('../src/models/User.js')).default;
    Organization = (await import('../src/models/Organization.js')).default;
    Membership = (await import('../src/models/Membership.js')).default;
    Session = (await import('../src/models/Session.js')).default;
    Issue = (await import('../src/models/Issue.js')).default;
    Comment = (await import('../src/models/Comment.js')).default;
    ActivityLog = (await import('../src/models/ActivityLog.js')).default;
    Notification = (await import('../src/models/Notification.js')).default;
    const marker = `nivaran-integration-${randomUUID()}`;
    await connectDatabase();
    server = app.listen(0);
    await new Promise(resolve => server.once('listening', resolve));
    const base = `http://127.0.0.1:${server.address().port}/api/v1`;
    async function request(path, { cookie = '', method = 'GET', body, origin } = {}) {
      const response = await fetch(`${base}${path}`, {
        method, headers: { ...(cookie ? { Cookie: cookie } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}), ...(origin ? { Origin: origin } : {}) },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      const payload = await response.json();
      const cookies = response.headers.getSetCookie?.() || [];
      return { status: response.status, data: payload.data, error: payload.error, cookie: cookies.map(value => value.split(';')[0]).join('; ') };
    }
    const rejectedOrigin = await request('/auth/register', { method: 'POST', origin: 'https://untrusted.example', body: { name: 'Blocked Origin', email: `${marker}-blocked@example.invalid`, password: 'A-long-test-password-2026', organizationName: `${marker} Blocked Workspace` } });
    assert.equal(rejectedOrigin.status, 403, 'state-changing requests from an untrusted browser origin must be rejected');
    const unknownResetRequest = await request('/auth/password-reset/request', { method: 'POST', body: { email: `${marker}-unknown@example.invalid` } });
    assert.equal(unknownResetRequest.status, 200, 'password reset requests must not reveal whether an email is registered');
    assert.match(unknownResetRequest.data.message, /If an active account exists/);
    const invalidReset = await request('/auth/password-reset/confirm', { method: 'POST', body: { token: 'not-a-valid-reset-token', password: 'A-new-long-password-2026' } });
    assert.equal(invalidReset.status, 400, 'invalid or expired password reset tokens must be rejected');
    const first = await request('/auth/register', { method: 'POST', body: { name: 'Integration Admin', email: `${marker}-a@example.invalid`, password: 'A-long-test-password-2026', organizationName: `${marker} Workspace A` } });
    assert.equal(first.status, 201, JSON.stringify(first.error));
    const firstCookie = first.cookie;
    createdUserIds.push(first.data.user.id);
    createdOrgIds.push(first.data.currentOrganizationId);
    assert.ok(firstCookie.includes('nivaran_session='), 'registration should set a session cookie');
    const second = await request('/auth/register', { method: 'POST', body: { name: 'Integration Member', email: `${marker}-b@example.invalid`, password: 'A-long-test-password-2026', organizationName: `${marker} Workspace B` } });
    assert.equal(second.status, 201, JSON.stringify(second.error));
    const secondCookie = second.cookie;
    createdUserIds.push(second.data.user.id);
    createdOrgIds.push(second.data.currentOrganizationId);
    const firstOrgId = first.data.currentOrganizationId;
    const secondOrgId = second.data.currentOrganizationId;
    assert.notEqual(firstOrgId, secondOrgId);

    const issue = await request('/issues', { cookie: firstCookie, method: 'POST', body: { title: 'Integration test issue', description: 'Issue created to verify MongoDB persistence.', category: 'Testing', priority: 'High' } });
    assert.equal(issue.status, 201, JSON.stringify(issue.error));
    const readIssue = await request(`/issues/${issue.data._id}`, { cookie: firstCookie });
    assert.equal(readIssue.status, 200);
    const attachmentForm = new FormData();
    attachmentForm.append('file', new Blob([Buffer.from('%PDF-1.4\nNivaran attachment integration test\n%%EOF')], { type: 'application/pdf' }), 'supporting-evidence.pdf');
    const attachmentResponse = await fetch(`${base}/issues/${issue.data._id}/attachments`, { method: 'POST', headers: { Cookie: firstCookie }, body: attachmentForm });
    const attachmentPayload = await attachmentResponse.json();
    assert.equal(attachmentResponse.status, 201, JSON.stringify(attachmentPayload.error));
    assert.equal(attachmentPayload.data.originalName, 'supporting-evidence.pdf');
    const attachmentActivity = await request(`/issues/${issue.data._id}/activity`, { cookie: firstCookie });
    assert.ok(attachmentActivity.data.some(item => item.action === 'attachment_added'));
    const attachmentId = attachmentPayload.data._id;
    const attachmentDownload = await fetch(`${base}/issues/${issue.data._id}/attachments/${attachmentId}`, { headers: { Cookie: firstCookie } });
    assert.equal(attachmentDownload.status, 200);
    assert.equal(attachmentDownload.headers.get('content-type'), 'application/pdf');
    assert.match(await attachmentDownload.text(), /Nivaran attachment integration test/);
    const crossTenantAttachment = await fetch(`${base}/issues/${issue.data._id}/attachments/${attachmentId}`, { headers: { Cookie: second.cookie } });
    assert.equal(crossTenantAttachment.status, 404, 'another organization must not download an attachment');
    const invalidAttachmentForm = new FormData();
    invalidAttachmentForm.append('file', new Blob([Buffer.from('not actually a PDF')], { type: 'application/pdf' }), 'spoofed.pdf');
    const invalidAttachment = await fetch(`${base}/issues/${issue.data._id}/attachments`, { method: 'POST', headers: { Cookie: firstCookie }, body: invalidAttachmentForm });
    assert.equal(invalidAttachment.status, 400, 'content signatures must be checked rather than trusting MIME type');
    const crossTenantRead = await request(`/issues/${issue.data._id}`, { cookie: secondCookie });
    assert.equal(crossTenantRead.status, 404, 'another organization must not read the issue');
    const crossTenantComments = await request(`/issues/${issue.data._id}/comments`, { cookie: secondCookie });
    assert.equal(crossTenantComments.status, 404, 'another organization must not read issue comments');
    const invalidTransition = await request(`/issues/${issue.data._id}/status`, { cookie: firstCookie, method: 'PATCH', body: { status: 'Closed' } });
    assert.equal(invalidTransition.status, 409, 'invalid status transitions must be rejected');

    const invitation = await request('/organizations/members/invite', { cookie: firstCookie, method: 'POST', body: { email: `${marker}-b@example.invalid`, role: 'handler' } });
    assert.equal(invitation.status, 201, JSON.stringify(invitation.error));
    const pendingInvitations = await request('/organizations/invitations', { cookie: secondCookie });
    assert.equal(pendingInvitations.status, 200);
    assert.ok(pendingInvitations.data.some(item => item.id === invitation.data.id && item.organizationId === firstOrgId));
    const accepted = await request(`/organizations/invitations/${invitation.data.id}/accept`, { cookie: secondCookie, method: 'POST' });
    assert.equal(accepted.status, 200, JSON.stringify(accepted.error));
    assert.equal(accepted.data.id, firstOrgId);
    const members = await request('/organizations/members', { cookie: firstCookie });
    assert.equal(members.status, 200);
    assert.ok(members.data.some(member => member.email === `${marker}-b@example.invalid` && member.role === 'handler' && member.status === 'active'));
    const memberRecord = members.data.find(member => member.email === `${marker}-b@example.invalid`);
    const forbiddenRoleChange = await request(`/organizations/members/${memberRecord.id}`, { cookie: secondCookie, method: 'PATCH', body: { role: 'org_admin' } });
    assert.equal(forbiddenRoleChange.status, 403, 'non-admin members must not change roles');

    // An admin may manage another admin while the first admin remains active; users cannot demote themselves.
    await Membership.updateOne({ _id: memberRecord.id }, { $set: { role: 'org_admin' } });
    const demoteOtherAdmin = await request(`/organizations/members/${memberRecord.id}`, { cookie: firstCookie, method: 'PATCH', body: { role: 'handler' } });
    assert.equal(demoteOtherAdmin.status, 200, JSON.stringify(demoteOtherAdmin.error));
    assert.equal(demoteOtherAdmin.data.role, 'handler');
    const ownMembership = members.find(member => member.userId === first.data.user.id);
    const selfDemotion = await request(`/organizations/members/${ownMembership.id}`, { cookie: firstCookie, method: 'PATCH', body: { role: 'handler' } });
    assert.equal(selfDemotion.status, 400, 'an admin cannot remove their own admin access');

    await Membership.updateOne({ _id: memberRecord.id }, { $set: { role: 'member' } });
    const memberStatusChange = await request(`/issues/${issue.data._id}/status`, { cookie: secondCookie, method: 'PATCH', body: { status: 'Under Review' } });
    assert.equal(memberStatusChange.status, 403, 'ordinary members cannot change issue status');
    await Membership.updateOne({ _id: memberRecord.id }, { $set: { role: 'handler' } });

    const assigned = await request(`/issues/${issue.data._id}/assign`, { cookie: firstCookie, method: 'POST', body: { assigneeId: memberRecord.userId } });
    assert.equal(assigned.status, 200, JSON.stringify(assigned.error));
    assert.equal(String(assigned.data.assigneeId?._id || assigned.data.assigneeId), memberRecord.userId);
    assert.equal(assigned.data.status, 'Assigned');
    const assigneeNotifications = await request('/notifications', { cookie: secondCookie });
    assert.equal(assigneeNotifications.status, 200, JSON.stringify(assigneeNotifications.error));
    assert.ok(assigneeNotifications.data.unreadCount >= 1, 'assignees should receive a notification');
    const assignedNotification = assigneeNotifications.data.items.find(item => item.type === 'issue_assigned');
    assert.ok(assignedNotification, 'assignment notification should be present');
    const markedRead = await request(`/notifications/${assignedNotification._id}/read`, { cookie: secondCookie, method: 'POST' });
    assert.equal(markedRead.status, 200);
    const markAllRead = await request('/notifications/read-all', { cookie: secondCookie, method: 'POST' });
    assert.equal(markAllRead.status, 200);

    const progressed = await request(`/issues/${issue.data._id}/status`, { cookie: firstCookie, method: 'PATCH', body: { status: 'In Progress' } });
    assert.equal(progressed.status, 200, JSON.stringify(progressed.error));
    assert.equal(progressed.data.status, 'In Progress');

    const comment = await request(`/issues/${issue.data._id}/comments`, { cookie: secondCookie, method: 'POST', body: { body: 'Verified persistence of a team comment.' } });
    assert.equal(comment.status, 201, JSON.stringify(comment.error));
    const comments = await request(`/issues/${issue.data._id}/comments`, { cookie: firstCookie });
    assert.equal(comments.status, 200);
    assert.ok(comments.data.some(item => item.body === 'Verified persistence of a team comment.'));
    const activity = await request(`/issues/${issue.data._id}/activity`, { cookie: firstCookie });
    assert.equal(activity.status, 200);
    assert.ok(activity.data.some(item => item.action === 'issue_created'));
    assert.ok(activity.data.some(item => item.action === 'issue_assigned'));
    assert.ok(activity.data.some(item => item.action === 'comment_added'));

    const resolved = await request(`/issues/${issue.data._id}/status`, { cookie: firstCookie, method: 'PATCH', body: { status: 'Resolved' } });
    assert.equal(resolved.status, 200, JSON.stringify(resolved.error));
    const unauthorizedFeedback = await request(`/issues/${issue.data._id}/feedback`, { cookie: secondCookie, method: 'POST', body: { rating: 5, comment: 'Not the reporter.' } });
    assert.equal(unauthorizedFeedback.status, 403, 'only the original reporter may submit resolution feedback');
    const invalidRating = await request(`/issues/${issue.data._id}/feedback`, { cookie: firstCookie, method: 'POST', body: { rating: 6, comment: 'Invalid score.' } });
    assert.equal(invalidRating.status, 400, 'feedback ratings must be between one and five');
    const feedback = await request(`/issues/${issue.data._id}/feedback`, { cookie: firstCookie, method: 'POST', body: { rating: 5, comment: 'The issue was resolved clearly and promptly.' } });
    assert.equal(feedback.status, 200, JSON.stringify(feedback.error));
    assert.equal(feedback.data.feedbackRating, 5);
    assert.ok(feedback.data.feedbackAt);
    const duplicateFeedback = await request(`/issues/${issue.data._id}/feedback`, { cookie: firstCookie, method: 'POST', body: { rating: 4 } });
    assert.equal(duplicateFeedback.status, 409, 'feedback may only be submitted once');

    const organizationActivity = await request('/organizations/activity', { cookie: firstCookie });
    assert.equal(organizationActivity.status, 200);
    assert.ok(organizationActivity.data.some(item => item.issueId?.reference === issue.data.reference));
    const analytics = await request('/organizations/analytics', { cookie: firstCookie });
    assert.equal(analytics.status, 200);
    assert.ok(analytics.data.total >= 1);
    assert.ok(analytics.data.byStatus.Resolved >= 1);
    const renamedOrganization = await request('/organizations/current', { cookie: firstCookie, method: 'PATCH', body: { name: `${marker} Renamed Workspace` } });
    assert.equal(renamedOrganization.status, 200);
    assert.equal(renamedOrganization.data.name, `${marker} Renamed Workspace`);
    const updatedProfile = await request('/auth/profile', { cookie: firstCookie, method: 'PATCH', body: { name: 'Updated Integration Admin' } });
    assert.equal(updatedProfile.status, 200);
    assert.equal(updatedProfile.data.user.name, 'Updated Integration Admin');

    const loggedOut = await request('/auth/logout', { cookie: firstCookie, method: 'POST' });
    assert.equal(loggedOut.status, 200);
    const afterLogout = await request(`/issues/${issue.data._id}`, { cookie: firstCookie });
    assert.equal(afterLogout.status, 401, 'revoked sessions must no longer access protected endpoints');

    assert.ok(await Issue.exists({ _id: issue.data._id, organizationId: firstOrgId }));
    t.diagnostic('Verifies HTTP API persistence, tenant isolation, attachment validation and protected download, password-reset privacy and token validation, assignment, comments, notifications, activity, role checks, feedback, and logout revocation when TEST_MONGODB_URI is configured.');
  } finally {
    if (server) await new Promise(resolve => server.close(resolve));
    if (createdOrgIds.length) {
      await Promise.all([
        ActivityLog.collection.deleteMany({ organizationId: { $in: createdOrgIds } }),
        Notification.deleteMany({ organizationId: { $in: createdOrgIds } }),
        Comment.deleteMany({ organizationId: { $in: createdOrgIds } }),
        Issue.deleteMany({ organizationId: { $in: createdOrgIds } }),
        Session.deleteMany({ userId: { $in: createdUserIds } }),
        (await import('../src/models/PasswordResetToken.js')).default.deleteMany({ userId: { $in: createdUserIds } }),
        Membership.deleteMany({ organizationId: { $in: createdOrgIds } }),
        Organization.deleteMany({ _id: { $in: createdOrgIds } }),
        User.deleteMany({ _id: { $in: createdUserIds } }),
      ]);
    }
    if (mongoose) await mongoose.disconnect();
    await rm(testUploadDir, { recursive: true, force: true });
  }
});
