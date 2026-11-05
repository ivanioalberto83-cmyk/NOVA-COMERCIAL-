export interface SecurityPrincipal {
  subjectId: string;
  tenantId: string;
  product: string;
  roles: readonly string[];
  permissions: readonly string[];
  grantableRoles: readonly string[];
  grantablePermissions: readonly string[];
}

export interface ProtectedResource {
  resourceId: string;
  tenantId: string;
  product: string;
}

export interface AuthorizationRequest {
  principal: SecurityPrincipal | null | undefined;
  resource: ProtectedResource | null | undefined;
  action: string;
}

export type AuthorizationReason =
  | 'invalid_context'
  | 'tenant_mismatch'
  | 'product_mismatch'
  | 'role_missing'
  | 'permission_missing'
  | 'allowed';

export interface AuthorizationDecision {
  allowed: boolean;
  reason: AuthorizationReason;
}

const nonBlank = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

/** Fail-closed, exact-match authorization. Roles never imply permissions. */
export function authorize(request: AuthorizationRequest | null | undefined): AuthorizationDecision {
  if (!request || !request.principal || !request.resource ||
      !nonBlank(request.action) ||
      !nonBlank(request.principal.subjectId) ||
      !nonBlank(request.principal.tenantId) ||
      !nonBlank(request.principal.product) ||
      !nonBlank(request.resource.resourceId) ||
      !nonBlank(request.resource.tenantId) ||
      !nonBlank(request.resource.product) ||
      !Array.isArray(request.principal.roles) ||
      !Array.isArray(request.principal.permissions)) {
    return { allowed: false, reason: 'invalid_context' };
  }

  if (request.principal.tenantId !== request.resource.tenantId) {
    return { allowed: false, reason: 'tenant_mismatch' };
  }
  if (request.principal.product !== request.resource.product) {
    return { allowed: false, reason: 'product_mismatch' };
  }
  if (request.principal.roles.length === 0) {
    return { allowed: false, reason: 'role_missing' };
  }
  if (!request.principal.permissions.includes(request.action)) {
    return { allowed: false, reason: 'permission_missing' };
  }
  return { allowed: true, reason: 'allowed' };
}

export interface PermissionGrantRequest {
  actor: SecurityPrincipal | null | undefined;
  targetRoles: readonly string[];
  targetPermissions: readonly string[];
}

/** A caller can delegate only explicitly delegable roles and permissions. */
export function canGrantAccess(request: PermissionGrantRequest | null | undefined): boolean {
  if (!request || !request.actor ||
      !nonBlank(request.actor.subjectId) ||
      !nonBlank(request.actor.tenantId) ||
      !Array.isArray(request.actor.grantableRoles) ||
      !Array.isArray(request.actor.grantablePermissions) ||
      !Array.isArray(request.targetRoles) ||
      !Array.isArray(request.targetPermissions)) {
    return false;
  }
  if (request.targetRoles.length === 0 && request.targetPermissions.length === 0) return false;
  return request.targetRoles.every(role =>
    nonBlank(role) && request.actor!.grantableRoles.includes(role)) &&
    request.targetPermissions.every(permission =>
      nonBlank(permission) && request.actor!.grantablePermissions.includes(permission));
}

export interface AuthorizationAuditEvent {
  occurredAt: string;
  correlationId: string;
  actorId: string;
  tenantId: string;
  action: string;
  resourceId: string;
  allowed: boolean;
  reason: AuthorizationReason;
}

/** Creates a structured, non-PII authorization event; persistence is intentionally external. */
export function createAuthorizationAuditEvent(
  request: AuthorizationRequest,
  decision: AuthorizationDecision,
  occurredAt: string,
  correlationId: string,
): AuthorizationAuditEvent | null {
  const principal = request?.principal;
  const resource = request?.resource;
  if (!principal || !resource || !nonBlank(principal.subjectId) ||
      !nonBlank(principal.tenantId) || !nonBlank(request.action) ||
      !nonBlank(resource.resourceId) || !nonBlank(occurredAt) ||
      !nonBlank(correlationId)) return null;
  return {
    occurredAt,
    correlationId,
    actorId: principal.subjectId,
    tenantId: principal.tenantId,
    action: request.action,
    resourceId: resource.resourceId,
    allowed: decision.allowed,
    reason: decision.reason,
  };
}
