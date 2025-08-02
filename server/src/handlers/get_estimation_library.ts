
import { db } from '../db';
import { estimationLibraryTable } from '../db/schema';
import { type EstimationLibrary } from '../schema';

export const getEstimationLibrary = async (): Promise<EstimationLibrary[]> => {
  try {
    // Fetch all estimation library entries
    const results = await db.select()
      .from(estimationLibraryTable)
      .execute();

    // Convert numeric fields back to numbers before returning
    return results.map(entry => ({
      ...entry,
      economic_price: parseFloat(entry.economic_price),
      standard_price: parseFloat(entry.standard_price),
      premium_price: parseFloat(entry.premium_price),
      estimated_labor_hours: parseFloat(entry.estimated_labor_hours)
    }));
  } catch (error) {
    console.error('Failed to fetch estimation library:', error);
    throw error;
  }
};
