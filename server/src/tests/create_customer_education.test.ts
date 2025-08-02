
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { customersTable, vehiclesTable, serviceOrdersTable, usersTable, customerEducationTable } from '../db/schema';
import { type CreateCustomerEducationInput } from '../schema';
import { createCustomerEducation } from '../handlers/create_customer_education';
import { eq } from 'drizzle-orm';

describe('createCustomerEducation', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create customer education record', async () => {
    // Create prerequisite data
    const user = await db.insert(usersTable)
      .values({
        username: 'admin',
        email: 'admin@test.com',
        password_hash: 'hashed_password',
        full_name: 'Admin User',
        role: 'ADMIN'
      })
      .returning()
      .execute();

    const customer = await db.insert(customersTable)
      .values({
        name: 'John Doe',
        phone: '1234567890'
      })
      .returning()
      .execute();

    const vehicle = await db.insert(vehiclesTable)
      .values({
        customer_id: customer[0].id,
        make: 'Toyota',
        model: 'Corolla',
        year: 2020,
        license_plate: 'ABC123'
      })
      .returning()
      .execute();

    const serviceOrder = await db.insert(serviceOrdersTable)
      .values({
        order_number: 'SO-2024-001',
        customer_id: customer[0].id,
        vehicle_id: vehicle[0].id,
        service_types: ['GENERAL_SERVICE'],
        complaints: 'Engine making noise',
        created_by_id: user[0].id
      })
      .returning()
      .execute();

    const testInput: CreateCustomerEducationInput = {
      service_order_id: serviceOrder[0].id,
      explanation_provided: 'Explained the brake issue to customer',
      customer_questions: 'How long will the repair take?',
      understanding_level: 'UNDERSTOOD',
      additional_notes: 'Customer seems satisfied with explanation',
      educated_by_id: user[0].id
    };

    const result = await createCustomerEducation(testInput);

    // Basic field validation
    expect(result.service_order_id).toEqual(serviceOrder[0].id);
    expect(result.explanation_provided).toEqual('Explained the brake issue to customer');
    expect(result.customer_questions).toEqual('How long will the repair take?');
    expect(result.understanding_level).toEqual('UNDERSTOOD');
    expect(result.additional_notes).toEqual('Customer seems satisfied with explanation');
    expect(result.educated_by_id).toEqual(user[0].id);
    expect(result.id).toBeDefined();
    expect(result.education_date).toBeInstanceOf(Date);
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save customer education to database', async () => {
    // Create prerequisite data
    const user = await db.insert(usersTable)
      .values({
        username: 'admin',
        email: 'admin@test.com',
        password_hash: 'hashed_password',
        full_name: 'Admin User',
        role: 'ADMIN'
      })
      .returning()
      .execute();

    const customer = await db.insert(customersTable)
      .values({
        name: 'John Doe',
        phone: '1234567890'
      })
      .returning()
      .execute();

    const vehicle = await db.insert(vehiclesTable)
      .values({
        customer_id: customer[0].id,
        make: 'Toyota',
        model: 'Corolla',
        year: 2020,
        license_plate: 'ABC123'
      })
      .returning()
      .execute();

    const serviceOrder = await db.insert(serviceOrdersTable)
      .values({
        order_number: 'SO-2024-001',
        customer_id: customer[0].id,
        vehicle_id: vehicle[0].id,
        service_types: ['GENERAL_SERVICE'],
        complaints: 'Engine making noise',
        created_by_id: user[0].id
      })
      .returning()
      .execute();

    const testInput: CreateCustomerEducationInput = {
      service_order_id: serviceOrder[0].id,
      explanation_provided: 'Explained the brake issue to customer',
      understanding_level: 'UNDERSTOOD',
      educated_by_id: user[0].id
    };

    const result = await createCustomerEducation(testInput);

    // Verify record exists in database
    const savedEducation = await db.select()
      .from(customerEducationTable)
      .where(eq(customerEducationTable.id, result.id))
      .execute();

    expect(savedEducation).toHaveLength(1);
    expect(savedEducation[0].service_order_id).toEqual(serviceOrder[0].id);
    expect(savedEducation[0].explanation_provided).toEqual('Explained the brake issue to customer');
    expect(savedEducation[0].understanding_level).toEqual('UNDERSTOOD');
    expect(savedEducation[0].educated_by_id).toEqual(user[0].id);
    // Date fields come back as strings from direct DB queries, so we check the string format
    expect(typeof savedEducation[0].education_date).toBe('string');
    expect(savedEducation[0].education_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(savedEducation[0].created_at).toBeInstanceOf(Date);
  });

  it('should handle optional fields correctly', async () => {
    // Create prerequisite data
    const user = await db.insert(usersTable)
      .values({
        username: 'admin',
        email: 'admin@test.com',
        password_hash: 'hashed_password',
        full_name: 'Admin User',
        role: 'ADMIN'
      })
      .returning()
      .execute();

    const customer = await db.insert(customersTable)
      .values({
        name: 'John Doe',
        phone: '1234567890'
      })
      .returning()
      .execute();

    const vehicle = await db.insert(vehiclesTable)
      .values({
        customer_id: customer[0].id,
        make: 'Toyota',
        model: 'Corolla',
        year: 2020,
        license_plate: 'ABC123'
      })
      .returning()
      .execute();

    const serviceOrder = await db.insert(serviceOrdersTable)
      .values({
        order_number: 'SO-2024-001',
        customer_id: customer[0].id,
        vehicle_id: vehicle[0].id,
        service_types: ['GENERAL_SERVICE'],
        complaints: 'Engine making noise',
        created_by_id: user[0].id
      })
      .returning()
      .execute();

    const testInput: CreateCustomerEducationInput = {
      service_order_id: serviceOrder[0].id,
      explanation_provided: 'Basic explanation provided',
      understanding_level: 'NEEDS_CLARIFICATION',
      educated_by_id: user[0].id
    };

    const result = await createCustomerEducation(testInput);

    expect(result.customer_questions).toBeNull();
    expect(result.additional_notes).toBeNull();
    expect(result.explanation_provided).toEqual('Basic explanation provided');
    expect(result.understanding_level).toEqual('NEEDS_CLARIFICATION');
  });

  it('should throw error for non-existent service order', async () => {
    const testInput: CreateCustomerEducationInput = {
      service_order_id: 999999,
      explanation_provided: 'Test explanation',
      understanding_level: 'UNDERSTOOD',
      educated_by_id: 1
    };

    await expect(createCustomerEducation(testInput))
      .rejects.toThrow(/service order.*not found/i);
  });
});
