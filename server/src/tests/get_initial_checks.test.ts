
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { initialChecksTable, serviceOrdersTable, customersTable, vehiclesTable, usersTable } from '../db/schema';
import { getInitialChecks } from '../handlers/get_initial_checks';

describe('getInitialChecks', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no initial checks exist', async () => {
    const result = await getInitialChecks();
    expect(result).toEqual([]);
  });

  it('should return all initial checks', async () => {
    // Create prerequisite data
    const customerResult = await db.insert(customersTable)
      .values({
        name: 'John Doe',
        phone: '1234567890',
        email: 'john@example.com',
        address: '123 Main St'
      })
      .returning()
      .execute();

    const vehicleResult = await db.insert(vehiclesTable)
      .values({
        customer_id: customerResult[0].id,
        make: 'Toyota',
        model: 'Camry',
        year: 2020,
        license_plate: 'ABC123',
        vin: '1234567890'
      })
      .returning()
      .execute();

    const userResult = await db.insert(usersTable)
      .values({
        username: 'mechanic1',
        email: 'mechanic@example.com',
        password_hash: 'hashedpassword',
        full_name: 'John Mechanic',
        role: 'MECHANIC'
      })
      .returning()
      .execute();

    const serviceOrderResult = await db.insert(serviceOrdersTable)
      .values({
        order_number: 'SO-001',
        customer_id: customerResult[0].id,
        vehicle_id: vehicleResult[0].id,
        service_types: JSON.stringify(['GENERAL_SERVICE']),
        complaints: 'Engine making noise',
        created_by_id: userResult[0].id
      })
      .returning()
      .execute();

    // Create test initial checks
    const testCheck1 = {
      service_order_id: serviceOrderResult[0].id,
      fluid_levels_check: true,
      battery_condition: true,
      tire_condition: false,
      brake_system_check: true,
      lights_check: true,
      engine_visual_inspection: false,
      additional_findings: 'Battery terminals corroded',
      checked_by_id: userResult[0].id
    };

    const testCheck2 = {
      service_order_id: serviceOrderResult[0].id,
      fluid_levels_check: false,
      battery_condition: true,
      tire_condition: true,
      brake_system_check: false,
      lights_check: true,
      engine_visual_inspection: true,
      additional_findings: 'Low brake fluid',
      checked_by_id: userResult[0].id
    };

    await db.insert(initialChecksTable)
      .values([testCheck1, testCheck2])
      .execute();

    const result = await getInitialChecks();

    expect(result).toHaveLength(2);
    
    // Verify first check
    expect(result[0].service_order_id).toEqual(serviceOrderResult[0].id);
    expect(result[0].fluid_levels_check).toEqual(true);
    expect(result[0].battery_condition).toEqual(true);
    expect(result[0].tire_condition).toEqual(false);
    expect(result[0].brake_system_check).toEqual(true);
    expect(result[0].lights_check).toEqual(true);
    expect(result[0].engine_visual_inspection).toEqual(false);
    expect(result[0].additional_findings).toEqual('Battery terminals corroded');
    expect(result[0].checked_by_id).toEqual(userResult[0].id);
    expect(result[0].id).toBeDefined();
    expect(result[0].created_at).toBeInstanceOf(Date);

    // Verify second check
    expect(result[1].service_order_id).toEqual(serviceOrderResult[0].id);
    expect(result[1].fluid_levels_check).toEqual(false);
    expect(result[1].battery_condition).toEqual(true);
    expect(result[1].tire_condition).toEqual(true);
    expect(result[1].brake_system_check).toEqual(false);
    expect(result[1].lights_check).toEqual(true);
    expect(result[1].engine_visual_inspection).toEqual(true);
    expect(result[1].additional_findings).toEqual('Low brake fluid');
    expect(result[1].checked_by_id).toEqual(userResult[0].id);
  });

  it('should return checks ordered by creation time', async () => {
    // Create prerequisite data
    const customerResult = await db.insert(customersTable)
      .values({
        name: 'Jane Doe',
        phone: '0987654321',
        email: 'jane@example.com'
      })
      .returning()
      .execute();

    const vehicleResult = await db.insert(vehiclesTable)
      .values({
        customer_id: customerResult[0].id,
        make: 'Honda',
        model: 'Civic',
        year: 2019,
        license_plate: 'XYZ789'
      })
      .returning()
      .execute();

    const userResult = await db.insert(usersTable)
      .values({
        username: 'admin1',
        email: 'admin@example.com',
        password_hash: 'hashedpassword',
        full_name: 'Admin User',
        role: 'ADMIN'
      })
      .returning()
      .execute();

    const serviceOrderResult = await db.insert(serviceOrdersTable)
      .values({
        order_number: 'SO-002',
        customer_id: customerResult[0].id,
        vehicle_id: vehicleResult[0].id,
        service_types: JSON.stringify(['BRAKE_SERVICE']),
        complaints: 'Brakes squeaking',
        created_by_id: userResult[0].id
      })
      .returning()
      .execute();

    // Create multiple checks with slight delay
    await db.insert(initialChecksTable)
      .values({
        service_order_id: serviceOrderResult[0].id,
        fluid_levels_check: true,
        battery_condition: true,
        tire_condition: true,
        brake_system_check: true,
        lights_check: true,
        engine_visual_inspection: true,
        additional_findings: 'First check',
        checked_by_id: userResult[0].id
      })
      .execute();

    // Small delay to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));

    await db.insert(initialChecksTable)
      .values({
        service_order_id: serviceOrderResult[0].id,
        fluid_levels_check: false,
        battery_condition: false,
        tire_condition: false,
        brake_system_check: false,
        lights_check: false,
        engine_visual_inspection: false,
        additional_findings: 'Second check',
        checked_by_id: userResult[0].id
      })
      .execute();

    const result = await getInitialChecks();

    expect(result).toHaveLength(2);
    expect(result[0].additional_findings).toEqual('First check');
    expect(result[1].additional_findings).toEqual('Second check');
    expect(result[0].created_at <= result[1].created_at).toBe(true);
  });
});
