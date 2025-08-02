
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
      throw new Error('Service order not found');
    }

    // Insert cost estimation record
    const result = await db.insert(costEstimationsTable)
      .values({
        service_order_id: input.service_order_id,
        economic_tier_price: input.economic_tier_price.toString(),
        standard_tier_price: input.standard_tier_price.toString(),
        premium_tier_price: input.premium_tier_price.toString(),
        economic_description: input.economic_description,
        standard_description: input.standard_description,
        premium_description: input.premium_description,
        estimated_by_id: input.estimated_by_id
      })
      .returning()
      .execute();

    // Convert numeric and date fields back to proper types before returning
    const estimation = result[0];
    return {
      ...estimation,
      economic_tier_price: parseFloat(estimation.economic_tier_price),
      standard_tier_price: parseFloat(estimation.standard_tier_price),
      premium_tier_price: parseFloat(estimation.premium_tier_price),
      estimation_date: new Date(estimation.estimation_date),
      customer_response_date: estimation.customer_response_date ? new Date(estimation.customer_response_date) : null
    };
  } catch (error) {
    console.error('Cost estimation creation failed:', error);
    throw error;
  }
};

export const getCostEstimationByServiceOrder = async (serviceOrderId: number): Promise<CostEstimation | null> => {
  try {
    const results = await db.select()
      .from(costEstimationsTable)
      .where(eq(costEstimationsTable.service_order_id, serviceOrderId))
      .execute();

    if (results.length === 0) {
      return null;
    }

    const estimation = results[0];
    return {
      ...estimation,
      economic_tier_price: parseFloat(estimation.economic_tier_price),
      standard_tier_price: parseFloat(estimation.standard_tier_price),
      premium_tier_price: parseFloat(estimation.premium_tier_price),
      estimation_date: new Date(estimation.estimation_date),
      customer_response_date: estimation.customer_response_date ? new Date(estimation.customer_response_date) : null
    };
  } catch (error) {
    console.error('Cost estimation retrieval failed:', error);
    throw error;
  }
};

export const updateCostEstimationDecision = async (
  serviceOrderId: number, 
  decision: 'APPROVED' | 'REJECTED' | 'PENDING' | 'PARTIAL_APPROVAL',
  chosenTier?: 'ECONOMIC' | 'STANDARD' | 'PREMIUM'
): Promise<CostEstimation> => {
  try {
    const updateValues: any = {
      customer_decision: decision,
      customer_response_date: new Date()
    };

    if (chosenTier) {
      updateValues.chosen_tier = chosenTier;
    }

    const result = await db.update(costEstimationsTable)
      .set(updateValues)
      .where(eq(costEstimationsTable.service_order_id, serviceOrderId))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error('Cost estimation not found');
    }

    const estimation = result[0];
    return {
      ...estimation,
      economic_tier_price: parseFloat(estimation.economic_tier_price),
      standard_tier_price: parseFloat(estimation.standard_tier_price),
      premium_tier_price: parseFloat(estimation.premium_tier_price),
      estimation_date: new Date(estimation.estimation_date),
      customer_response_date: estimation.customer_response_date ? new Date(estimation.customer_response_date) : null
    };
  } catch (error) {
    console.error('Cost estimation update failed:', error);
    throw error;
  }
};
