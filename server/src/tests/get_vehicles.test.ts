
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { vehiclesTable, customersTable } from '../db/schema';
import { type CreateCustomerInput, type CreateVehicleInput } from '../schema';
import { getVehicles } from '../handlers/get_vehicles';

const testCustomerInput: CreateCustomerInput = {
  name: 'John Doe',
  phone: '1234567890',
  email: 'john@example.com',
  address: '123 Main St'
};

describe('getVehicles', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no vehicles exist', async () => {
    const result = await getVehicles();
    expect(result).toEqual([]);
  });

  it('should return all vehicles', async () => {
    // Create a customer first for foreign key constraint
    const customerResult = await db.insert(customersTable)
      .values({
        name: testCustomerInput.name,
        phone: testCustomerInput.phone,
        email: testCustomerInput.email,
        address: testCustomerInput.address
      })
      .returning()
      .execute();

    const customer = customerResult[0];

    const testVehicleInput1: CreateVehicleInput = {
      customer_id: customer.id,
      make: 'Toyota',
      model: 'Camry',
      year: 2020,
      license_plate: 'ABC123',
      vin: '1234567890ABCDEFG'
    };

    const testVehicleInput2: CreateVehicleInput = {
      customer_id: customer.id,
      make: 'Honda',
      model: 'Civic',
      year: 2019,
      license_plate: 'XYZ789'
    };

    await db.insert(vehiclesTable)
      .values({
        customer_id: testVehicleInput1.customer_id,
        make: testVehicleInput1.make,
        model: testVehicleInput1.model,
        year: testVehicleInput1.year,
        license_plate: testVehicleInput1.license_plate,
        vin: testVehicleInput1.vin
      })
      .execute();

    await db.insert(vehiclesTable)
      .values({
        customer_id: testVehicleInput2.customer_id,
        make: testVehicleInput2.make,
        model: testVehicleInput2.model,
        year: testVehicleInput2.year,
        license_plate: testVehicleInput2.license_plate,
        vin: testVehicleInput2.vin
      })
      .execute();

    const result = await getVehicles();

    expect(result).toHaveLength(2);
    
    // Check first vehicle
    const vehicle1 = result.find(v => v.license_plate === 'ABC123');
    expect(vehicle1).toBeDefined();
    expect(vehicle1!.make).toEqual('Toyota');
    expect(vehicle1!.model).toEqual('Camry');
    expect(vehicle1!.year).toEqual(2020);
    expect(vehicle1!.vin).toEqual('1234567890ABCDEFG');
    expect(vehicle1!.customer_id).toEqual(customer.id);
    expect(vehicle1!.created_at).toBeInstanceOf(Date);

    // Check second vehicle
    const vehicle2 = result.find(v => v.license_plate === 'XYZ789');
    expect(vehicle2).toBeDefined();
    expect(vehicle2!.make).toEqual('Honda');
    expect(vehicle2!.model).toEqual('Civic');
    expect(vehicle2!.year).toEqual(2019);
    expect(vehicle2!.vin).toBeNull();
    expect(vehicle2!.customer_id).toEqual(customer.id);
    expect(vehicle2!.created_at).toBeInstanceOf(Date);
  });

  it('should return vehicles from database', async () => {
    // Create customer for foreign key constraint
    const customerResult = await db.insert(customersTable)
      .values({
        name: testCustomerInput.name,
        phone: testCustomerInput.phone,
        email: testCustomerInput.email,
        address: testCustomerInput.address
      })
      .returning()
      .execute();

    const customer = customerResult[0];

    // Insert vehicle directly into database
    await db.insert(vehiclesTable)
      .values({
        customer_id: customer.id,
        make: 'Ford',
        model: 'Focus',
        year: 2018,
        license_plate: 'TEST123',
        vin: 'TESTVIN123'
      })
      .execute();

    const result = await getVehicles();

    expect(result).toHaveLength(1);
    expect(result[0].make).toEqual('Ford');
    expect(result[0].model).toEqual('Focus');
    expect(result[0].year).toEqual(2018);
    expect(result[0].license_plate).toEqual('TEST123');
    expect(result[0].vin).toEqual('TESTVIN123');
    expect(result[0].customer_id).toEqual(customer.id);
    expect(result[0].id).toBeDefined();
    expect(result[0].created_at).toBeInstanceOf(Date);
  });
});
