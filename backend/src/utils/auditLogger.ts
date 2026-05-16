import { query } from '../config/db';

export interface AuditLogParams {
  entityType: string;
  entityId: string;
  fieldName: string;
  oldValue: any;
  newValue: any;
  changedBy: string;
  changeReason?: string;
}

export const writeAuditLog = async (params: AuditLogParams) => {
  try {
    await query(
      `INSERT INTO audit_logs (
        entity_type, entity_id, field_name, 
        old_value, new_value, changed_by, change_reason
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        params.entityType, 
        params.entityId, 
        params.fieldName, 
        JSON.stringify(params.oldValue), 
        JSON.stringify(params.newValue), 
        params.changedBy, 
        params.changeReason || null
      ]
    );
  } catch (error) {
    console.error('Failed to write audit log:', error);
  }
};
