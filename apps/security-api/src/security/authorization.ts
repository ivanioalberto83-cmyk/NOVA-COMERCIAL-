export interface AccessContext {
  tenantId: string;
  product: string;
  permissions: readonly string[];
}

export interface AccessPolicy {
  tenantId: string;
  product: string;
  action: string;
  enabled: boolean;
}

/** Minimal policy seam for the first security foundation increment. */
export function evaluateAccess(context: AccessContext | null | undefined, policy: AccessPolicy | null | undefined): boolean {
  if (!context || !policy || !policy.enabled) return false;
  if (!context.tenantId || !context.product || !policy.tenantId || !policy.product) return false;
  return context.tenantId === policy.tenantId && context.product === policy.product && context.permissions.includes(policy.action);
}


/**
 * Requires every permission explicitly declared by a protected route.
 * Empty requirements, missing grants and malformed values fail closed.
 */
export function hasRequiredPermissions(
  granted: readonly string[] | null | undefined,
  required: readonly string[] | null | undefined,
): boolean {
  if (!Array.isArray(granted) || !Array.isArray(required) || required.length === 0) return false;
  if (granted.some(value => typeof value !== 'string' || value.trim().length === 0)) return false;
  if (required.some(value => typeof value !== 'string' || value.trim().length === 0)) return false;
  return required.every(permission => granted.includes(permission));
}
