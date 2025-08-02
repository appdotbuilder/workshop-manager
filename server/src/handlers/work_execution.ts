
import { db } from '../db';
import { workExecutionTable, serviceOrdersTable, costEstimationsTable } from '../db/schema';
import { type CreateWorkExecutionInput, type WorkExecution } from '../schema';
import { eq, and } from 'drizzle-orm';

export const createWorkExecution = async (input: CreateWorkExecutionInput): Promise<WorkExecution> => {
  try {
    // Validate service order exists
    const serviceOrder = await db.select()
      .from(serviceOrdersTable)
      .where(eq(serviceOrdersTable.id, input.service_order_id))
      .execute();

    if (serviceOrder.length === 0) {
      throw new Error('Service order not found');
    }

    // Validate approved cost estimation exists
    const costEstimation = await db.select()
      .from(costEstimationsTable)
      .where(
        and(
          eq(costEstimationsTable.service_order_id, input.service_order_id),
          eq(costEstimationsTable.customer_decision, 'APPROVED')
        )
      )
      .execute();

    if (costEstimation.length === 0) {
      throw new Error('No approved cost estimation found for this service order');
    }

    // Insert work execution record
    const result = await db.insert(workExecutionTable)
      .values({
        service_order_id: input.service_order_id,
        work_description: input.work_description,
        parts_used: input.parts_used,
        labor_hours: input.labor_hours.toString(),
        completion_checklist: input.completion_checklist || {},
        work_photos: input.work_photos || [],
        executed_by_id: input.executed_by_id
      })
      .returning()
      .execute();

    const workExecution = result[0];
    return {
      ...workExecution,
      labor_hours: parseFloat(workExecution.labor_hours),
      start_date: new Date(workExecution.start_date),
      completion_date: workExecution.completion_date ? new Date(workExecution.completion_date) : null,
      completion_checklist: workExecution.completion_checklist as Record<string, boolean>,
      work_photos: workExecution.work_photos as string[]
    };
  } catch (error) {
    console.error('Work execution creation failed:', error);
    throw error;
  }
};

export const getWorkExecutionByServiceOrder = async (serviceOrderId: number): Promise<WorkExecution | null> => {
  try {
    const result = await db.select()
      .from(workExecutionTable)
      .where(eq(workExecutionTable.service_order_id, serviceOrderId))
      .execute();

    if (result.length === 0) {
      return null;
    }

    const workExecution = result[0];
    return {
      ...workExecution,
      labor_hours: parseFloat(workExecution.labor_hours),
      start_date: new Date(workExecution.start_date),
      completion_date: workExecution.completion_date ? new Date(workExecution.completion_date) : null,
      completion_checklist: workExecution.completion_checklist as Record<string, boolean>,
      work_photos: workExecution.work_photos as string[]
    };
  } catch (error) {
    console.error('Failed to get work execution:', error);
    throw error;
  }
};

export const updateWorkExecution = async (id: number, input: Partial<CreateWorkExecutionInput>): Promise<WorkExecution> => {
  try {
    // Check if work execution exists
    const existing = await db.select()
      .from(workExecutionTable)
      .where(eq(workExecutionTable.id, id))
      .execute();

    if (existing.length === 0) {
      throw new Error('Work execution not found');
    }

    // Build update object with only provided fields
    const updateData: any = {};
    
    if (input.work_description !== undefined) {
      updateData.work_description = input.work_description;
    }
    if (input.parts_used !== undefined) {
      updateData.parts_used = input.parts_used;
    }
    if (input.labor_hours !== undefined) {
      updateData.labor_hours = input.labor_hours.toString();
    }
    if (input.completion_checklist !== undefined) {
      updateData.completion_checklist = input.completion_checklist;
    }
    if (input.work_photos !== undefined) {
      updateData.work_photos = input.work_photos;
    }

    const result = await db.update(workExecutionTable)
      .set(updateData)
      .where(eq(workExecutionTable.id, id))
      .returning()
      .execute();

    const workExecution = result[0];
    return {
      ...workExecution,
      labor_hours: parseFloat(workExecution.labor_hours),
      start_date: new Date(workExecution.start_date),
      completion_date: workExecution.completion_date ? new Date(workExecution.completion_date) : null,
      completion_checklist: workExecution.completion_checklist as Record<string, boolean>,
      work_photos: workExecution.work_photos as string[]
    };
  } catch (error) {
    console.error('Work execution update failed:', error);
    throw error;
  }
};

export const completeWorkExecution = async (id: number): Promise<WorkExecution> => {
  try {
    // Check if work execution exists
    const existing = await db.select()
      .from(workExecutionTable)
      .where(eq(workExecutionTable.id, id))
      .execute();

    if (existing.length === 0) {
      throw new Error('Work execution not found');
    }

    // Mark as completed with completion date
    const completionDate = new Date();
    const result = await db.update(workExecutionTable)
      .set({
        completion_date: completionDate.toISOString().split('T')[0] // Convert to date string format
      })
      .where(eq(workExecutionTable.id, id))
      .returning()
      .execute();

    const workExecution = result[0];
    return {
      ...workExecution,
      labor_hours: parseFloat(workExecution.labor_hours),
      start_date: new Date(workExecution.start_date),
      completion_date: workExecution.completion_date ? new Date(workExecution.completion_date) : null,
      completion_checklist: workExecution.completion_checklist as Record<string, boolean>,
      work_photos: workExecution.work_photos as string[]
    };
  } catch (error) {
    console.error('Work execution completion failed:', error);
    throw error;
  }
};
