
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, customersTable, vehiclesTable, serviceOrdersTable, qualityControlTable } from '../db/schema';
import { getQualityControls } from '../handlers/get_quality_controls';

describe('getQualityControls', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no quality controls exist', async () => {
    const result = await getQualityControls();
    expect(result).toEqual([]);
  });

  it('should return all quality control records', async () => {
    // Create prerequisite data
    const userResult = await db.insert(usersTable)
      .values({
        username: 'inspector1',
        email: 'inspector1@test.com',
        password_hash: 'hashedpass',
        full_name: 'Inspector One',
        role: 'MECHANIC'
      })
      .returning()
      .execute();

    const customerResult = await db.insert(customersTable)
      .values({
        name: 'Test Customer',
        phone: '1234567890'
      })
      .returning()
      .execute();

    const vehicleResult = await db.insert(vehiclesTable)
      .values({
        customer_id: customerResult[0].id,
        make: 'Toyota',
        model: 'Camry',
        year: 2020,
        license_plate: 'TEST123'
      })
      .returning()
      .execute();

    const serviceOrderResult = await db.insert(serviceOrdersTable)
      .values({
        order_number: 'SO-2024-001',
        customer_id: customerResult[0].id,
        vehicle_id: vehicleResult[0].id,
        service_types: ['GENERAL_SERVICE'],
        complaints: 'Test complaint',
        created_by_id: userResult[0].id
      })
      .returning()
      .execute();

    // Create quality control records
    await db.insert(qualityControlTable)
      .values([
        {
          service_order_id: serviceOrderResult[0].id,
          qc_status: 'PASSED',
          critical_factors_check: { 'safety_check': true, 'functionality_check': true },
          defects_found: null,
          corrective_actions: null,
          final_approval: true,
          inspected_by_id: userResult[0].id
        },
        {
          service_order_id: serviceOrderResult[0].id,
          qc_status: 'FAILED',
          critical_factors_check: { 'safety_check': false, 'functionality_check': true },
          defects_found: 'Safety issue found',
          corrective_actions: 'Fix safety issue',
          final_approval: false,
          inspected_by_id: userResult[0].id
        }
      ])
      .execute();

    const result = await getQualityControls();

    expect(result).toHaveLength(2);

    // Verify first quality control record
    const passedQc = result.find(qc => qc.qc_status === 'PASSED');
    expect(passedQc).toBeDefined();
    expect(passedQc!.service_order_id).toEqual(serviceOrderResult[0].id);
    expect(passedQc!.critical_factors_check).toEqual({ 'safety_check': true, 'functionality_check': true });
    expect(passedQc!.defects_found).toBeNull();
    expect(passedQc!.corrective_actions).toBeNull();
    expect(passedQc!.final_approval).toBe(true);
    expect(passedQc!.inspected_by_id).toEqual(userResult[0].id);
    expect(passedQc!.inspection_date).toBeInstanceOf(Date);
    expect(passedQc!.created_at).toBeInstanceOf(Date);

    // Verify second quality control record
    const failedQc = result.find(qc => qc.qc_status === 'FAILED');
    expect(failedQc).toBeDefined();
    expect(failedQc!.service_order_id).toEqual(serviceOrderResult[0].id);
    expect(failedQc!.critical_factors_check).toEqual({ 'safety_check': false, 'functionality_check': true });
    expect(failedQc!.defects_found).toEqual('Safety issue found');
    expect(failedQc!.corrective_actions).toEqual('Fix safety issue');
    expect(failedQc!.final_approval).toBe(false);
    expect(failedQc!.inspected_by_id).toEqual(userResult[0].id);
    expect(failedQc!.inspection_date).toBeInstanceOf(Date);
    expect(failedQc!.created_at).toBeInstanceOf(Date);
  });

  it('should handle quality controls with different statuses', async () => {
    // Create prerequisite data
    const userResult = await db.insert(usersTable)
      .values({
        username: 'inspector2',
        email: 'inspector2@test.com',
        password_hash: 'hashedpass',
        full_name: 'Inspector Two',
        role: 'MECHANIC'
      })
      .returning()
      .execute();

    const customerResult = await db.insert(customersTable)
      .values({
        name: 'Another Customer',
        phone: '0987654321'
      })
      .returning()
      .execute();

    const vehicleResult = await db.insert(vehiclesTable)
      .values({
        customer_id: customerResult[0].id,
        make: 'Honda',
        model: 'Civic',
        year: 2019,
        license_plate: 'TEST456'
      })
      .returning()
      .execute();

    const serviceOrderResult = await db.insert(serviceOrdersTable)
      .values({
        order_number: 'SO-2024-002',
        customer_id: customerResult[0].id,
        vehicle_id: vehicleResult[0].id,
        service_types: ['BRAKE_SERVICE'],
        complaints: 'Brake issue',
        created_by_id: userResult[0].id
      })
      .returning()
      .execute();

    // Create quality control records with different statuses
    await db.insert(qualityControlTable)
      .values([
        {
          service_order_id: serviceOrderResult[0].id,
          qc_status: 'NEEDS_REWORK',
          critical_factors_check: { 'brake_test': false },
          defects_found: 'Brake pads not properly installed',
          corrective_actions: 'Reinstall brake pads correctly',
          final_approval: false,
          inspected_by_id: userResult[0].id
        },
        {
          service_order_id: serviceOrderResult[0].id,
          qc_status: 'PENDING',
          critical_factors_check: {},
          defects_found: null,
          corrective_actions: null,
          final_approval: false,
          inspected_by_id: userResult[0].id
        }
      ])
      .execute();

    const result = await getQualityControls();

    expect(result).toHaveLength(2);

    const statuses = result.map(qc => qc.qc_status);
    expect(statuses).toContain('NEEDS_REWORK');
    expect(statuses).toContain('PENDING');

    const reworkQc = result.find(qc => qc.qc_status === 'NEEDS_REWORK');
    expect(reworkQc!.defects_found).toEqual('Brake pads not properly installed');
    expect(reworkQc!.corrective_actions).toEqual('Reinstall brake pads correctly');

    const pendingQc = result.find(qc => qc.qc_status === 'PENDING');
    expect(pendingQc!.defects_found).toBeNull();
    expect(pendingQc!.corrective_actions).toBeNull();
  });
});
