
import { db } from '../db';
import { initialChecksTable } from '../db/schema';
import { type InitialCheck } from '../schema';

export const getInitialChecks = async (): Promise<InitialCheck[]> => {
  try {
    const results = await db.select()
      .from(initialChecksTable)
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to fetch initial checks:', error);
    throw error;
  }
};
