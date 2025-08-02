
import { db } from '../db';
import { serviceOrdersTable, customersTable, vehiclesTable, usersTable } from '../db/schema';
import { type CreateServiceOrderInput, type ServiceOrder, type OrderStatus } from '../schema';
import { eq, desc, and } from 'drizzle-orm';

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
      .where(and(
        eq(vehiclesTable.id, input.vehicle_id),
        eq(vehiclesTable.customer_id, input.customer_id)
      ))
      .execute();
    
    if (vehicle.length === 0) {
      throw new Error('Vehicle not found or does not belong to customer');
    }

    // Verify assigned mechanic exists if provided
    if (input.assigned_mechanic_id) {
      const mechanic = await db.select()
        .from(usersTable)
        .where(eq(usersTable.id, input.assigned_mechanic_id))
        .execute();
      
      if (mechanic.length === 0) {
        throw new Error('Assigned mechanic not found');
      }
    }

    // Verify created_by user exists
    const creator = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.created_by_id))
      .execute();
    
    if (creator.length === 0) {
      throw new Error('Creator user not found');
    }

    // Generate unique order number
    const timestamp = Date.now();
    const orderNumber = `PKB-${timestamp}`;

    // Create service order
    const result = await db.insert(serviceOrdersTable)
      .values({
        order_number: orderNumber,
        customer_id: input.customer_id,
        vehicle_id: input.vehicle_id,
        service_types: input.service_types, // Store array directly as JSONB
        complaints: input.complaints,
        referral_source: input.referral_source || null,
        body_defects: input.body_defects || null,
        other_defects: input.other_defects || null,
        assigned_mechanic_id: input.assigned_mechanic_id || null,
        created_by_id: input.created_by_id,
        status: 'PENDING_INITIAL_CHECK'
      })
      .returning()
      .execute();

    const serviceOrder = result[0];
    return {
      ...serviceOrder,
      service_types: serviceOrder.service_types as any // JSONB field returns the array directly
    };
  } catch (error) {
    console.error('Service order creation failed:', error);
    throw error;
  }
};

export const getServiceOrders = async (): Promise<ServiceOrder[]> => {
  try {
    const results = await db.select()
      .from(serviceOrdersTable)
      .orderBy(desc(serviceOrdersTable.created_at))
      .execute();

    return results.map(order => ({
      ...order,
      service_types: order.service_types as any // JSONB field returns the array directly
    }));
  } catch (error) {
    console.error('Failed to fetch service orders:', error);
    throw error;
  }
};

export const getServiceOrderById = async (id: number): Promise<ServiceOrder | null> => {
  try {
    const results = await db.select()
      .from(serviceOrdersTable)
      .where(eq(serviceOrdersTable.id, id))
      .execute();

    if (results.length === 0) {
      return null;
    }

    const serviceOrder = results[0];
    return {
      ...serviceOrder,
      service_types: serviceOrder.service_types as any // JSONB field returns the array directly
    };
  } catch (error) {
    console.error('Failed to fetch service order:', error);
    throw error;
  }
};

export const updateServiceOrderStatus = async (id: number, status: OrderStatus): Promise<ServiceOrder> => {
  try {
    // Verify service order exists
    const existing = await db.select()
      .from(serviceOrdersTable)
      .where(eq(serviceOrdersTable.id, id))
      .execute();
    
    if (existing.length === 0) {
      throw new Error('Service order not found');
    }

    // Update status
    const result = await db.update(serviceOrdersTable)
      .set({
        status: status,
        updated_at: new Date()
      })
      .where(eq(serviceOrdersTable.id, id))
      .returning()
      .execute();

    const serviceOrder = result[0];
    return {
      ...serviceOrder,
      service_types: serviceOrder.service_types as any // JSONB field returns the array directly
    };
  } catch (error) {
    console.error('Failed to update service order status:', error);
    throw error;
  }
};

export const getServiceOrdersByMechanic = async (mechanicId: number): Promise<ServiceOrder[]> => {
  try {
    // Verify mechanic exists
    const mechanic = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, mechanicId))
      .execute();
    
    if (mechanic.length === 0) {
      throw new Error('Mechanic not found');
    }

    const results = await db.select()
      .from(serviceOrdersTable)
      .where(eq(serviceOrdersTable.assigned_mechanic_id, mechanicId))
      .orderBy(desc(serviceOrdersTable.created_at))
      .execute();

    return results.map(order => ({
      ...order,
      service_types: order.service_types as any // JSONB field returns the array directly
    }));
  } catch (error) {
    console.error('Failed to fetch service orders by mechanic:', error);
    throw error;
  }
};

export const getServiceOrdersByStatus = async (status: OrderStatus): Promise<ServiceOrder[]> => {
  try {
    const results = await db.select()
      .from(serviceOrdersTable)
      .where(eq(serviceOrdersTable.status, status))
      .orderBy(desc(serviceOrdersTable.created_at))
      .execute();

    return results.map(order => ({
      ...order,
      service_types: order.service_types as any // JSONB field returns the array directly
    }));
  } catch (error) {
    console.error('Failed to fetch service orders by status:', error);
    throw error;
  }
};
