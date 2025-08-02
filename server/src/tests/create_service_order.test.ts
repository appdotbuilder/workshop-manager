
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { serviceOrdersTable, customersTable, vehiclesTable, usersTable } from '../db/schema';
import { type CreateServiceOrderInput } from '../schema';
import { createServiceOrder } from '../handlers/create_service_order';
import { eq } from 'drizzle-orm';

describe('createServiceOrder', () => {
  let testCustomerId: number;
  let testVehicleId: number;
  let testUserId: number;

  beforeEach(async () => {
    await createDB();

    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        full_name: 'Test User',
        role: 'ADMIN'
      })
      .returning()
      .execute();
    testUserId = userResult[0].id;

    // Create test customer
    const customerResult = await db.insert(customersTable)
      .values({
        name: 'John Doe',
        phone: '1234567890',
        email: 'john@example.com',
        address: '123 Main St'
      })
      .returning()
      .execute();
    testCustomerId = customerResult[0].id;

    // Create test vehicle
    const vehicleResult = await db.insert(vehiclesTable)
      .values({
        customer_id: testCustomerId,
        make: 'Toyota',
        model: 'Camry',
        year: 2020,
        license_plate: 'ABC123',
        vin: '1234567890'
      })
      .returning()
      .execute();
    testVehicleId = vehicleResult[0].id;
  });

  afterEach(resetDB);

  it('should create a service order with all fields', async () => {
    const input: CreateServiceOrderInput = {
      customer_id: testCustomerId,
      vehicle_id: testVehicleId,
      service_types: ['GENERAL_SERVICE', 'BRAKE_SERVICE'],
      complaints: 'Engine making strange noise',
      referral_source: 'Online search',
      body_defects: 'Minor scratches on door',
      other_defects: 'Worn tires',
      assigned_mechanic_id: testUserId,
      created_by_id: testUserId
    };

    const result = await createServiceOrder(input);

    // Verify basic fields
    expect(result.customer_id).toEqual(testCustomerId);
    expect(result.vehicle_id).toEqual(testVehicleId);
    expect(result.service_types).toEqual(['GENERAL_SERVICE', 'BRAKE_SERVICE']);
    expect(result.complaints).toEqual('Engine making strange noise');
    expect(result.referral_source).toEqual('Online search');
    expect(result.body_defects).toEqual('Minor scratches on door');
    expect(result.other_defects).toEqual('Worn tires');
    expect(result.assigned_mechanic_id).toEqual(testUserId);
    expect(result.created_by_id).toEqual(testUserId);

    // Verify generated fields
    expect(result.id).toBeDefined();
    expect(result.order_number).toMatch(/^SO-\d+-\d{3}$/);
    expect(result.status).toEqual('PENDING_INITIAL_CHECK');
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeNull();
  });

  it('should create service order with minimal required fields', async () => {
    const minimalInput: CreateServiceOrderInput = {
      customer_id: testCustomerId,
      vehicle_id: testVehicleId,
      service_types: ['ENGINE_SERVICE'],
      complaints: 'Basic service needed',
      created_by_id: testUserId
    };

    const result = await createServiceOrder(minimalInput);

    expect(result.customer_id).toEqual(testCustomerId);
    expect(result.vehicle_id).toEqual(testVehicleId);
    expect(result.service_types).toEqual(['ENGINE_SERVICE']);
    expect(result.complaints).toEqual('Basic service needed');
    expect(result.referral_source).toBeNull();
    expect(result.body_defects).toBeNull();
    expect(result.other_defects).toBeNull();
    expect(result.assigned_mechanic_id).toBeNull();
    expect(result.created_by_id).toEqual(testUserId);
    expect(result.status).toEqual('PENDING_INITIAL_CHECK');
  });

  it('should save service order to database', async () => {
    const input: CreateServiceOrderInput = {
      customer_id: testCustomerId,
      vehicle_id: testVehicleId,
      service_types: ['GENERAL_SERVICE', 'BRAKE_SERVICE'],
      complaints: 'Engine making strange noise',
      referral_source: 'Online search',
      body_defects: 'Minor scratches on door',
      other_defects: 'Worn tires',
      created_by_id: testUserId
    };

    const result = await createServiceOrder(input);

    // Verify record was saved to database
    const savedOrders = await db.select()
      .from(serviceOrdersTable)
      .where(eq(serviceOrdersTable.id, result.id))
      .execute();

    expect(savedOrders).toHaveLength(1);
    const savedOrder = savedOrders[0];
    
    expect(savedOrder.order_number).toEqual(result.order_number);
    expect(savedOrder.customer_id).toEqual(testCustomerId);
    expect(savedOrder.vehicle_id).toEqual(testVehicleId);
    expect(savedOrder.service_types).toEqual(['GENERAL_SERVICE', 'BRAKE_SERVICE']);
    expect(savedOrder.complaints).toEqual('Engine making strange noise');
    expect(savedOrder.status).toEqual('PENDING_INITIAL_CHECK');
  });

  it('should generate unique order numbers', async () => {
    const input: CreateServiceOrderInput = {
      customer_id: testCustomerId,
      vehicle_id: testVehicleId,
      service_types: ['GENERAL_SERVICE', 'BRAKE_SERVICE'],
      complaints: 'Engine making strange noise',
      created_by_id: testUserId
    };

    const result1 = await createServiceOrder(input);
    const result2 = await createServiceOrder(input);

    expect(result1.order_number).not.toEqual(result2.order_number);
    expect(result1.order_number).toMatch(/^SO-\d+-\d{3}$/);
    expect(result2.order_number).toMatch(/^SO-\d+-\d{3}$/);
  });

  it('should throw error when customer does not exist', async () => {
    const input: CreateServiceOrderInput = {
      customer_id: 99999, // Non-existent customer
      vehicle_id: testVehicleId,
      service_types: ['GENERAL_SERVICE'],
      complaints: 'Test complaint',
      created_by_id: testUserId
    };

    expect(createServiceOrder(input)).rejects.toThrow(/customer not found/i);
  });

  it('should throw error when vehicle does not exist', async () => {
    const input: CreateServiceOrderInput = {
      customer_id: testCustomerId,
      vehicle_id: 99999, // Non-existent vehicle
      service_types: ['GENERAL_SERVICE'],
      complaints: 'Test complaint',
      created_by_id: testUserId
    };

    expect(createServiceOrder(input)).rejects.toThrow(/vehicle not found/i);
  });

  it('should throw error when vehicle does not belong to customer', async () => {
    // Create another customer and vehicle
    const otherCustomer = await db.insert(customersTable)
      .values({
        name: 'Jane Smith',
        phone: '0987654321',
        email: 'jane@example.com'
      })
      .returning()
      .execute();

    const otherVehicle = await db.insert(vehiclesTable)
      .values({
        customer_id: otherCustomer[0].id,
        make: 'Honda',
        model: 'Civic',
        year: 2019,
        license_plate: 'XYZ789'
      })
      .returning()
      .execute();

    const input: CreateServiceOrderInput = {
      customer_id: testCustomerId, // Original customer
      vehicle_id: otherVehicle[0].id, // Vehicle belonging to different customer
      service_types: ['GENERAL_SERVICE'],
      complaints: 'Test complaint',
      created_by_id: testUserId
    };

    expect(createServiceOrder(input)).rejects.toThrow(/vehicle does not belong to the specified customer/i);
  });
});
