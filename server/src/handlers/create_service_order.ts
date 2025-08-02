
import { db } from '../db';
import { serviceOrdersTable, customersTable, vehiclesTable } from '../db/schema';
import { type CreateServiceOrderInput, type ServiceOrder, type ServiceType } from '../schema';
import { eq } from 'drizzle-orm';

export const createServiceOrder = async (input: CreateServiceOrderInput): Promise<ServiceOrder> => {
  try {
    // Verify customer exists
    const customer = await db.select()
      .from(customersTable)
      .where(eq(customersTable.id, input.customer_id))
      .execute();

    if (customer.length === 0) {
      throw new Error('Customer not found');
    }

    // Verify vehicle exists and belongs to customer
    const vehicle = await db.select()
      .from(vehiclesTable)
      .where(eq(vehiclesTable.id, input.vehicle_id))
      .execute();

    if (vehicle.length === 0) {
      throw new Error('Vehicle not found');
    }

    if (vehicle[0].customer_id !== input.customer_id) {
      throw new Error('Vehicle does not belong to the specified customer');
    }

    // Generate unique order number
    const timestamp = Date.now();
    const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const orderNumber = `SO-${timestamp}-${randomNum}`;

    // Insert service order record
    const result = await db.insert(serviceOrdersTable)
      .values({
        order_number: orderNumber,
        customer_id: input.customer_id,
        vehicle_id: input.vehicle_id,
        service_types: input.service_types, // Drizzle handles JSONB conversion automatically
        complaints: input.complaints,
        referral_source: input.referral_source || null,
        body_defects: input.body_defects || null,
        other_defects: input.other_defects || null,
        assigned_mechanic_id: input.assigned_mechanic_id || null,
        created_by_id: input.created_by_id,
        status: 'PENDING_INITIAL_CHECK' // Default status
      })
      .returning()
      .execute();

    const serviceOrder = result[0];

    // Return the service order with proper typing
    return {
      ...serviceOrder,
      service_types: serviceOrder.service_types as ServiceType[] // Type assertion for JSONB array
    };
  } catch (error) {
    console.error('Service order creation failed:', error);
    throw error;
  }
};
