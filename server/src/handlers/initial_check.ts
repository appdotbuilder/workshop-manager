
import { db } from '../db';
import { initialChecksTable, serviceOrdersTable } from '../db/schema';
import { type CreateInitialCheckInput, type InitialCheck } from '../schema';
import { eq } from 'drizzle-orm';

export const createInitialCheck = async (input: CreateInitialCheckInput): Promise<InitialCheck> => {
  try {
    // Verify service order exists
    const serviceOrder = await db.select()
      .from(serviceOrdersTable)
      .where(eq(serviceOrdersTable.id, input.service_order_id))
      .execute();

    if (serviceOrder.length === 0) {
      throw new Error('Service order not found');
    }

    // Check if initial check already exists for this service order
    const existingCheck = await db.select()
      .from(initialChecksTable)
      .where(eq(initialChecksTable.service_order_id, input.service_order_id))
      .execute();

    if (existingCheck.length > 0) {
      throw new Error('Initial check already exists for this service order');
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
        additional_findings: input.additional_findings,
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

export const getInitialCheckByServiceOrder = async (serviceOrderId: number): Promise<InitialCheck | null> => {
  try {
    const result = await db.select()
      .from(initialChecksTable)
      .where(eq(initialChecksTable.service_order_id, serviceOrderId))
      .execute();

    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error('Failed to get initial check:', error);
    throw error;
  }
};

export const updateInitialCheck = async (id: number, input: Partial<CreateInitialCheckInput>): Promise<InitialCheck> => {
  try {
    // Verify initial check exists
    const existingCheck = await db.select()
      .from(initialChecksTable)
      .where(eq(initialChecksTable.id, id))
      .execute();

    if (existingCheck.length === 0) {
      throw new Error('Initial check not found');
    }

    // Update initial check record
    const result = await db.update(initialChecksTable)
      .set({
        fluid_levels_check: input.fluid_levels_check,
        battery_condition: input.battery_condition,
        tire_condition: input.tire_condition,
        brake_system_check: input.brake_system_check,
        lights_check: input.lights_check,
        engine_visual_inspection: input.engine_visual_inspection,
        additional_findings: input.additional_findings
      })
      .where(eq(initialChecksTable.id, id))
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Initial check update failed:', error);
    throw error;
  }
};
