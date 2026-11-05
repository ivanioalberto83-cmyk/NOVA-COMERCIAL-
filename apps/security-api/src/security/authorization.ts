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
