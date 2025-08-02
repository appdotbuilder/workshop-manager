
import { db } from '../db';
import { vehiclesTable } from '../db/schema';
import { type Vehicle } from '../schema';

export const getVehicles = async (): Promise<Vehicle[]> => {
  try {
    const results = await db.select()
      .from(vehiclesTable)
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to fetch vehicles:', error);
    throw error;
  }
};
