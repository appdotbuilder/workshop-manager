
import { db } from '../db';
import { qualityControlTable, serviceOrdersTable } from '../db/schema';
import { type CreateQualityControlInput, type QualityControl } from '../schema';
import { eq } from 'drizzle-orm';

export const createQualityControl = async (input: CreateQualityControlInput): Promise<QualityControl> => {
  try {
    // Verify service order exists
    const serviceOrder = await db.select()
      .from(serviceOrdersTable)
      .where(eq(serviceOrdersTable.id, input.service_order_id))
      .execute();

    if (serviceOrder.length === 0) {
      throw new Error('Service order not found');
    }

    // Determine QC status based on final approval and defects
    const qcStatus = input.final_approval ? 'PASSED' : 
                    (input.defects_found ? 'FAILED' : 'PENDING');

    // Insert quality control record
    const result = await db.insert(qualityControlTable)
      .values({
        service_order_id: input.service_order_id,
        qc_status: qcStatus,
        critical_factors_check: input.critical_factors_check,
        defects_found: input.defects_found || null,
        corrective_actions: input.corrective_actions || null,
        final_approval: input.final_approval,
        inspected_by_id: input.inspected_by_id
      })
      .returning()
      .execute();

    const qualityControl = result[0];
    return {
      ...qualityControl,
      critical_factors_check: qualityControl.critical_factors_check as Record<string, boolean>,
      inspection_date: new Date(qualityControl.inspection_date),
      created_at: new Date(qualityControl.created_at)
    };
  } catch (error) {
    console.error('Quality control creation failed:', error);
    throw error;
  }
};
