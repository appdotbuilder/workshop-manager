
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { vehiclesTable, customersTable } from '../db/schema';
import { type CreateVehicleInput } from '../schema';
import { createVehicle } from '../handlers/create_vehicle';
import { eq } from 'drizzle-orm';

// Test customer data
const testCustomer = {
  name: 'Test Customer',
  phone: '+1234567890',
  email: 'test@example.com',
  address: '123 Test Street'
};

// Test vehicle input
const testVehicleInput: CreateVehicleInput = {
  customer_id: 1, // Will be updated with actual customer ID
  make: 'Toyota',
  model: 'Camry',
  year: 2022,
  license_plate: 'ABC123',
  vin: '1HGBH41JXMN109186'
};

describe('createVehicle', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a vehicle with all fields', async () => {
    // Create prerequisite customer
    const customerResult = await db.insert(customersTable)
      .values(testCustomer)
      .returning()
      .execute();
    
    const customerId = customerResult[0].id;
    const vehicleInput = { ...testVehicleInput, customer_id: customerId };

    const result = await createVehicle(vehicleInput);

    // Verify all fields
    expect(result.customer_id).toEqual(customerId);
    expect(result.make).toEqual('Toyota');
    expect(result.model).toEqual('Camry');
    expect(result.year).toEqual(2022);
    expect(result.license_plate).toEqual('ABC123');
    expect(result.vin).toEqual('1HGBH41JXMN109186');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeNull();
  });

  it('should create a vehicle without optional VIN', async () => {
    // Create prerequisite customer
    const customerResult = await db.insert(customersTable)
      .values(testCustomer)
      .returning()
      .execute();
    
    const customerId = customerResult[0].id;
    const vehicleInput = { 
      customer_id: customerId,
      make: 'Honda',
      model: 'Civic',
      year: 2021,
      license_plate: 'XYZ789'
      // VIN omitted
    };

    const result = await createVehicle(vehicleInput);

    expect(result.customer_id).toEqual(customerId);
    expect(result.make).toEqual('Honda');
    expect(result.model).toEqual('Civic');
    expect(result.year).toEqual(2021);
    expect(result.license_plate).toEqual('XYZ789');
    expect(result.vin).toBeNull();
    expect(result.id).toBeDefined();
  });

  it('should save vehicle to database', async () => {
    // Create prerequisite customer
    const customerResult = await db.insert(customersTable)
      .values(testCustomer)
      .returning()
      .execute();
    
    const customerId = customerResult[0].id;
    const vehicleInput = { ...testVehicleInput, customer_id: customerId };

    const result = await createVehicle(vehicleInput);

    // Query database to verify persistence
    const vehicles = await db.select()
      .from(vehiclesTable)
      .where(eq(vehiclesTable.id, result.id))
      .execute();

    expect(vehicles).toHaveLength(1);
    expect(vehicles[0].customer_id).toEqual(customerId);
    expect(vehicles[0].make).toEqual('Toyota');
    expect(vehicles[0].model).toEqual('Camry');
    expect(vehicles[0].year).toEqual(2022);
    expect(vehicles[0].license_plate).toEqual('ABC123');
    expect(vehicles[0].vin).toEqual('1HGBH41JXMN109186');
    expect(vehicles[0].created_at).toBeInstanceOf(Date);
  });

  it('should throw error when customer does not exist', async () => {
    const vehicleInput = { ...testVehicleInput, customer_id: 999 }; // Non-existent customer

    await expect(createVehicle(vehicleInput)).rejects.toThrow(/Customer with id 999 not found/i);
  });

  it('should enforce unique license plate constraint', async () => {
    // Create prerequisite customer
    const customerResult = await db.insert(customersTable)
      .values(testCustomer)
      .returning()
      .execute();
    
    const customerId = customerResult[0].id;
    const vehicleInput = { ...testVehicleInput, customer_id: customerId };

    // Create first vehicle
    await createVehicle(vehicleInput);

    // Try to create second vehicle with same license plate
    const duplicateVehicleInput = {
      ...vehicleInput,
      make: 'Ford',
      model: 'Focus'
    };

    await expect(createVehicle(duplicateVehicleInput)).rejects.toThrow();
  });

  it('should handle vehicles for different customers', async () => {
    // Create two customers
    const customer1Result = await db.insert(customersTable)
      .values(testCustomer)
      .returning()
      .execute();
    
    const customer2Result = await db.insert(customersTable)
      .values({
        ...testCustomer,
        phone: '+0987654321',
        email: 'customer2@example.com'
      })
      .returning()
      .execute();

    const customer1Id = customer1Result[0].id;
    const customer2Id = customer2Result[0].id;

    // Create vehicles for both customers
    const vehicle1Input = { ...testVehicleInput, customer_id: customer1Id };
    const vehicle2Input = {
      ...testVehicleInput,
      customer_id: customer2Id,
      license_plate: 'DEF456'
    };

    const result1 = await createVehicle(vehicle1Input);
    const result2 = await createVehicle(vehicle2Input);

    expect(result1.customer_id).toEqual(customer1Id);
    expect(result2.customer_id).toEqual(customer2Id);
    expect(result1.license_plate).toEqual('ABC123');
    expect(result2.license_plate).toEqual('DEF456');

    // Verify both vehicles exist in database
    const allVehicles = await db.select()
      .from(vehiclesTable)
      .execute();

    expect(allVehicles).toHaveLength(2);
  });
});
