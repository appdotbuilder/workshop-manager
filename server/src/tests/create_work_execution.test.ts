
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { workExecutionTable, serviceOrdersTable, customersTable, vehiclesTable, usersTable } from '../db/schema';
import { type CreateWorkExecutionInput } from '../schema';
import { createWorkExecution } from '../handlers/create_work_execution';
import { eq } from 'drizzle-orm';

describe('createWorkExecution', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a work execution record', async () => {
    // Create prerequisite data
    const customerResult = await db.insert(customersTable).values({
      name: 'Test Customer',
      phone: '+1234567890',
      email: 'test@example.com'
    }).returning().execute();

    const vehicleResult = await db.insert(vehiclesTable).values({
      customer_id: customerResult[0].id,
      make: 'Toyota',
      model: 'Camry',
      year: 2020,
      license_plate: 'ABC123'
    }).returning().execute();

    const userResult = await db.insert(usersTable).values({
      username: 'testmechanic',
      email: 'mechanic@test.com',
      password_hash: 'hashedpassword',
      full_name: 'Test Mechanic',
      role: 'MECHANIC'
    }).returning().execute();

    const serviceOrderResult = await db.insert(serviceOrdersTable).values({
      order_number: 'SO-2024-001',
      customer_id: customerResult[0].id,
      vehicle_id: vehicleResult[0].id,
      service_types: ['GENERAL_SERVICE'],
      complaints: 'Engine noise',
      created_by_id: userResult[0].id
    }).returning().execute();

    const testInput: CreateWorkExecutionInput = {
      service_order_id: serviceOrderResult[0].id,
      work_description: 'Replaced air filter and oil change',
      parts_used: 'Air filter, Oil filter, Engine oil',
      labor_hours: 2.5,
      completion_checklist: {
        'oil_changed': true,
        'filter_replaced': true,
        'test_drive': false
      },
      work_photos: ['https://example.com/photo1.jpg'],
      executed_by_id: userResult[0].id
    };

    const result = await createWorkExecution(testInput);

    // Basic field validation
    expect(result.service_order_id).toEqual(serviceOrderResult[0].id);
    expect(result.work_description).toEqual('Replaced air filter and oil change');
    expect(result.parts_used).toEqual('Air filter, Oil filter, Engine oil');
    expect(result.labor_hours).toEqual(2.5);
    expect(typeof result.labor_hours).toBe('number');
    expect(result.completion_checklist).toEqual({
      'oil_changed': true,
      'filter_replaced': true,
      'test_drive': false
    });
    expect(result.work_photos).toEqual(['https://example.com/photo1.jpg']);
    expect(result.executed_by_id).toEqual(userResult[0].id);
    expect(result.id).toBeDefined();
    expect(result.start_date).toBeInstanceOf(Date);
    expect(result.completion_date).toBeNull();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save work execution to database', async () => {
    // Create prerequisite data
    const customerResult = await db.insert(customersTable).values({
      name: 'Test Customer',
      phone: '+1234567890'
    }).returning().execute();

    const vehicleResult = await db.insert(vehiclesTable).values({
      customer_id: customerResult[0].id,
      make: 'Honda',
      model: 'Civic',
      year: 2019,
      license_plate: 'XYZ789'
    }).returning().execute();

    const userResult = await db.insert(usersTable).values({
      username: 'testtech',
      email: 'tech@test.com',
      password_hash: 'hashedpassword',
      full_name: 'Test Technician',
      role: 'MECHANIC'
    }).returning().execute();

    const serviceOrderResult = await db.insert(serviceOrdersTable).values({
      order_number: 'SO-2024-002',
      customer_id: customerResult[0].id,
      vehicle_id: vehicleResult[0].id,
      service_types: ['BRAKE_SERVICE'],
      complaints: 'Brake pads worn',
      created_by_id: userResult[0].id
    }).returning().execute();

    const testInput: CreateWorkExecutionInput = {
      service_order_id: serviceOrderResult[0].id,
      work_description: 'Replaced brake pads and rotors',
      labor_hours: 3.0,
      executed_by_id: userResult[0].id
    };

    const result = await createWorkExecution(testInput);

    // Query database to verify record was saved
    const workExecutions = await db.select()
      .from(workExecutionTable)
      .where(eq(workExecutionTable.id, result.id))
      .execute();

    expect(workExecutions).toHaveLength(1);
    expect(workExecutions[0].service_order_id).toEqual(serviceOrderResult[0].id);
    expect(workExecutions[0].work_description).toEqual('Replaced brake pads and rotors');
    expect(workExecutions[0].parts_used).toBeNull();
    expect(parseFloat(workExecutions[0].labor_hours)).toEqual(3.0);
    expect(workExecutions[0].completion_checklist).toEqual({});
    expect(workExecutions[0].work_photos).toEqual([]);
    expect(workExecutions[0].executed_by_id).toEqual(userResult[0].id);
    expect(typeof workExecutions[0].start_date).toBe('string'); // Date column returns string
    expect(workExecutions[0].start_date).toMatch(/^\d{4}-\d{2}-\d{2}$/); // YYYY-MM-DD format
    expect(workExecutions[0].completion_date).toBeNull();
    expect(workExecutions[0].created_at).toBeInstanceOf(Date);
  });

  it('should handle minimal input with defaults', async () => {
    // Create prerequisite data
    const customerResult = await db.insert(customersTable).values({
      name: 'Minimal Customer',
      phone: '+9876543210'
    }).returning().execute();

    const vehicleResult = await db.insert(vehiclesTable).values({
      customer_id: customerResult[0].id,
      make: 'Ford',
      model: 'F-150',
      year: 2021,
      license_plate: 'MIN123'
    }).returning().execute();

    const userResult = await db.insert(usersTable).values({
      username: 'minimaluser',
      email: 'minimal@test.com',
      password_hash: 'hashedpassword',
      full_name: 'Minimal User',
      role: 'MECHANIC'
    }).returning().execute();

    const serviceOrderResult = await db.insert(serviceOrdersTable).values({
      order_number: 'SO-2024-003',
      customer_id: customerResult[0].id,
      vehicle_id: vehicleResult[0].id,
      service_types: ['ENGINE_SERVICE'],
      complaints: 'Engine check',
      created_by_id: userResult[0].id
    }).returning().execute();

    const minimalInput: CreateWorkExecutionInput = {
      service_order_id: serviceOrderResult[0].id,
      work_description: 'Basic engine inspection',
      labor_hours: 1.0,
      executed_by_id: userResult[0].id
    };

    const result = await createWorkExecution(minimalInput);

    expect(result.parts_used).toBeNull();
    expect(result.completion_checklist).toEqual({});
    expect(result.work_photos).toEqual([]);
    expect(result.labor_hours).toEqual(1.0);
    expect(typeof result.labor_hours).toBe('number');
  });
});
