
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { customersTable, vehiclesTable } from '../db/schema';
import { type CreateVehicleInput, type Customer } from '../schema';
import { createVehicle, getVehiclesByCustomer, getVehicleById } from '../handlers/vehicle_management';
import { eq } from 'drizzle-orm';

// Test customer data
const testCustomer = {
  name: 'John Doe',
  phone: '+1234567890',
  email: 'john@example.com',
  address: '123 Main St'
};

// Test vehicle data
const testVehicleInput: CreateVehicleInput = {
  customer_id: 1, // Will be set after customer creation
  make: 'Toyota',
  model: 'Camry',
  year: 2020,
  license_plate: 'ABC123',
  vin: '1HGBH41JXMN109186'
};

describe('Vehicle Management', () => {
  let testCustomerId: number;

  beforeEach(async () => {
    await createDB();
    
    // Create test customer
    const customerResult = await db.insert(customersTable)
      .values(testCustomer)
      .returning()
      .execute();
    
    testCustomerId = customerResult[0].id;
    testVehicleInput.customer_id = testCustomerId;
  });

  afterEach(resetDB);

  describe('createVehicle', () => {
    it('should create a vehicle successfully', async () => {
      const result = await createVehicle(testVehicleInput);

      expect(result.id).toBeDefined();
      expect(result.customer_id).toEqual(testCustomerId);
      expect(result.make).toEqual('Toyota');
      expect(result.model).toEqual('Camry');
      expect(result.year).toEqual(2020);
      expect(result.license_plate).toEqual('ABC123');
      expect(result.vin).toEqual('1HGBH41JXMN109186');
      expect(result.created_at).toBeInstanceOf(Date);
    });

    it('should save vehicle to database', async () => {
      const result = await createVehicle(testVehicleInput);

      const vehicles = await db.select()
        .from(vehiclesTable)
        .where(eq(vehiclesTable.id, result.id))
        .execute();

      expect(vehicles).toHaveLength(1);
      expect(vehicles[0].make).toEqual('Toyota');
      expect(vehicles[0].license_plate).toEqual('ABC123');
      expect(vehicles[0].customer_id).toEqual(testCustomerId);
    });

    it('should create vehicle without VIN', async () => {
      const inputWithoutVin = {
        ...testVehicleInput,
        vin: undefined
      };

      const result = await createVehicle(inputWithoutVin);

      expect(result.id).toBeDefined();
      expect(result.vin).toBeNull();
      expect(result.make).toEqual('Toyota');
    });

    it('should throw error for non-existent customer', async () => {
      const invalidInput = {
        ...testVehicleInput,
        customer_id: 99999
      };

      expect(createVehicle(invalidInput)).rejects.toThrow(/customer not found/i);
    });

    it('should enforce unique license plate constraint', async () => {
      await createVehicle(testVehicleInput);

      const duplicateInput = {
        ...testVehicleInput,
        make: 'Honda',
        model: 'Civic'
      };

      expect(createVehicle(duplicateInput)).rejects.toThrow();
    });
  });

  describe('getVehiclesByCustomer', () => {
    it('should return empty array for customer with no vehicles', async () => {
      const vehicles = await getVehiclesByCustomer(testCustomerId);
      expect(vehicles).toHaveLength(0);
    });

    it('should return all vehicles for a customer', async () => {
      // Create multiple vehicles
      await createVehicle(testVehicleInput);
      
      const secondVehicle = {
        ...testVehicleInput,
        license_plate: 'XYZ789',
        make: 'Honda',
        model: 'Civic'
      };
      await createVehicle(secondVehicle);

      const vehicles = await getVehiclesByCustomer(testCustomerId);

      expect(vehicles).toHaveLength(2);
      expect(vehicles.some(v => v.license_plate === 'ABC123')).toBe(true);
      expect(vehicles.some(v => v.license_plate === 'XYZ789')).toBe(true);
      expect(vehicles.every(v => v.customer_id === testCustomerId)).toBe(true);
    });

    it('should throw error for non-existent customer', async () => {
      expect(getVehiclesByCustomer(99999)).rejects.toThrow(/customer not found/i);
    });
  });

  describe('getVehicleById', () => {
    it('should return vehicle when found', async () => {
      const created = await createVehicle(testVehicleInput);
      
      const vehicle = await getVehicleById(created.id);

      expect(vehicle).not.toBeNull();
      expect(vehicle!.id).toEqual(created.id);
      expect(vehicle!.make).toEqual('Toyota');
      expect(vehicle!.license_plate).toEqual('ABC123');
    });

    it('should return null when vehicle not found', async () => {
      const vehicle = await getVehicleById(99999);
      expect(vehicle).toBeNull();
    });

    it('should include all vehicle fields', async () => {
      const created = await createVehicle(testVehicleInput);
      
      const vehicle = await getVehicleById(created.id);

      expect(vehicle).not.toBeNull();
      expect(vehicle!.customer_id).toEqual(testCustomerId);
      expect(vehicle!.make).toEqual('Toyota');
      expect(vehicle!.model).toEqual('Camry');
      expect(vehicle!.year).toEqual(2020);
      expect(vehicle!.license_plate).toEqual('ABC123');
      expect(vehicle!.vin).toEqual('1HGBH41JXMN109186');
      expect(vehicle!.created_at).toBeInstanceOf(Date);
    });
  });
});
