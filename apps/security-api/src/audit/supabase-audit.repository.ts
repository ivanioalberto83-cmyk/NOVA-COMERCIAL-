import { Injectable } from '@nestjs/common';
import { PrismaService } from '../persistence/prisma.service';

export type AuditOutcome = 'success' | 'denied' | 'failure';
export type AuditSeverity = 'info' | 'warning' | 'error' | 'critical';

export interface AuditEventInput {
  actorUserId?: string | null;
  organizationId?: string | null;
  productId?: string | null;
  eventType: string;
  action: string;
  resourceType?: string | null;
  resourceId?: string | null;
  outcome: AuditOutcome;
  severity?: AuditSeverity;
  correlationId?: string | null;
  source?: string;
  metadata?: Record<string, unknown>;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const OUTCOMES = new Set<AuditOutcome>(['success', 'denied', 'failure']);
const SEVERITIES = new Set<AuditSeverity>(['info', 'warning', 'error', 'critical']);

function optionalUuid(value: string | null | undefined, field: string): string | null {
  if (value === undefined || value === null) return null;
  if (!UUID.test(value)) throw new Error(`${field} must be a valid UUID`);
  return value;
}

@Injectable()
export class SupabaseAuditRepository {
  constructor(private readonly prisma: PrismaService) {}

  async write(event: AuditEventInput): Promise<void> {
    if (!event || typeof event !== 'object') throw new Error('An audit event is required');
    if (typeof event.eventType !== 'string' || event.eventType.trim().length === 0) {
      throw new Error('Audit event type is required');
    }
    if (typeof event.action !== 'string' || event.action.trim().length === 0) {
      throw new Error('Audit action is required');
    }
    if (!OUTCOMES.has(event.outcome)) throw new Error('Unsupported audit outcome');
    const severity = event.severity ?? 'info';
    if (!SEVERITIES.has(severity)) throw new Error('Unsupported audit severity');
    const source = event.source ?? 'nova-security-api';
    if (typeof source !== 'string' || source.trim().length === 0) {
      throw new Error('Audit source is required');
    }
    const metadata = event.metadata ?? {};
    if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
      throw new Error('Audit metadata must be an object');
    }

    const actorUserId = optionalUuid(event.actorUserId, 'actorUserId');
    const organizationId = optionalUuid(event.organizationId, 'organizationId');
    const productId = optionalUuid(event.productId, 'productId');
    const correlationId = optionalUuid(event.correlationId, 'correlationId');

    await this.prisma.$executeRaw`
      INSERT INTO nova_core.audit_events (
        actor_user_id,
        organization_id,
        product_id,
        event_type,
        action,
        resource_type,
        resource_id,
        outcome,
        severity,
        correlation_id,
        source,
        metadata
      ) VALUES (
        ${actorUserId}::uuid,
        ${organizationId}::uuid,
        ${productId}::uuid,
        ${event.eventType.trim()},
        ${event.action.trim()},
        ${event.resourceType ?? null},
        ${event.resourceId ?? null},
        ${event.outcome},
        ${severity},
        ${correlationId}::uuid,
        ${source.trim()},
        ${JSON.stringify(metadata)}::jsonb
      )
    `;
  }
}
