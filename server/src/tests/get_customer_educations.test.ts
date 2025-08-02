
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { customersTable, vehiclesTable, serviceOrdersTable, customerEducationTable, usersTable } from '../db/schema';
import { getCustomerEducations } from '../handlers/get_customer_educations';
import { type CreateCustomerEducationInput } from '../schema';

describe('getCustomerEducations', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no customer educations exist', async () => {
    const result = await getCustomerEducations();
    expect(result).toEqual([]);
  });

  it('should fetch all customer education records', async () => {
    // Create prerequisite data
    const user = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        full_name: 'Test User',
        role: 'MECHANIC'
      })
      .returning()
      .execute();

    const customer = await db.insert(customersTable)
      .values({
        name: 'Test Customer',
        phone: '1234567890',
        email: 'customer@example.com'
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
        order_number: 'SO001',
        customer_id: customer[0].id,
        vehicle_id: vehicle[0].id,
        service_types: ['GENERAL_SERVICE'],
        complaints: 'Test complaint',
        created_by_id: user[0].id
      })
      .returning()
      .execute();

    // Create test customer education records
    const educationInput1: CreateCustomerEducationInput = {
      service_order_id: serviceOrder[0].id,
      explanation_provided: 'Explained the brake issue and repair process',
      customer_questions: 'How long will the repair take?',
      understanding_level: 'UNDERSTOOD',
      additional_notes: 'Customer was satisfied with explanation',
      educated_by_id: user[0].id
    };

    const educationInput2: CreateCustomerEducationInput = {
      service_order_id: serviceOrder[0].id,
      explanation_provided: 'Explained engine maintenance requirements',
      understanding_level: 'NEEDS_CLARIFICATION',
      educated_by_id: user[0].id
    };

    await db.insert(customerEducationTable)
      .values([
        {
          ...educationInput1,
          customer_questions: educationInput1.customer_questions || null,
          additional_notes: educationInput1.additional_notes || null
        },
        {
          ...educationInput2,
          customer_questions: educationInput2.customer_questions || null,
          additional_notes: educationInput2.additional_notes || null
        }
      ])
      .execute();

    const result = await getCustomerEducations();

    expect(result).toHaveLength(2);
    
    // Check first education record
    const education1 = result.find(e => e.explanation_provided === 'Explained the brake issue and repair process');
    expect(education1).toBeDefined();
    expect(education1!.service_order_id).toEqual(serviceOrder[0].id);
    expect(education1!.customer_questions).toEqual('How long will the repair take?');
    expect(education1!.understanding_level).toEqual('UNDERSTOOD');
    expect(education1!.additional_notes).toEqual('Customer was satisfied with explanation');
    expect(education1!.educated_by_id).toEqual(user[0].id);
    expect(education1!.education_date).toBeInstanceOf(Date);
    expect(education1!.created_at).toBeInstanceOf(Date);

    // Check second education record
    const education2 = result.find(e => e.explanation_provided === 'Explained engine maintenance requirements');
    expect(education2).toBeDefined();
    expect(education2!.service_order_id).toEqual(serviceOrder[0].id);
    expect(education2!.customer_questions).toBeNull();
    expect(education2!.understanding_level).toEqual('NEEDS_CLARIFICATION');
    expect(education2!.additional_notes).toBeNull();
    expect(education2!.educated_by_id).toEqual(user[0].id);
    expect(education2!.education_date).toBeInstanceOf(Date);
    expect(education2!.created_at).toBeInstanceOf(Date);
  });

  it('should handle date fields correctly', async () => {
    // Create prerequisite data
    const user = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        full_name: 'Test User',
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
        make: 'Honda',
        model: 'Civic',
        year: 2019,
        license_plate: 'XYZ789'
      })
      .returning()
      .execute();

    const serviceOrder = await db.insert(serviceOrdersTable)
      .values({
        order_number: 'SO002',
        customer_id: customer[0].id,
        vehicle_id: vehicle[0].id,
        service_types: ['ENGINE_SERVICE'],
        complaints: 'Engine noise',
        created_by_id: user[0].id
      })
      .returning()
      .execute();

    await db.insert(customerEducationTable)
      .values({
        service_order_id: serviceOrder[0].id,
        explanation_provided: 'Test explanation',
        understanding_level: 'UNDERSTOOD',
        educated_by_id: user[0].id
      })
      .execute();

    const result = await getCustomerEducations();

    expect(result).toHaveLength(1);
    expect(result[0].education_date).toBeInstanceOf(Date);
    expect(result[0].created_at).toBeInstanceOf(Date);
    
    // Verify dates are valid
    expect(result[0].education_date.getTime()).toBeGreaterThan(0);
    expect(result[0].created_at.getTime()).toBeGreaterThan(0);
  });
});
