
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, customersTable, vehiclesTable, serviceOrdersTable, initialChecksTable } from '../db/schema';
import { type CreateInitialCheckInput } from '../schema';
import { createInitialCheck, getInitialCheckByServiceOrder, updateInitialCheck } from '../handlers/initial_check';
import { eq } from 'drizzle-orm';

describe('Initial Check Handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUserId: number;
  let testCustomerId: number;
  let testVehicleId: number;
  let testServiceOrderId: number;

  beforeEach(async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testmechanic',
        email: 'mechanic@test.com',
        password_hash: 'hashed_password',
        full_name: 'Test Mechanic',
        role: 'MECHANIC'
      })
      .returning()
      .execute();
    testUserId = userResult[0].id;

    // Create test customer
    const customerResult = await db.insert(customersTable)
      .values({
        name: 'Test Customer',
        phone: '1234567890',
        email: 'customer@test.com'
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
        license_plate: 'ABC123'
      })
      .returning()
      .execute();
    testVehicleId = vehicleResult[0].id;

    // Create test service order
    const serviceOrderResult = await db.insert(serviceOrdersTable)
      .values({
        order_number: 'SO-2024-001',
        customer_id: testCustomerId,
        vehicle_id: testVehicleId,
        service_types: ['GENERAL_SERVICE'],
        complaints: 'Engine noise',
        created_by_id: testUserId
      })
      .returning()
      .execute();
    testServiceOrderId = serviceOrderResult[0].id;
  });

  describe('createInitialCheck', () => {
    const testInput: CreateInitialCheckInput = {
      service_order_id: 0, // Will be set in test
      fluid_levels_check: true,
      battery_condition: true,
      tire_condition: false,
      brake_system_check: true,
      lights_check: true,
      engine_visual_inspection: false,
      additional_findings: 'Low tire pressure detected',
      checked_by_id: 0 // Will be set in test
    };

    it('should create initial check successfully', async () => {
      testInput.service_order_id = testServiceOrderId;
      testInput.checked_by_id = testUserId;

      const result = await createInitialCheck(testInput);

      expect(result.service_order_id).toEqual(testServiceOrderId);
      expect(result.fluid_levels_check).toEqual(true);
      expect(result.battery_condition).toEqual(true);
      expect(result.tire_condition).toEqual(false);
      expect(result.brake_system_check).toEqual(true);
      expect(result.lights_check).toEqual(true);
      expect(result.engine_visual_inspection).toEqual(false);
      expect(result.additional_findings).toEqual('Low tire pressure detected');
      expect(result.checked_by_id).toEqual(testUserId);
      expect(result.id).toBeDefined();
      expect(result.created_at).toBeInstanceOf(Date);
    });

    it('should save initial check to database', async () => {
      testInput.service_order_id = testServiceOrderId;
      testInput.checked_by_id = testUserId;

      const result = await createInitialCheck(testInput);

      const savedCheck = await db.select()
        .from(initialChecksTable)
        .where(eq(initialChecksTable.id, result.id))
        .execute();

      expect(savedCheck).toHaveLength(1);
      expect(savedCheck[0].service_order_id).toEqual(testServiceOrderId);
      expect(savedCheck[0].additional_findings).toEqual('Low tire pressure detected');
    });

    it('should throw error for non-existent service order', async () => {
      testInput.service_order_id = 99999;
      testInput.checked_by_id = testUserId;

      await expect(createInitialCheck(testInput)).rejects.toThrow(/service order not found/i);
    });

    it('should throw error for duplicate initial check', async () => {
      testInput.service_order_id = testServiceOrderId;
      testInput.checked_by_id = testUserId;

      // Create first initial check
      await createInitialCheck(testInput);

      // Try to create second initial check for same service order
      await expect(createInitialCheck(testInput)).rejects.toThrow(/initial check already exists/i);
    });
  });

  describe('getInitialCheckByServiceOrder', () => {
    it('should return initial check for existing service order', async () => {
      // Create initial check first
      const testInput: CreateInitialCheckInput = {
        service_order_id: testServiceOrderId,
        fluid_levels_check: true,
        battery_condition: false,
        tire_condition: true,
        brake_system_check: true,
        lights_check: false,
        engine_visual_inspection: true,
        additional_findings: 'Battery terminals corroded',
        checked_by_id: testUserId
      };

      await createInitialCheck(testInput);

      const result = await getInitialCheckByServiceOrder(testServiceOrderId);

      expect(result).not.toBeNull();
      expect(result!.service_order_id).toEqual(testServiceOrderId);
      expect(result!.fluid_levels_check).toEqual(true);
      expect(result!.battery_condition).toEqual(false);
      expect(result!.additional_findings).toEqual('Battery terminals corroded');
    });

    it('should return null for non-existent initial check', async () => {
      const result = await getInitialCheckByServiceOrder(testServiceOrderId);
      expect(result).toBeNull();
    });
  });

  describe('updateInitialCheck', () => {
    let initialCheckId: number;

    beforeEach(async () => {
      const testInput: CreateInitialCheckInput = {
        service_order_id: testServiceOrderId,
        fluid_levels_check: true,
        battery_condition: true,
        tire_condition: true,
        brake_system_check: true,
        lights_check: true,
        engine_visual_inspection: true,
        checked_by_id: testUserId
      };

      const initialCheck = await createInitialCheck(testInput);
      initialCheckId = initialCheck.id;
    });

    it('should update initial check successfully', async () => {
      const updateInput = {
        fluid_levels_check: false,
        battery_condition: false,
        additional_findings: 'Updated findings: battery needs replacement'
      };

      const result = await updateInitialCheck(initialCheckId, updateInput);

      expect(result.fluid_levels_check).toEqual(false);
      expect(result.battery_condition).toEqual(false);
      expect(result.additional_findings).toEqual('Updated findings: battery needs replacement');
      expect(result.tire_condition).toEqual(true); // Should remain unchanged
    });

    it('should throw error for non-existent initial check', async () => {
      const updateInput = {
        fluid_levels_check: false
      };

      await expect(updateInitialCheck(99999, updateInput)).rejects.toThrow(/initial check not found/i);
    });
  });
});
