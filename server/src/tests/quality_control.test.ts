
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, customersTable, vehiclesTable, serviceOrdersTable, qualityControlTable } from '../db/schema';
import { type CreateQualityControlInput } from '../schema';
import { createQualityControl, getQualityControlByServiceOrder, updateQualityControl, getQualityControlQueue } from '../handlers/quality_control';
import { eq } from 'drizzle-orm';

describe('Quality Control Handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let userId: number;
  let customerId: number;
  let vehicleId: number;
  let serviceOrderId: number;

  beforeEach(async () => {
    // Create test user
    const user = await db.insert(usersTable)
      .values({
        username: 'kabeng_user',
        email: 'kabeng@test.com',
        password_hash: 'hashed_password',
        full_name: 'Kabeng User',
        role: 'KABENG'
      })
      .returning()
      .execute();
    userId = user[0].id;

    // Create test customer
    const customer = await db.insert(customersTable)
      .values({
        name: 'Test Customer',
        phone: '1234567890',
        email: 'customer@test.com'
      })
      .returning()
      .execute();
    customerId = customer[0].id;

    // Create test vehicle
    const vehicle = await db.insert(vehiclesTable)
      .values({
        customer_id: customerId,
        make: 'Toyota',
        model: 'Camry',
        year: 2020,
        license_plate: 'ABC123'
      })
      .returning()
      .execute();
    vehicleId = vehicle[0].id;

    // Create test service order
    const serviceOrder = await db.insert(serviceOrdersTable)
      .values({
        order_number: 'SO-001',
        customer_id: customerId,
        vehicle_id: vehicleId,
        service_types: ['GENERAL_SERVICE'],
        complaints: 'Engine noise',
        created_by_id: userId,
        status: 'QUALITY_CONTROL'
      })
      .returning()
      .execute();
    serviceOrderId = serviceOrder[0].id;
  });

  describe('createQualityControl', () => {
    it('should create quality control with PASSED status when final_approval is true', async () => {
      const testInput: CreateQualityControlInput = {
        service_order_id: serviceOrderId,
        critical_factors_check: {
          safety_check: true,
          functionality_check: true,
          visual_inspection: true
        },
        final_approval: true,
        inspected_by_id: userId
      };

      const result = await createQualityControl(testInput);

      expect(result.service_order_id).toEqual(serviceOrderId);
      expect(result.qc_status).toEqual('PASSED');
      expect(result.critical_factors_check).toEqual(testInput.critical_factors_check);
      expect(result.final_approval).toBe(true);
      expect(result.inspected_by_id).toEqual(userId);
      expect(result.id).toBeDefined();
      expect(result.created_at).toBeInstanceOf(Date);
      expect(result.inspection_date).toBeInstanceOf(Date);
    });

    it('should create quality control with FAILED status when defects found', async () => {
      const testInput: CreateQualityControlInput = {
        service_order_id: serviceOrderId,
        critical_factors_check: {
          safety_check: false,
          functionality_check: true
        },
        defects_found: 'Safety issues detected',
        corrective_actions: 'Rework required on safety components',
        final_approval: false,
        inspected_by_id: userId
      };

      const result = await createQualityControl(testInput);

      expect(result.qc_status).toEqual('FAILED');
      expect(result.defects_found).toEqual('Safety issues detected');
      expect(result.corrective_actions).toEqual('Rework required on safety components');
      expect(result.final_approval).toBe(false);
    });

    it('should save quality control to database', async () => {
      const testInput: CreateQualityControlInput = {
        service_order_id: serviceOrderId,
        critical_factors_check: { basic_check: true },
        final_approval: true,
        inspected_by_id: userId
      };

      const result = await createQualityControl(testInput);

      const saved = await db.select()
        .from(qualityControlTable)
        .where(eq(qualityControlTable.id, result.id))
        .execute();

      expect(saved).toHaveLength(1);
      expect(saved[0].service_order_id).toEqual(serviceOrderId);
      expect(saved[0].qc_status).toEqual('PASSED');
      expect(saved[0].final_approval).toBe(true);
    });
  });

  describe('getQualityControlByServiceOrder', () => {
    it('should return quality control for existing service order', async () => {
      const testInput: CreateQualityControlInput = {
        service_order_id: serviceOrderId,
        critical_factors_check: { test_check: true },
        final_approval: true,
        inspected_by_id: userId
      };

      await createQualityControl(testInput);

      const result = await getQualityControlByServiceOrder(serviceOrderId);

      expect(result).toBeDefined();
      expect(result!.service_order_id).toEqual(serviceOrderId);
      expect(result!.qc_status).toEqual('PASSED');
      expect(result!.critical_factors_check).toEqual({ test_check: true });
      expect(result!.inspection_date).toBeInstanceOf(Date);
    });

    it('should return null for non-existing service order', async () => {
      const result = await getQualityControlByServiceOrder(99999);

      expect(result).toBeNull();
    });
  });

  describe('updateQualityControl', () => {
    it('should update quality control status and fields', async () => {
      const testInput: CreateQualityControlInput = {
        service_order_id: serviceOrderId,
        critical_factors_check: { initial_check: true },
        final_approval: false,
        inspected_by_id: userId
      };

      const created = await createQualityControl(testInput);

      const updateInput = {
        defects_found: 'Minor cosmetic issues',
        corrective_actions: 'Polish and clean',
        final_approval: true
      };

      const result = await updateQualityControl(created.id, updateInput);

      expect(result.defects_found).toEqual('Minor cosmetic issues');
      expect(result.corrective_actions).toEqual('Polish and clean');
      expect(result.final_approval).toBe(true);
      expect(result.qc_status).toEqual('PASSED');
      expect(result.critical_factors_check).toEqual({ initial_check: true });
    });

    it('should throw error for non-existing quality control record', async () => {
      const updateInput = {
        final_approval: true
      };

      expect(updateQualityControl(99999, updateInput)).rejects.toThrow(/not found/i);
    });
  });

  describe('getQualityControlQueue', () => {
    it('should return pending quality control items', async () => {
      // Create a QC record with PENDING status
      await db.insert(qualityControlTable)
        .values({
          service_order_id: serviceOrderId,
          qc_status: 'PENDING',
          critical_factors_check: {},
          final_approval: false,
          inspected_by_id: userId
        })
        .execute();

      const result = await getQualityControlQueue();

      expect(result).toHaveLength(1);
      expect(result[0].service_order_id).toEqual(serviceOrderId);
      expect(result[0].qc_status).toEqual('PENDING');
      expect(result[0].inspection_date).toBeInstanceOf(Date);
      expect(typeof result[0].critical_factors_check).toBe('object');
    });

    it('should not return completed quality control items', async () => {
      // Create a QC record with PASSED status
      await db.insert(qualityControlTable)
        .values({
          service_order_id: serviceOrderId,
          qc_status: 'PASSED',
          critical_factors_check: {},
          final_approval: true,
          inspected_by_id: userId
        })
        .execute();

      const result = await getQualityControlQueue();

      expect(result).toHaveLength(0);
    });

    it('should return empty array when no pending QC items', async () => {
      const result = await getQualityControlQueue();

      expect(result).toHaveLength(0);
    });
  });
});
