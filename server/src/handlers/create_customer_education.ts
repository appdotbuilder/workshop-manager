
import { db } from '../db';
import { customerEducationTable, serviceOrdersTable } from '../db/schema';
import { type CreateCustomerEducationInput, type CustomerEducation } from '../schema';
import { eq } from 'drizzle-orm';

export const createCustomerEducation = async (input: CreateCustomerEducationInput): Promise<CustomerEducation> => {
  try {
    // Verify that the service order exists
    const serviceOrder = await db.select()
      .from(serviceOrdersTable)
      .where(eq(serviceOrdersTable.id, input.service_order_id))
      .execute();

    if (serviceOrder.length === 0) {
      throw new Error(`Service order with ID ${input.service_order_id} not found`);
    }

    // Insert customer education record
    const result = await db.insert(customerEducationTable)
      .values({
        service_order_id: input.service_order_id,
        explanation_provided: input.explanation_provided,
        customer_questions: input.customer_questions || null,
        understanding_level: input.understanding_level,
        additional_notes: input.additional_notes || null,
        educated_by_id: input.educated_by_id
      })
      .returning()
      .execute();

    // Convert date fields that come back as strings to Date objects
    const customerEducation = result[0];
    return {
      ...customerEducation,
      education_date: new Date(customerEducation.education_date),
      created_at: new Date(customerEducation.created_at)
    };
  } catch (error) {
    console.error('Customer education creation failed:', error);
    throw error;
  }
};
