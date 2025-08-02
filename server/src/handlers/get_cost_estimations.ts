
import { db } from '../db';
import { costEstimationsTable, usersTable, serviceOrdersTable } from '../db/schema';
import { type CostEstimation } from '../schema';
import { eq } from 'drizzle-orm';

export const getCostEstimations = async (): Promise<CostEstimation[]> => {
  try {
    const results = await db.select()
      .from(costEstimationsTable)
      .leftJoin(usersTable, eq(costEstimationsTable.estimated_by_id, usersTable.id))
      .leftJoin(serviceOrdersTable, eq(costEstimationsTable.service_order_id, serviceOrdersTable.id))
      .execute();

    return results.map(result => ({
      id: result.cost_estimations.id,
      service_order_id: result.cost_estimations.service_order_id,
      economic_tier_price: parseFloat(result.cost_estimations.economic_tier_price),
      standard_tier_price: parseFloat(result.cost_estimations.standard_tier_price),
      premium_tier_price: parseFloat(result.cost_estimations.premium_tier_price),
      economic_description: result.cost_estimations.economic_description,
      standard_description: result.cost_estimations.standard_description,
      premium_description: result.cost_estimations.premium_description,
      customer_decision: result.cost_estimations.customer_decision,
      chosen_tier: result.cost_estimations.chosen_tier,
      estimated_by_id: result.cost_estimations.estimated_by_id,
      estimation_date: new Date(result.cost_estimations.estimation_date),
      customer_response_date: result.cost_estimations.customer_response_date ? new Date(result.cost_estimations.customer_response_date) : null,
      created_at: result.cost_estimations.created_at
    }));
  } catch (error) {
    console.error('Get cost estimations failed:', error);
    throw error;
  }
};
