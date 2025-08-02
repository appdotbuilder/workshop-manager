
import { db } from '../db';
import { serviceOrdersTable } from '../db/schema';
import { type ServiceOrder, type ServiceType } from '../schema';

export const getServiceOrders = async (): Promise<ServiceOrder[]> => {
  try {
    const results = await db.select()
      .from(serviceOrdersTable)
      .execute();

    return results.map(order => ({
      ...order,
      // Cast service_types from JSONB to proper ServiceType array
      service_types: order.service_types as ServiceType[]
    }));
  } catch (error) {
    console.error('Failed to fetch service orders:', error);
    throw error;
  }
};
