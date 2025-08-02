
import { db } from '../db';
import { qualityControlTable } from '../db/schema';
import { type QualityControl } from '../schema';

export const getQualityControls = async (): Promise<QualityControl[]> => {
  try {
    const results = await db.select()
      .from(qualityControlTable)
      .execute();

    // Convert fields to correct types before returning
    return results.map(qc => ({
      id: qc.id,
      service_order_id: qc.service_order_id,
      qc_status: qc.qc_status,
      critical_factors_check: qc.critical_factors_check as Record<string, boolean>,
      defects_found: qc.defects_found,
      corrective_actions: qc.corrective_actions,
      final_approval: qc.final_approval,
      inspected_by_id: qc.inspected_by_id,
      inspection_date: new Date(qc.inspection_date),
      created_at: qc.created_at
    }));
  } catch (error) {
    console.error('Quality controls fetch failed:', error);
    throw error;
  }
};
