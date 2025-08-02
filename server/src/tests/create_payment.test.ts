
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { paymentsTable, serviceOrdersTable, customersTable, vehiclesTable, usersTable } from '../db/schema';
import { type CreatePaymentInput } from '../schema';
import { createPayment } from '../handlers/create_payment';
import { eq } from 'drizzle-orm';

describe('createPayment', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a payment', async () => {
    // Create prerequisite data
    const customer = await db.insert(customersTable)
      .values({
        name: 'Test Customer',
        phone: '+1234567890',
        email: 'test@example.com'
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

    const user = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'user@example.com',
        password_hash: 'hashedpassword',
        full_name: 'Test User',
        role: 'ADMIN'
      })
      .returning()
      .execute();

    const serviceOrder = await db.insert(serviceOrdersTable)
      .values({
        order_number: 'SO-001',
        customer_id: customer[0].id,
        vehicle_id: vehicle[0].id,
        service_types: ['GENERAL_SERVICE'],
        complaints: 'Engine noise',
        created_by_id: user[0].id
      })
      .returning()
      .execute();

    const testInput: CreatePaymentInput = {
      service_order_id: serviceOrder[0].id,
      amount: 299.99,
      payment_method: 'CASH',
      transaction_id: 'TXN123456',
      created_by_id: user[0].id
    };

    const result = await createPayment(testInput);

    // Basic field validation
    expect(result.service_order_id).toEqual(serviceOrder[0].id);
    expect(result.amount).toEqual(299.99);
    expect(typeof result.amount).toBe('number');
    expect(result.payment_method).toEqual('CASH');
    expect(result.payment_status).toEqual('PENDING');
    expect(result.transaction_id).toEqual('TXN123456');
    expect(result.created_by_id).toEqual(user[0].id);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.payment_date).toBeNull();
  });

  it('should save payment to database', async () => {
    // Create prerequisite data
    const customer = await db.insert(customersTable)
      .values({
        name: 'Test Customer',
        phone: '+1234567891',
        email: 'test2@example.com'
      })
      .returning()
      .execute();

    const vehicle = await db.insert(vehiclesTable)
      .values({
        customer_id: customer[0].id,
        make: 'Honda',
        model: 'Civic',
        year: 2021,
        license_plate: 'XYZ789'
      })
      .returning()
      .execute();

    const user = await db.insert(usersTable)
      .values({
        username: 'testuser2',
        email: 'user2@example.com',
        password_hash: 'hashedpassword',
        full_name: 'Test User 2',
        role: 'KABENG'
      })
      .returning()
      .execute();

    const serviceOrder = await db.insert(serviceOrdersTable)
      .values({
        order_number: 'SO-002',
        customer_id: customer[0].id,
        vehicle_id: vehicle[0].id,
        service_types: ['BRAKE_SERVICE'],
        complaints: 'Brake squeaking',
        created_by_id: user[0].id
      })
      .returning()
      .execute();

    const testInput: CreatePaymentInput = {
      service_order_id: serviceOrder[0].id,
      amount: 150.50,
      payment_method: 'CARD',
      created_by_id: user[0].id
    };

    const result = await createPayment(testInput);

    // Query database to verify payment was saved
    const payments = await db.select()
      .from(paymentsTable)
      .where(eq(paymentsTable.id, result.id))
      .execute();

    expect(payments).toHaveLength(1);
    expect(payments[0].service_order_id).toEqual(serviceOrder[0].id);
    expect(parseFloat(payments[0].amount)).toEqual(150.50);
    expect(payments[0].payment_method).toEqual('CARD');
    expect(payments[0].payment_status).toEqual('PENDING');
    expect(payments[0].transaction_id).toBeNull();
    expect(payments[0].created_by_id).toEqual(user[0].id);
    expect(payments[0].created_at).toBeInstanceOf(Date);
  });

  it('should throw error for non-existent service order', async () => {
    const user = await db.insert(usersTable)
      .values({
        username: 'testuser3',
        email: 'user3@example.com',
        password_hash: 'hashedpassword',
        full_name: 'Test User 3',
        role: 'MECHANIC'
      })
      .returning()
      .execute();

    const testInput: CreatePaymentInput = {
      service_order_id: 99999, // Non-existent service order ID
      amount: 100.00,
      payment_method: 'CASH',
      created_by_id: user[0].id
    };

    await expect(createPayment(testInput)).rejects.toThrow(/service order.*not found/i);
  });

  it('should handle payment without transaction_id', async () => {
    // Create prerequisite data
    const customer = await db.insert(customersTable)
      .values({
        name: 'Test Customer 3',
        phone: '+1234567892',
        email: 'test3@example.com'
      })
      .returning()
      .execute();

    const vehicle = await db.insert(vehiclesTable)
      .values({
        customer_id: customer[0].id,
        make: 'Ford',
        model: 'Focus',
        year: 2019,
        license_plate: 'DEF456'
      })
      .returning()
      .execute();

    const user = await db.insert(usersTable)
      .values({
        username: 'testuser4',
        email: 'user4@example.com',
        password_hash: 'hashedpassword',
        full_name: 'Test User 4',
        role: 'PLANNER'
      })
      .returning()
      .execute();

    const serviceOrder = await db.insert(serviceOrdersTable)
      .values({
        order_number: 'SO-003',
        customer_id: customer[0].id,
        vehicle_id: vehicle[0].id,
        service_types: ['ENGINE_SERVICE'],
        complaints: 'Engine overheating',
        created_by_id: user[0].id
      })
      .returning()
      .execute();

    const testInput: CreatePaymentInput = {
      service_order_id: serviceOrder[0].id,
      amount: 450.00,
      payment_method: 'BANK_TRANSFER',
      created_by_id: user[0].id
    };

    const result = await createPayment(testInput);

    expect(result.transaction_id).toBeNull();
    expect(result.amount).toEqual(450.00);
    expect(result.payment_method).toEqual('BANK_TRANSFER');
  });
});
