import mongoose from 'mongoose';
import { randomUUID } from 'node:crypto';
import { connectDatabase } from '../src/config/database.js';
import User from '../src/models/User.js';
import Organization from '../src/models/Organization.js';
import Membership from '../src/models/Membership.js';
import Session from '../src/models/Session.js';
import Issue from '../src/models/Issue.js';
import Comment from '../src/models/Comment.js';
import ActivityLog from '../src/models/ActivityLog.js';

const marker = `nivaran-db-check-${randomUUID()}`;
const ids = { users: [], organizations: [], issues: [], comments: [], activities: [], sessions: [] };
const assert = (condition, message) => { if (!condition) throw new Error(message); };

try {
  console.log('1/6 Connecting to configured MongoDB…');
  await connectDatabase();
  assert(mongoose.connection.readyState === 1, 'Mongoose is not connected.');
  await Promise.all([User.init(), Organization.init(), Membership.init(), Session.init(), Issue.init(), Comment.init(), ActivityLog.init()]);
  console.log(`   Connected to database: ${mongoose.connection.name}`);

  console.log('2/6 Writing organization, users, and memberships…');
  const [userA, userB] = await User.create([
    { name: 'Nivaran DB Check A', email: `${marker}-a@example.invalid`, passwordHash: 'verification-only' },
    { name: 'Nivaran DB Check B', email: `${marker}-b@example.invalid`, passwordHash: 'verification-only' },
  ]);
  ids.users.push(userA._id, userB._id);
  const [orgA, orgB] = await Organization.create([
    { name: 'Nivaran DB Check A', slug: `${marker}-a` },
    { name: 'Nivaran DB Check B', slug: `${marker}-b` },
  ]);
  ids.organizations.push(orgA._id, orgB._id);
  await Membership.create([
    { organizationId: orgA._id, userId: userA._id, role: 'org_admin', status: 'active' },
    { organizationId: orgB._id, userId: userB._id, role: 'org_admin', status: 'active' },
  ]);
  const session = await Session.create({ tokenHash: `${marker}-token-hash`, userId: userA._id, currentOrganizationId: orgA._id, expiresAt: new Date(Date.now() + 60_000) });
  ids.sessions.push(session._id);

  console.log('3/6 Writing issue, comment, and activity records…');
  const issue = await Issue.create({ organizationId: orgA._id, reporterId: userA._id, reference: `${marker}-issue`, title: 'Mongo integration verification', description: 'Verify persistent writes and organization scoping.', category: 'Verification' });
  ids.issues.push(issue._id);
  const comment = await Comment.create({ organizationId: orgA._id, issueId: issue._id, authorId: userA._id, body: 'MongoDB write/read verification comment.' });
  ids.comments.push(comment._id);
  const activity = await ActivityLog.create({ organizationId: orgA._id, issueId: issue._id, actorId: userA._id, action: 'issue_created', newValue: 'Submitted' });
  ids.activities.push(activity._id);

  console.log('4/6 Reading back persisted records…');
  assert(await User.exists({ _id: userA._id, email: userA.email }), 'User read-back failed.');
  assert(await Organization.exists({ _id: orgA._id, slug: orgA.slug }), 'Organization read-back failed.');
  assert(await Membership.exists({ organizationId: orgA._id, userId: userA._id, status: 'active' }), 'Membership read-back failed.');
  assert(await Session.exists({ _id: session._id, currentOrganizationId: orgA._id }), 'Session read-back failed.');
  assert(await Issue.exists({ _id: issue._id, organizationId: orgA._id }), 'Issue read-back failed.');
  assert(await Comment.exists({ _id: comment._id, organizationId: orgA._id, issueId: issue._id }), 'Comment read-back failed.');
  assert(await ActivityLog.exists({ _id: activity._id, organizationId: orgA._id, issueId: issue._id }), 'Activity read-back failed.');

  console.log('5/6 Checking tenant isolation and unique constraints…');
  assert(!(await Issue.findOne({ _id: issue._id, organizationId: orgB._id })), 'Cross-organization issue lookup unexpectedly succeeded.');
  let duplicateRejected = false;
  try { await Membership.create({ organizationId: orgA._id, userId: userA._id, role: 'member', status: 'active' }); }
  catch (error) { duplicateRejected = error?.code === 11000; }
  assert(duplicateRejected, 'Unique organization/user membership index did not reject a duplicate.');

  console.log('6/6 Cleaning up verification records…');
  await Promise.all([
    ActivityLog.collection.deleteMany({ _id: { $in: ids.activities } }),
    Comment.deleteMany({ _id: { $in: ids.comments } }),
    Issue.deleteMany({ _id: { $in: ids.issues } }),
    Session.deleteMany({ _id: { $in: ids.sessions } }),
    Membership.deleteMany({ organizationId: { $in: ids.organizations } }),
    Organization.deleteMany({ _id: { $in: ids.organizations } }),
    User.deleteMany({ _id: { $in: ids.users } }),
  ]);
  console.log('\nPASS: MongoDB connection, CRUD persistence, membership uniqueness, and organization scoping verified.');
} catch (error) {
  console.error('\nFAIL: MongoDB integration verification did not complete.');
  console.error(error.message);
  if (error?.name === 'MongoServerSelectionError' || error?.name === 'MongooseServerSelectionError') {
    console.error('Check that MongoDB is running and MONGODB_URI points to a reachable database.');
  }
  process.exitCode = 1;
} finally {
  try {
    if (ids.activities.length) await ActivityLog.collection.deleteMany({ _id: { $in: ids.activities } });
    if (ids.comments.length) await Comment.deleteMany({ _id: { $in: ids.comments } });
    if (ids.issues.length) await Issue.deleteMany({ _id: { $in: ids.issues } });
    if (ids.sessions.length) await Session.deleteMany({ _id: { $in: ids.sessions } });
    if (ids.organizations.length) await Membership.deleteMany({ organizationId: { $in: ids.organizations } });
    if (ids.organizations.length) await Organization.deleteMany({ _id: { $in: ids.organizations } });
    if (ids.users.length) await User.deleteMany({ _id: { $in: ids.users } });
  } catch (cleanupError) {
    console.error('Warning: cleanup failed:', cleanupError.message);
    process.exitCode = 1;
  }
  await mongoose.disconnect();
}
