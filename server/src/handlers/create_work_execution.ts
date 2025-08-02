
import { db } from '../db';
import { workExecutionTable } from '../db/schema';
import { type CreateWorkExecutionInput, type WorkExecution } from '../schema';

export const createWorkExecution = async (input: CreateWorkExecutionInput): Promise<WorkExecution> => {
  try {
    // Insert work execution record
    const result = await db.insert(workExecutionTable)
      .values({
        service_order_id: input.service_order_id,
        work_description: input.work_description,
        parts_used: input.parts_used || null,
        labor_hours: input.labor_hours.toString(), // Convert number to string for numeric column
        completion_checklist: input.completion_checklist || {},
        work_photos: input.work_photos || [],
        executed_by_id: input.executed_by_id
      })
      .returning()
      .execute();

    // Convert and properly type the result
    const workExecution = result[0];
    return {
      id: workExecution.id,
      service_order_id: workExecution.service_order_id,
      work_description: workExecution.work_description,
      parts_used: workExecution.parts_used,
      labor_hours: parseFloat(workExecution.labor_hours), // Convert string back to number
      completion_checklist: workExecution.completion_checklist as Record<string, boolean>,
      work_photos: workExecution.work_photos as string[],
      executed_by_id: workExecution.executed_by_id,
      start_date: new Date(workExecution.start_date), // Convert string to Date
      completion_date: workExecution.completion_date ? new Date(workExecution.completion_date) : null,
      created_at: workExecution.created_at
    };
  } catch (error) {
    console.error('Work execution creation failed:', error);
    throw error;
  }
};
