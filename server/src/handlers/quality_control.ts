
import { db } from '../db';
import { qualityControlTable, serviceOrdersTable } from '../db/schema';
import { type CreateQualityControlInput, type QualityControl } from '../schema';
import { eq, and } from 'drizzle-orm';

export const createQualityControl = async (input: CreateQualityControlInput): Promise<QualityControl> => {
  try {
    // Determine QC status based on final_approval
    const qcStatus = input.final_approval ? 'PASSED' : 
                    (input.defects_found ? 'FAILED' : 'PENDING');

    const result = await db.insert(qualityControlTable)
      .values({
        service_order_id: input.service_order_id,
        qc_status: qcStatus,
        critical_factors_check: input.critical_factors_check || {},
        defects_found: input.defects_found || null,
        corrective_actions: input.corrective_actions || null,
        final_approval: input.final_approval,
        inspected_by_id: input.inspected_by_id
      })
      .returning()
      .execute();

    const record = result[0];
    return {
      ...record,
      critical_factors_check: record.critical_factors_check as Record<string, boolean>,
      inspection_date: new Date(record.inspection_date)
    };
  } catch (error) {
    console.error('Quality control creation failed:', error);
    throw error;
  }
};

export const getQualityControlByServiceOrder = async (serviceOrderId: number): Promise<QualityControl | null> => {
  try {
    const results = await db.select()
      .from(qualityControlTable)
      .where(eq(qualityControlTable.service_order_id, serviceOrderId))
      .execute();

    if (results.length === 0) {
      return null;
    }

    const record = results[0];
    return {
      ...record,
      critical_factors_check: record.critical_factors_check as Record<string, boolean>,
      inspection_date: new Date(record.inspection_date)
    };
  } catch (error) {
    console.error('Failed to fetch quality control:', error);
    throw error;
  }
};

export const updateQualityControl = async (id: number, input: Partial<CreateQualityControlInput>): Promise<QualityControl> => {
  try {
    const updateData: any = {};

    if (input.critical_factors_check !== undefined) {
      updateData.critical_factors_check = input.critical_factors_check;
    }
    if (input.defects_found !== undefined) {
      updateData.defects_found = input.defects_found;
    }
    if (input.corrective_actions !== undefined) {
      updateData.corrective_actions = input.corrective_actions;
    }
    if (input.final_approval !== undefined) {
      updateData.final_approval = input.final_approval;
      // Update QC status based on final_approval
      updateData.qc_status = input.final_approval ? 'PASSED' : 
                            (input.defects_found ? 'FAILED' : 'NEEDS_REWORK');
    }

    const result = await db.update(qualityControlTable)
      .set(updateData)
      .where(eq(qualityControlTable.id, id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error('Quality control record not found');
    }

    const record = result[0];
    return {
      ...record,
      critical_factors_check: record.critical_factors_check as Record<string, boolean>,
      inspection_date: new Date(record.inspection_date)
    };
  } catch (error) {
    console.error('Quality control update failed:', error);
    throw error;
  }
};

export const getQualityControlQueue = async (): Promise<QualityControl[]> => {
  try {
    // Get service orders that need quality control (WORK_IN_PROGRESS status)
    const results = await db.select({
      qc_id: qualityControlTable.id,
      service_order_id: qualityControlTable.service_order_id,
      qc_status: qualityControlTable.qc_status,
      critical_factors_check: qualityControlTable.critical_factors_check,
      defects_found: qualityControlTable.defects_found,
      corrective_actions: qualityControlTable.corrective_actions,
      final_approval: qualityControlTable.final_approval,
      inspected_by_id: qualityControlTable.inspected_by_id,
      inspection_date: qualityControlTable.inspection_date,
      created_at: qualityControlTable.created_at
    })
      .from(qualityControlTable)
      .innerJoin(serviceOrdersTable, eq(qualityControlTable.service_order_id, serviceOrdersTable.id))
      .where(
        and(
          eq(serviceOrdersTable.status, 'QUALITY_CONTROL'),
          eq(qualityControlTable.qc_status, 'PENDING')
        )
      )
      .execute();

    return results.map(result => ({
      id: result.qc_id,
      service_order_id: result.service_order_id,
      qc_status: result.qc_status,
      critical_factors_check: result.critical_factors_check as Record<string, boolean>,
      defects_found: result.defects_found,
      corrective_actions: result.corrective_actions,
      final_approval: result.final_approval,
      inspected_by_id: result.inspected_by_id,
      inspection_date: new Date(result.inspection_date),
      created_at: result.created_at
    }));
  } catch (error) {
    console.error('Failed to fetch quality control queue:', error);
    throw error;
  }
};
