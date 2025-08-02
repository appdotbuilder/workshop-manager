
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, customersTable, vehiclesTable, serviceOrdersTable, workExecutionTable } from '../db/schema';
import { getWorkExecutions } from '../handlers/get_work_executions';

// Test data
const testUser = {
  username: 'testmechanic',
  email: 'mechanic@test.com',
  password_hash: 'hashedpassword',
  full_name: 'Test Mechanic',
  role: 'MECHANIC' as const
};

const testCustomer = {
  name: 'Test Customer',
  phone: '1234567890',
  email: 'customer@test.com',
  address: '123 Test St'
};

const testVehicle = {
  customer_id: 1,
  make: 'Toyota',
  model: 'Camry',
  year: 2020,
  license_plate: 'ABC123',
  vin: '1HGBH41JXMN109186'
};

const testServiceOrder = {
  order_number: 'SO-20241201-001',
  customer_id: 1,
  vehicle_id: 1,
  service_types: ['GENERAL_SERVICE'],
  complaints: 'Engine making noise',
  created_by_id: 1
};

const testWorkExecution = {
  service_order_id: 1,
  work_description: 'Replaced engine oil and filter',
  parts_used: 'Oil filter, 5L synthetic oil',
  labor_hours: 2.5,
  completion_checklist: { oil_changed: true, filter_replaced: true },
  work_photos: ['photo1.jpg', 'photo2.jpg'],
  executed_by_id: 1
};

describe('getWorkExecutions', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no work executions exist', async () => {
    const result = await getWorkExecutions();
    expect(result).toEqual([]);
  });

  it('should return all work executions', async () => {
    // Create prerequisite data
    const userResult = await db.insert(usersTable).values(testUser).returning().execute();
    const customerResult = await db.insert(customersTable).values(testCustomer).returning().execute();
    const vehicleResult = await db.insert(vehiclesTable).values(testVehicle).returning().execute();
    const serviceOrderResult = await db.insert(serviceOrdersTable).values(testServiceOrder).returning().execute();
    
    // Create work execution
    await db.insert(workExecutionTable).values({
      ...testWorkExecution,
      labor_hours: testWorkExecution.labor_hours.toString() // Convert to string for insertion
    }).execute();

    const result = await getWorkExecutions();

    expect(result).toHaveLength(1);
    expect(result[0].work_description).toEqual('Replaced engine oil and filter');
    expect(result[0].parts_used).toEqual('Oil filter, 5L synthetic oil');
    expect(result[0].labor_hours).toEqual(2.5);
    expect(typeof result[0].labor_hours).toBe('number');
    expect(result[0].completion_checklist).toEqual({ oil_changed: true, filter_replaced: true });
    expect(result[0].work_photos).toEqual(['photo1.jpg', 'photo2.jpg']);
    expect(result[0].service_order_id).toBeDefined();
    expect(result[0].executed_by_id).toBeDefined();
    expect(result[0].start_date).toBeInstanceOf(Date);
    expect(result[0].created_at).toBeInstanceOf(Date);
  });

  it('should return multiple work executions', async () => {
    // Create prerequisite data
    await db.insert(usersTable).values(testUser).returning().execute();
    await db.insert(customersTable).values(testCustomer).returning().execute();
    await db.insert(vehiclesTable).values(testVehicle).returning().execute();
    await db.insert(serviceOrdersTable).values(testServiceOrder).returning().execute();

    // Create multiple work executions
    const workExecution1 = {
      ...testWorkExecution,
      work_description: 'First work execution',
      labor_hours: '1.5' // String for insertion
    };

    const workExecution2 = {
      ...testWorkExecution,
      work_description: 'Second work execution',
      labor_hours: '3.0' // String for insertion
    };

    await db.insert(workExecutionTable).values([workExecution1, workExecution2]).execute();

    const result = await getWorkExecutions();

    expect(result).toHaveLength(2);
    expect(result[0].work_description).toEqual('First work execution');
    expect(result[0].labor_hours).toEqual(1.5);
    expect(result[1].work_description).toEqual('Second work execution');
    expect(result[1].labor_hours).toEqual(3.0);
    
    // Verify all type conversions
    result.forEach(workExecution => {
      expect(typeof workExecution.labor_hours).toBe('number');
      expect(typeof workExecution.completion_checklist).toBe('object');
      expect(Array.isArray(workExecution.work_photos)).toBe(true);
      expect(workExecution.start_date).toBeInstanceOf(Date);
    });
  });

  it('should handle work execution with completion date', async () => {
    // Create prerequisite data
    await db.insert(usersTable).values(testUser).returning().execute();
    await db.insert(customersTable).values(testCustomer).returning().execute();
    await db.insert(vehiclesTable).values(testVehicle).returning().execute();
    await db.insert(serviceOrdersTable).values(testServiceOrder).returning().execute();

    // Create work execution with completion date
    const today = new Date();
    await db.insert(workExecutionTable).values({
      ...testWorkExecution,
      labor_hours: testWorkExecution.labor_hours.toString(),
      completion_date: today.toISOString().split('T')[0] // Convert to date string
    }).execute();

    const result = await getWorkExecutions();

    expect(result).toHaveLength(1);
    expect(result[0].completion_date).toBeInstanceOf(Date);
    expect(result[0].completion_date?.getDate()).toEqual(today.getDate());
  });
});
