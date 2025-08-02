
import { db } from '../db';
import { estimationLibraryTable } from '../db/schema';
import { type CreateEstimationLibraryInput, type EstimationLibrary } from '../schema';

export const createEstimationLibrary = async (input: CreateEstimationLibraryInput): Promise<EstimationLibrary> => {
  try {
    // Insert estimation library record
    const result = await db.insert(estimationLibraryTable)
      .values({
        service_type: input.service_type,
        service_name: input.service_name,
        economic_price: input.economic_price.toString(), // Convert number to string for numeric column
        standard_price: input.standard_price.toString(), // Convert number to string for numeric column
        premium_price: input.premium_price.toString(), // Convert number to string for numeric column
        estimated_labor_hours: input.estimated_labor_hours.toString(), // Convert number to string for numeric column
        description: input.description || null,
        created_by_id: input.created_by_id
      })
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const estimationLibrary = result[0];
    return {
      ...estimationLibrary,
      economic_price: parseFloat(estimationLibrary.economic_price), // Convert string back to number
      standard_price: parseFloat(estimationLibrary.standard_price), // Convert string back to number
      premium_price: parseFloat(estimationLibrary.premium_price), // Convert string back to number
      estimated_labor_hours: parseFloat(estimationLibrary.estimated_labor_hours) // Convert string back to number
    };
  } catch (error) {
    console.error('Estimation library creation failed:', error);
    throw error;
  }
};
