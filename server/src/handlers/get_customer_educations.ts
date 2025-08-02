
import { db } from '../db';
import { customerEducationTable } from '../db/schema';
import { type CustomerEducation } from '../schema';

export const getCustomerEducations = async (): Promise<CustomerEducation[]> => {
  try {
    const results = await db.select()
      .from(customerEducationTable)
      .execute();

    // Convert date fields and return
    return results.map(education => ({
      ...education,
      education_date: new Date(education.education_date),
      created_at: new Date(education.created_at)
    }));
  } catch (error) {
    console.error('Failed to fetch customer educations:', error);
    throw error;
  }
};
