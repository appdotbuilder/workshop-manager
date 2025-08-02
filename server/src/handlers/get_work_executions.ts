
import { db } from '../db';
import { workExecutionTable } from '../db/schema';
import { type WorkExecution } from '../schema';

export const getWorkExecutions = async (): Promise<WorkExecution[]> => {
  try {
    const results = await db.select()
      .from(workExecutionTable)
      .execute();

    // Convert numeric and date fields back to proper types
    return results.map(workExecution => ({
      ...workExecution,
      labor_hours: parseFloat(workExecution.labor_hours),
      completion_checklist: workExecution.completion_checklist as Record<string, boolean>,
      work_photos: workExecution.work_photos as string[],
      start_date: new Date(workExecution.start_date),
      completion_date: workExecution.completion_date ? new Date(workExecution.completion_date) : null
    }));
  } catch (error) {
    console.error('Get work executions failed:', error);
    throw error;
  }
};
