
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, customersTable, vehiclesTable, serviceOrdersTable, customerEducationTable } from '../db/schema';
import { type CreateCustomerEducationInput } from '../schema';
import { createCustomerEducation, getCustomerEducationByServiceOrder } from '../handlers/customer_education';
import { eq } from 'drizzle-orm';

// Test data setup
let testUserId: number;
let testCustomerId: number;
let testVehicleId: number;
let testServiceOrderId: number;

describe('Customer Education', () => {
  beforeEach(async () => {
    await createDB();

    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        username: 'educator',
        email: 'educator@test.com',
        password_hash: 'hashedpassword',
        full_name: 'Test Educator',
        role: 'MECHANIC'
      })
      .returning()
      .execute();
    testUserId = userResult[0].id;

    // Create test customer
    const customerResult = await db.insert(customersTable)
      .values({
        name: 'Test Customer',
        phone: '+1234567890',
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
        service_types: ['BRAKE_SERVICE'],
        complaints: 'Brake noise and vibration',
        created_by_id: testUserId
      })
      .returning()
      .execute();
    testServiceOrderId = serviceOrderResult[0].id;
  });

  afterEach(resetDB);

  it('should create customer education record with all fields', async () => {
    const testEducationInput: CreateCustomerEducationInput = {
      service_order_id: testServiceOrderId,
      explanation_provided: 'Detailed explanation of brake system issues and repair requirements',
      customer_questions: 'Customer asked about warranty and maintenance schedule',
      understanding_level: 'UNDERSTOOD',
      additional_notes: 'Customer showed understanding and agreed to proceed',
      educated_by_id: testUserId
    };

    const result = await createCustomerEducation(testEducationInput);

    expect(result.service_order_id).toEqual(testServiceOrderId);
    expect(result.explanation_provided).toEqual(testEducationInput.explanation_provided);
    expect(result.customer_questions).toEqual('Customer asked about warranty and maintenance schedule');
    expect(result.understanding_level).toEqual('UNDERSTOOD');
    expect(result.additional_notes).toEqual('Customer showed understanding and agreed to proceed');
    expect(result.educated_by_id).toEqual(testUserId);
    expect(result.id).toBeDefined();
    expect(result.education_date).toBeInstanceOf(Date);
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save customer education to database', async () => {
    const testEducationInput: CreateCustomerEducationInput = {
      service_order_id: testServiceOrderId,
      explanation_provided: 'Detailed explanation of brake system issues and repair requirements',
      understanding_level: 'UNDERSTOOD',
      educated_by_id: testUserId
    };

    const result = await createCustomerEducation(testEducationInput);

    const savedRecord = await db.select()
      .from(customerEducationTable)
      .where(eq(customerEducationTable.id, result.id))
      .execute();

    expect(savedRecord).toHaveLength(1);
    expect(savedRecord[0].service_order_id).toEqual(testServiceOrderId);
    expect(savedRecord[0].explanation_provided).toEqual(testEducationInput.explanation_provided);
    expect(savedRecord[0].understanding_level).toEqual('UNDERSTOOD');
    expect(savedRecord[0].educated_by_id).toEqual(testUserId);
  });

  it('should handle optional fields correctly', async () => {
    const minimalInput: CreateCustomerEducationInput = {
      service_order_id: testServiceOrderId,
      explanation_provided: 'Basic explanation provided',
      understanding_level: 'NEEDS_CLARIFICATION',
      educated_by_id: testUserId
    };

    const result = await createCustomerEducation(minimalInput);

    expect(result.customer_questions).toBeNull();
    expect(result.additional_notes).toBeNull();
    expect(result.understanding_level).toEqual('NEEDS_CLARIFICATION');
    expect(result.explanation_provided).toEqual('Basic explanation provided');
  });

  it('should retrieve customer education by service order', async () => {
    const testEducationInput: CreateCustomerEducationInput = {
      service_order_id: testServiceOrderId,
      explanation_provided: 'Detailed explanation of brake system issues and repair requirements',
      understanding_level: 'UNDERSTOOD',
      educated_by_id: testUserId
    };

    await createCustomerEducation(testEducationInput);

    const result = await getCustomerEducationByServiceOrder(testServiceOrderId);

    expect(result).toBeDefined();
    expect(result!.service_order_id).toEqual(testServiceOrderId);
    expect(result!.explanation_provided).toEqual(testEducationInput.explanation_provided);
    expect(result!.understanding_level).toEqual('UNDERSTOOD');
  });

  it('should return null when no education record exists', async () => {
    const result = await getCustomerEducationByServiceOrder(99999);

    expect(result).toBeNull();
  });

  it('should throw error for non-existent service order', async () => {
    const invalidInput: CreateCustomerEducationInput = {
      service_order_id: 99999,
      explanation_provided: 'Test explanation',
      understanding_level: 'UNDERSTOOD',
      educated_by_id: testUserId
    };

    expect(createCustomerEducation(invalidInput)).rejects.toThrow(/Service order not found/i);
  });

  it('should handle different understanding levels', async () => {
    const testCases = [
      'UNDERSTOOD',
      'NEEDS_CLARIFICATION', 
      'REFUSED_SERVICE',
      'PARTIAL_UNDERSTANDING'
    ] as const;

    for (const level of testCases) {
      const input: CreateCustomerEducationInput = {
        service_order_id: testServiceOrderId,
        explanation_provided: `Explanation for ${level} case`,
        understanding_level: level,
        educated_by_id: testUserId
      };

      const result = await createCustomerEducation(input);
      expect(result.understanding_level).toEqual(level);
    }
  });
});
