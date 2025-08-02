
import { db } from '../db';
import { vehiclesTable, customersTable } from '../db/schema';
import { type CreateVehicleInput, type Vehicle } from '../schema';
import { eq } from 'drizzle-orm';

export const createVehicle = async (input: CreateVehicleInput): Promise<Vehicle> => {
  try {
    // Verify that the customer exists
    const existingCustomer = await db.select()
      .from(customersTable)
      .where(eq(customersTable.id, input.customer_id))
      .execute();

    if (existingCustomer.length === 0) {
      throw new Error(`Customer with id ${input.customer_id} not found`);
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

    const vehicle = result[0];
    return {
      ...vehicle,
      vin: vehicle.vin || null
    };
  } catch (error) {
    console.error('Vehicle creation failed:', error);
    throw error;
  }
};
