
import { db } from '../db';
import { vehiclesTable, customersTable } from '../db/schema';
import { type CreateVehicleInput, type Vehicle } from '../schema';
import { eq } from 'drizzle-orm';

export const createVehicle = async (input: CreateVehicleInput): Promise<Vehicle> => {
  try {
    // Verify customer exists
    const customer = await db.select()
      .from(customersTable)
      .where(eq(customersTable.id, input.customer_id))
      .execute();

    if (customer.length === 0) {
      throw new Error('Customer not found');
    }

    // Insert vehicle record
    const result = await db.insert(vehiclesTable)
      .values({
        customer_id: input.customer_id,
        make: input.make,
        model: input.model,
        year: input.year,
        license_plate: input.license_plate,
        vin: input.vin || null
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Vehicle creation failed:', error);
    throw error;
  }
};

export const getVehiclesByCustomer = async (customerId: number): Promise<Vehicle[]> => {
  try {
    // Verify customer exists
    const customer = await db.select()
      .from(customersTable)
      .where(eq(customersTable.id, customerId))
      .execute();

    if (customer.length === 0) {
      throw new Error('Customer not found');
    }

    // Get all vehicles for the customer
    const vehicles = await db.select()
      .from(vehiclesTable)
      .where(eq(vehiclesTable.customer_id, customerId))
      .execute();

    return vehicles;
  } catch (error) {
    console.error('Failed to get vehicles by customer:', error);
    throw error;
  }
};

export const getVehicleById = async (id: number): Promise<Vehicle | null> => {
  try {
    const vehicles = await db.select()
      .from(vehiclesTable)
      .where(eq(vehiclesTable.id, id))
      .execute();

    return vehicles.length > 0 ? vehicles[0] : null;
  } catch (error) {
    console.error('Failed to get vehicle by id:', error);
    throw error;
  }
};
