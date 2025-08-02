
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { paymentsTable, serviceOrdersTable, customersTable, vehiclesTable, usersTable } from '../db/schema';
import { getPayments } from '../handlers/get_payments';

describe('getPayments', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no payments exist', async () => {
    const result = await getPayments();
    expect(result).toEqual([]);
  });

  it('should fetch all payments from database', async () => {
    // Create prerequisite data
    const user = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        full_name: 'Test User',
        role: 'ADMIN'
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
        license_plate: 'ABC-123'
      })
      .returning()
      .execute();

    const serviceOrder = await db.insert(serviceOrdersTable)
      .values({
        order_number: 'SO-2024-001',
        customer_id: customer[0].id,
        vehicle_id: vehicle[0].id,
        service_types: ['GENERAL_SERVICE'],
        complaints: 'Test complaint',
        created_by_id: user[0].id
      })
      .returning()
      .execute();

    // Create test payments
    await db.insert(paymentsTable)
      .values([
        {
          service_order_id: serviceOrder[0].id,
          amount: '150.00',
          payment_method: 'CASH',
          created_by_id: user[0].id
        },
        {
          service_order_id: serviceOrder[0].id,
          amount: '275.50',
          payment_method: 'CARD',
          created_by_id: user[0].id
        }
      ])
      .execute();

    const result = await getPayments();

    expect(result).toHaveLength(2);
    
    // Verify first payment
    expect(result[0].service_order_id).toEqual(serviceOrder[0].id);
    expect(result[0].amount).toEqual(150.00);
    expect(typeof result[0].amount).toBe('number');
    expect(result[0].payment_method).toEqual('CASH');
    expect(result[0].payment_status).toEqual('PENDING');
    expect(result[0].created_by_id).toEqual(user[0].id);
    expect(result[0].id).toBeDefined();
    expect(result[0].created_at).toBeInstanceOf(Date);

    // Verify second payment
    expect(result[1].service_order_id).toEqual(serviceOrder[0].id);
    expect(result[1].amount).toEqual(275.50);
    expect(typeof result[1].amount).toBe('number');
    expect(result[1].payment_method).toEqual('CARD');
    expect(result[1].payment_status).toEqual('PENDING');
    expect(result[1].created_by_id).toEqual(user[0].id);
    expect(result[1].id).toBeDefined();
    expect(result[1].created_at).toBeInstanceOf(Date);
  });

  it('should handle payments with different statuses', async () => {
    // Create prerequisite data
    const user = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        full_name: 'Test User',
        role: 'ADMIN'
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
        license_plate: 'XYZ-789'
      })
      .returning()
      .execute();

    const serviceOrder = await db.insert(serviceOrdersTable)
      .values({
        order_number: 'SO-2024-002',
        customer_id: customer[0].id,
        vehicle_id: vehicle[0].id,
        service_types: ['BRAKE_SERVICE'],
        complaints: 'Brake issues',
        created_by_id: user[0].id
      })
      .returning()
      .execute();

    // Create payment with specific status
    await db.insert(paymentsTable)
      .values({
        service_order_id: serviceOrder[0].id,
        amount: '89.99',
        payment_method: 'BANK_TRANSFER',
        payment_status: 'PAID',
        transaction_id: 'TXN-12345',
        created_by_id: user[0].id
      })
      .execute();

    const result = await getPayments();

    expect(result).toHaveLength(1);
    expect(result[0].payment_status).toEqual('PAID');
    expect(result[0].transaction_id).toEqual('TXN-12345');
    expect(result[0].amount).toEqual(89.99);
    expect(typeof result[0].amount).toBe('number');
  });
});
