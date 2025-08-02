
import { db } from '../db';
import { customerEducationTable, serviceOrdersTable } from '../db/schema';
import { type CreateCustomerEducationInput, type CustomerEducation } from '../schema';
import { eq } from 'drizzle-orm';

export const createCustomerEducation = async (input: CreateCustomerEducationInput): Promise<CustomerEducation> => {
  try {
    // Verify service order exists
    const serviceOrder = await db.select()
      .from(serviceOrdersTable)
      .where(eq(serviceOrdersTable.id, input.service_order_id))
      .execute();

    if (serviceOrder.length === 0) {
      throw new Error('Service order not found');
    }

    // Insert customer education record
    const result = await db.insert(customerEducationTable)
      .values({
        service_order_id: input.service_order_id,
        explanation_provided: input.explanation_provided,
        customer_questions: input.customer_questions ?? null,
        understanding_level: input.understanding_level,
        additional_notes: input.additional_notes ?? null,
        educated_by_id: input.educated_by_id
      })
      .returning()
      .execute();

    const record = result[0];
    
    // Convert date fields to proper Date objects
    return {
      ...record,
      education_date: new Date(record.education_date)
    };
  } catch (error) {
    console.error('Customer education creation failed:', error);
    throw error;
  }
};

export const getCustomerEducationByServiceOrder = async (serviceOrderId: number): Promise<CustomerEducation | null> => {
  try {
    const result = await db.select()
      .from(customerEducationTable)
      .where(eq(customerEducationTable.service_order_id, serviceOrderId))
      .execute();

    if (result.length === 0) {
      return null;
    }

    const record = result[0];
    
    // Convert date fields to proper Date objects
    return {
      ...record,
      education_date: new Date(record.education_date)
    };
  } catch (error) {
    console.error('Failed to fetch customer education:', error);
    throw error;
  }
};
