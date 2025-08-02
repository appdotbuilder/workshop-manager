
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { initialChecksTable, usersTable, customersTable, vehiclesTable, serviceOrdersTable } from '../db/schema';
import { type CreateInitialCheckInput } from '../schema';
import { createInitialCheck } from '../handlers/create_initial_check';
import { eq } from 'drizzle-orm';

describe('createInitialCheck', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUser: { id: number };
  let testCustomer: { id: number };
  let testVehicle: { id: number };
  let testServiceOrder: { id: number };

  beforeEach(async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testmechanic',
        email: 'mechanic@test.com',
        password_hash: 'hashedpassword',
        full_name: 'Test Mechanic',
        role: 'MECHANIC'
      })
      .returning()
      .execute();
    testUser = userResult[0];

    // Create test customer
    const customerResult = await db.insert(customersTable)
      .values({
        name: 'Test Customer',
        phone: '1234567890',
        email: 'customer@test.com'
      })
      .returning()
      .execute();
    testCustomer = customerResult[0];

    // Create test vehicle
    const vehicleResult = await db.insert(vehiclesTable)
      .values({
        customer_id: testCustomer.id,
        make: 'Toyota',
        model: 'Camry',
        year: 2020,
        license_plate: 'ABC123'
      })
      .returning()
      .execute();
    testVehicle = vehicleResult[0];

    // Create test service order
    const serviceOrderResult = await db.insert(serviceOrdersTable)
      .values({
        order_number: 'SO-2024-001',
        customer_id: testCustomer.id,
        vehicle_id: testVehicle.id,
        service_types: ['GENERAL_SERVICE'],
        complaints: 'Engine making noise',
        created_by_id: testUser.id
      })
      .returning()
      .execute();
    testServiceOrder = serviceOrderResult[0];
  });

  const testInput: CreateInitialCheckInput = {
    service_order_id: 0, // Will be set in tests
    fluid_levels_check: true,
    battery_condition: false,
    tire_condition: true,
    brake_system_check: true,
    lights_check: false,
    engine_visual_inspection: true,
    additional_findings: 'Battery terminals corroded',
    checked_by_id: 0 // Will be set in tests
  };

  it('should create an initial check', async () => {
    const input = {
      ...testInput,
      service_order_id: testServiceOrder.id,
      checked_by_id: testUser.id
    };

    const result = await createInitialCheck(input);

    // Basic field validation
    expect(result.service_order_id).toEqual(testServiceOrder.id);
    expect(result.fluid_levels_check).toEqual(true);
    expect(result.battery_condition).toEqual(false);
    expect(result.tire_condition).toEqual(true);
    expect(result.brake_system_check).toEqual(true);
    expect(result.lights_check).toEqual(false);
    expect(result.engine_visual_inspection).toEqual(true);
    expect(result.additional_findings).toEqual('Battery terminals corroded');
    expect(result.checked_by_id).toEqual(testUser.id);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save initial check to database', async () => {
    const input = {
      ...testInput,
      service_order_id: testServiceOrder.id,
      checked_by_id: testUser.id
    };

    const result = await createInitialCheck(input);

    const initialChecks = await db.select()
      .from(initialChecksTable)
      .where(eq(initialChecksTable.id, result.id))
      .execute();

    expect(initialChecks).toHaveLength(1);
    expect(initialChecks[0].service_order_id).toEqual(testServiceOrder.id);
    expect(initialChecks[0].fluid_levels_check).toEqual(true);
    expect(initialChecks[0].battery_condition).toEqual(false);
    expect(initialChecks[0].additional_findings).toEqual('Battery terminals corroded');
    expect(initialChecks[0].created_at).toBeInstanceOf(Date);
  });

  it('should handle initial check without additional findings', async () => {
    const input = {
      ...testInput,
      service_order_id: testServiceOrder.id,
      checked_by_id: testUser.id,
      additional_findings: undefined
    };

    const result = await createInitialCheck(input);

    expect(result.additional_findings).toBeNull();
    expect(result.fluid_levels_check).toEqual(true);
    expect(result.battery_condition).toEqual(false);
  });

  it('should throw error for non-existent service order', async () => {
    const input = {
      ...testInput,
      service_order_id: 99999,
      checked_by_id: testUser.id
    };

    await expect(createInitialCheck(input)).rejects.toThrow(/Service order with ID 99999 not found/);
  });
});
