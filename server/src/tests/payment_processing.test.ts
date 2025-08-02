
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { paymentsTable, customersTable, vehiclesTable, serviceOrdersTable, usersTable } from '../db/schema';
import { type CreatePaymentInput } from '../schema';
import { createPayment, getPaymentsByServiceOrder, updatePaymentStatus } from '../handlers/payment_processing';
import { eq } from 'drizzle-orm';

describe('Payment Processing', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testCustomerId: number;
  let testVehicleId: number;
  let testServiceOrderId: number;
  let testUserId: number;

  beforeEach(async () => {
    // Create test user
    const user = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashed_password',
        full_name: 'Test User',
        role: 'ADMIN'
      })
      .returning()
      .execute();
    testUserId = user[0].id;

    // Create test customer
    const customer = await db.insert(customersTable)
      .values({
        name: 'Test Customer',
        phone: '1234567890',
        email: 'customer@example.com'
      })
      .returning()
      .execute();
    testCustomerId = customer[0].id;

    // Create test vehicle
    const vehicle = await db.insert(vehiclesTable)
      .values({
        customer_id: testCustomerId,
        make: 'Toyota',
        model: 'Camry',
        year: 2020,
        license_plate: 'ABC123'
      })
      .returning()
      .execute();
    testVehicleId = vehicle[0].id;

    // Create test service order
    const serviceOrder = await db.insert(serviceOrdersTable)
      .values({
        order_number: 'SO-2024-001',
        customer_id: testCustomerId,
        vehicle_id: testVehicleId,
        service_types: JSON.stringify(['GENERAL_SERVICE']),
        complaints: 'Test complaint',
        created_by_id: testUserId
      })
      .returning()
      .execute();
    testServiceOrderId = serviceOrder[0].id;
  });

  describe('createPayment', () => {
    it('should create a payment', async () => {
      const testInput: CreatePaymentInput = {
        service_order_id: testServiceOrderId,
        amount: 250.50,
        payment_method: 'CASH',
        created_by_id: testUserId
      };

      const result = await createPayment(testInput);

      expect(result.service_order_id).toEqual(testServiceOrderId);
      expect(result.amount).toEqual(250.50);
      expect(typeof result.amount).toBe('number');
      expect(result.payment_method).toEqual('CASH');
      expect(result.payment_status).toEqual('PENDING');
      expect(result.created_by_id).toEqual(testUserId);
      expect(result.id).toBeDefined();
      expect(result.created_at).toBeInstanceOf(Date);
    });

    it('should save payment to database', async () => {
      const testInput: CreatePaymentInput = {
        service_order_id: testServiceOrderId,
        amount: 150.75,
        payment_method: 'CREDIT_CARD',
        transaction_id: 'TXN123456',
        created_by_id: testUserId
      };

      const result = await createPayment(testInput);

      const payments = await db.select()
        .from(paymentsTable)
        .where(eq(paymentsTable.id, result.id))
        .execute();

      expect(payments).toHaveLength(1);
      expect(payments[0].service_order_id).toEqual(testServiceOrderId);
      expect(parseFloat(payments[0].amount)).toEqual(150.75);
      expect(payments[0].payment_method).toEqual('CREDIT_CARD');
      expect(payments[0].transaction_id).toEqual('TXN123456');
      expect(payments[0].created_at).toBeInstanceOf(Date);
    });

    it('should handle payment without transaction_id', async () => {
      const testInput: CreatePaymentInput = {
        service_order_id: testServiceOrderId,
        amount: 100.00,
        payment_method: 'CASH',
        created_by_id: testUserId
      };

      const result = await createPayment(testInput);

      expect(result.transaction_id).toBeNull();
      expect(result.amount).toEqual(100.00);
    });
  });

  describe('getPaymentsByServiceOrder', () => {
    it('should fetch payments for a service order', async () => {
      // Create multiple payments for the same service order
      await createPayment({
        service_order_id: testServiceOrderId,
        amount: 100.00,
        payment_method: 'CASH',
        created_by_id: testUserId
      });

      await createPayment({
        service_order_id: testServiceOrderId,
        amount: 50.00,
        payment_method: 'CREDIT_CARD',
        created_by_id: testUserId
      });

      const results = await getPaymentsByServiceOrder(testServiceOrderId);

      expect(results).toHaveLength(2);
      results.forEach(payment => {
        expect(payment.service_order_id).toEqual(testServiceOrderId);
        expect(typeof payment.amount).toBe('number');
        expect(payment.created_at).toBeInstanceOf(Date);
      });
    });

    it('should return empty array for service order with no payments', async () => {
      const results = await getPaymentsByServiceOrder(testServiceOrderId);
      expect(results).toHaveLength(0);
    });
  });

  describe('updatePaymentStatus', () => {
    it('should update payment status', async () => {
      const payment = await createPayment({
        service_order_id: testServiceOrderId,
        amount: 200.00,
        payment_method: 'BANK_TRANSFER',
        created_by_id: testUserId
      });

      const paymentDate = new Date();
      const result = await updatePaymentStatus(payment.id, 'PAID', paymentDate);

      expect(result.payment_status).toEqual('PAID');
      expect(result.payment_date).toEqual(paymentDate);
      expect(result.amount).toEqual(200.00);
      expect(typeof result.amount).toBe('number');
    });

    it('should update payment status without payment date', async () => {
      const payment = await createPayment({
        service_order_id: testServiceOrderId,
        amount: 75.25,
        payment_method: 'CASH',
        created_by_id: testUserId
      });

      const result = await updatePaymentStatus(payment.id, 'CANCELLED');

      expect(result.payment_status).toEqual('CANCELLED');
      expect(result.payment_date).toBeNull();
    });

    it('should throw error for non-existent payment', async () => {
      expect(updatePaymentStatus(999, 'PAID')).rejects.toThrow(/not found/i);
    });
  });
});
