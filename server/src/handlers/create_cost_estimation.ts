
import { db } from '../db';
import { costEstimationsTable, serviceOrdersTable } from '../db/schema';
import { type CreateCostEstimationInput, type CostEstimation } from '../schema';
import { eq } from 'drizzle-orm';

export const createCostEstimation = async (input: CreateCostEstimationInput): Promise<CostEstimation> => {
  try {
    // Verify service order exists
    const serviceOrder = await db.select()
      .from(serviceOrdersTable)
      .where(eq(serviceOrdersTable.id, input.service_order_id))
      .execute();

    if (serviceOrder.length === 0) {
      throw new Error(`Service order with id ${input.service_order_id} not found`);
    }

    // Insert cost estimation record
    const result = await db.insert(costEstimationsTable)
      .values({
        service_order_id: input.service_order_id,
        economic_tier_price: input.economic_tier_price.toString(), // Convert number to string for numeric column
        standard_tier_price: input.standard_tier_price.toString(),
        premium_tier_price: input.premium_tier_price.toString(),
        economic_description: input.economic_description,
        standard_description: input.standard_description,
        premium_description: input.premium_description,
        estimated_by_id: input.estimated_by_id
      })
      .returning()
      .execute();

    // Convert numeric fields and date fields back to proper types before returning
    const costEstimation = result[0];
    return {
      ...costEstimation,
      economic_tier_price: parseFloat(costEstimation.economic_tier_price),
      standard_tier_price: parseFloat(costEstimation.standard_tier_price),
      premium_tier_price: parseFloat(costEstimation.premium_tier_price),
      estimation_date: new Date(costEstimation.estimation_date + 'T00:00:00Z'), // Convert date string to Date
      customer_response_date: costEstimation.customer_response_date ? new Date(costEstimation.customer_response_date + 'T00:00:00Z') : null
    };
  } catch (error) {
    console.error('Cost estimation creation failed:', error);
    throw error;
  }
};
