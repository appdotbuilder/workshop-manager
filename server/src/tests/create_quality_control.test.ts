
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { qualityControlTable, usersTable, customersTable, vehiclesTable, serviceOrdersTable } from '../db/schema';
import { type CreateQualityControlInput } from '../schema';
import { createQualityControl } from '../handlers/create_quality_control';
import { eq } from 'drizzle-orm';

describe('createQualityControl', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create quality control with final approval', async () => {
    // Create prerequisite data
    const user = await db.insert(usersTable)
      .values({
        username: 'inspector1',
        email: 'inspector@test.com',
        password_hash: 'hash123',
        full_name: 'QC Inspector',
        role: 'MECHANIC'
      })
      .returning()
      .execute();

    const customer = await db.insert(customersTable)
      .values({
        name: 'Test Customer',
        phone: '1234567890'
      })
      .returning()
      .execute();

    const vehicle = await db.insert(vehiclesTable)
      .values({
        customer_id: customer[0].id,
        make: 'Toyota',
        model: 'Camry',
        year: 2020,
        license_plate: 'ABC123'
      })
      .returning()
      .execute();

    const serviceOrder = await db.insert(serviceOrdersTable)
      .values({
        order_number: 'ORD001',
        customer_id: customer[0].id,
        vehicle_id: vehicle[0].id,
        service_types: ['GENERAL_SERVICE'],
        complaints: 'Test complaints',
        created_by_id: user[0].id
      })
      .returning()
      .execute();

    const testInput: CreateQualityControlInput = {
      service_order_id: serviceOrder[0].id,
      critical_factors_check: {
        safety_check: true,
        functionality_test: true,
        visual_inspection: true
      },
      defects_found: undefined,
      corrective_actions: undefined,
      final_approval: true,
      inspected_by_id: user[0].id
    };

    const result = await createQualityControl(testInput);

    // Basic field validation
    expect(result.service_order_id).toEqual(serviceOrder[0].id);
    expect(result.qc_status).toEqual('PASSED');
    expect(result.critical_factors_check).toEqual(testInput.critical_factors_check);
    expect(result.defects_found).toBeNull();
    expect(result.corrective_actions).toBeNull();
    expect(result.final_approval).toBe(true);
    expect(result.inspected_by_id).toEqual(user[0].id);
    expect(result.id).toBeDefined();
    expect(result.inspection_date).toBeInstanceOf(Date);
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should create quality control with defects found', async () => {
    // Create prerequisite data
    const user = await db.insert(usersTable)
      .values({
        username: 'inspector2',
        email: 'inspector2@test.com',
        password_hash: 'hash123',
        full_name: 'QC Inspector 2',
        role: 'MECHANIC'
      })
      .returning()
      .execute();

    const customer = await db.insert(customersTable)
      .values({
        name: 'Test Customer 2',
        phone: '0987654321'
      })
      .returning()
      .execute();

    const vehicle = await db.insert(vehiclesTable)
      .values({
        customer_id: customer[0].id,
        make: 'Honda',
        model: 'Civic',
        year: 2019,
        license_plate: 'DEF456'
      })
      .returning()
      .execute();

    const serviceOrder = await db.insert(serviceOrdersTable)
      .values({
        order_number: 'ORD002',
        customer_id: customer[0].id,
        vehicle_id: vehicle[0].id,
        service_types: ['BRAKE_SERVICE'],
        complaints: 'Brake issues',
        created_by_id: user[0].id
      })
      .returning()
      .execute();

    const testInput: CreateQualityControlInput = {
      service_order_id: serviceOrder[0].id,
      critical_factors_check: {
        safety_check: false,
        functionality_test: true,
        visual_inspection: true
      },
      defects_found: 'Brake pads not properly aligned',
      corrective_actions: 'Realign brake pads and retest',
      final_approval: false,
      inspected_by_id: user[0].id
    };

    const result = await createQualityControl(testInput);

    expect(result.qc_status).toEqual('FAILED');
    expect(result.defects_found).toEqual('Brake pads not properly aligned');
    expect(result.corrective_actions).toEqual('Realign brake pads and retest');
    expect(result.final_approval).toBe(false);
  });

  it('should save quality control to database', async () => {
    // Create prerequisite data
    const user = await db.insert(usersTable)
      .values({
        username: 'inspector3',
        email: 'inspector3@test.com',
        password_hash: 'hash123',
        full_name: 'QC Inspector 3',
        role: 'MECHANIC'
      })
      .returning()
      .execute();

    const customer = await db.insert(customersTable)
      .values({
        name: 'Test Customer 3',
        phone: '1122334455'
      })
      .returning()
      .execute();

    const vehicle = await db.insert(vehiclesTable)
      .values({
        customer_id: customer[0].id,
        make: 'Ford',
        model: 'Focus',
        year: 2021,
        license_plate: 'GHI789'
      })
      .returning()
      .execute();

    const serviceOrder = await db.insert(serviceOrdersTable)
      .values({
        order_number: 'ORD003',
        customer_id: customer[0].id,
        vehicle_id: vehicle[0].id,
        service_types: ['ENGINE_SERVICE'],
        complaints: 'Engine noise',
        created_by_id: user[0].id
      })
      .returning()
      .execute();

    const testInput: CreateQualityControlInput = {
      service_order_id: serviceOrder[0].id,
      critical_factors_check: {
        safety_check: true,
        functionality_test: true
      },
      final_approval: true,
      inspected_by_id: user[0].id
    };

    const result = await createQualityControl(testInput);

    // Verify data persisted in database
    const qualityControls = await db.select()
      .from(qualityControlTable)
      .where(eq(qualityControlTable.id, result.id))
      .execute();

    expect(qualityControls).toHaveLength(1);
    expect(qualityControls[0].service_order_id).toEqual(serviceOrder[0].id);
    expect(qualityControls[0].qc_status).toEqual('PASSED');
    expect(qualityControls[0].final_approval).toBe(true);
    expect(qualityControls[0].inspected_by_id).toEqual(user[0].id);
    expect(qualityControls[0].created_at).toBeInstanceOf(Date);
  });

  it('should throw error for non-existent service order', async () => {
    const user = await db.insert(usersTable)
      .values({
        username: 'inspector4',
        email: 'inspector4@test.com',
        password_hash: 'hash123',
        full_name: 'QC Inspector 4',
        role: 'MECHANIC'
      })
      .returning()
      .execute();

    const testInput: CreateQualityControlInput = {
      service_order_id: 99999, // Non-existent service order
      critical_factors_check: {
        safety_check: true
      },
      final_approval: true,
      inspected_by_id: user[0].id
    };

    expect(createQualityControl(testInput)).rejects.toThrow(/service order not found/i);
  });
});
