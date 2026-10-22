import Membership from '../models/Membership.js';
import Organization from '../models/Organization.js';
import { ApiError } from '../utils/ApiError.js';

export async function requireOrganization(req, res, next) {
  try {
    const requestedId = req.params.organizationId || req.sessionDoc?.currentOrganizationId;
    if (!req.user?._id || !requestedId) {
      throw new ApiError(403, 'ORGANIZATION_REQUIRED', 'Select an organization before continuing.');
    }

    const membership = await Membership.findOne({
      organizationId: requestedId,
      userId: req.user._id,
      status: 'active',
    }).lean();

    if (!membership) {
      throw new ApiError(403, 'ORGANIZATION_ACCESS_DENIED', 'You do not have access to this organization.');
    }

    const organization = await Organization.findOne({ _id: requestedId, status: 'active' }).lean();
    if (!organization) {
      throw new ApiError(403, 'ORGANIZATION_INACTIVE', 'This organization is not available.');
    }

    req.membership = membership;
    req.organization = organization;
    req.organizationId = membership.organizationId;
    next();
  } catch (error) {
    next(error);
  }
}
