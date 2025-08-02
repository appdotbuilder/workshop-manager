
import { db } from '../db';
import { initialChecksTable, serviceOrdersTable } from '../db/schema';
import { type CreateInitialCheckInput, type InitialCheck } from '../schema';
import { eq } from 'drizzle-orm';

export const createInitialCheck = async (input: CreateInitialCheckInput): Promise<InitialCheck> => {
  try {
    // Verify the service order exists
    const serviceOrder = await db.select()
      .from(serviceOrdersTable)
      .where(eq(serviceOrdersTable.id, input.service_order_id))
      .execute();

    if (serviceOrder.length === 0) {
      throw new Error(`Service order with ID ${input.service_order_id} not found`);
    }

    // Insert initial check record
    const result = await db.insert(initialChecksTable)
      .values({
        service_order_id: input.service_order_id,
        fluid_levels_check: input.fluid_levels_check,
        battery_condition: input.battery_condition,
        tire_condition: input.tire_condition,
        brake_system_check: input.brake_system_check,
        lights_check: input.lights_check,
        engine_visual_inspection: input.engine_visual_inspection,
        additional_findings: input.additional_findings || null,
        checked_by_id: input.checked_by_id
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Initial check creation failed:', error);
    throw error;
  }
};
