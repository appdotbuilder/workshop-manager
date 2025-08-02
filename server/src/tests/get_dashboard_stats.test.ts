
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, customersTable, vehiclesTable, serviceOrdersTable, paymentsTable } from '../db/schema';
import { getDashboardStats } from '../handlers/get_dashboard_stats';

describe('getDashboardStats', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return zero stats for empty database', async () => {
    const result = await getDashboardStats();

    expect(result.total_orders).toEqual(0);
    expect(result.orders_in_progress).toEqual(0);
    expect(result.completed_orders).toEqual(0);
    expect(result.pending_payments).toEqual(0);
    expect(result.total_revenue).toEqual(0);
    expect(result.avg_completion_time).toEqual(0);
  });

  it('should calculate stats correctly with sample data', async () => {
    // Create prerequisite data
    const userResult = await db.insert(usersTable).values({
      username: 'testuser',
      email: 'test@example.com',
      password_hash: 'hashedpassword',
      full_name: 'Test User',
      role: 'ADMIN'
    }).returning().execute();

    const customerResult = await db.insert(customersTable).values({
      name: 'John Doe',
      phone: '1234567890',
      email: 'john@example.com'
    }).returning().execute();

    const vehicleResult = await db.insert(vehiclesTable).values({
      customer_id: customerResult[0].id,
      make: 'Toyota',
      model: 'Camry',
      year: 2020,
      license_plate: 'ABC123'
    }).returning().execute();

    // Create service orders with different statuses
    const serviceOrders = await db.insert(serviceOrdersTable).values([
      {
        order_number: 'SO-001',
        customer_id: customerResult[0].id,
        vehicle_id: vehicleResult[0].id,
        service_types: ['GENERAL_SERVICE'],
        complaints: 'Test complaint 1',
        created_by_id: userResult[0].id,
        status: 'COMPLETED'
      },
      {
        order_number: 'SO-002',
        customer_id: customerResult[0].id,
        vehicle_id: vehicleResult[0].id,
        service_types: ['BRAKE_SERVICE'],
        complaints: 'Test complaint 2',
        created_by_id: userResult[0].id,
        status: 'WORK_IN_PROGRESS'
      },
      {
        order_number: 'SO-003',
        customer_id: customerResult[0].id,
        vehicle_id: vehicleResult[0].id,
        service_types: ['ENGINE_SERVICE'],
        complaints: 'Test complaint 3',
        created_by_id: userResult[0].id,
        status: 'CANCELLED'
      }
    ]).returning().execute();

    // Create payments with different statuses
    await db.insert(paymentsTable).values([
      {
        service_order_id: serviceOrders[0].id,
        amount: '150.00',
        payment_method: 'CASH',
        payment_status: 'PAID',
        created_by_id: userResult[0].id
      },
      {
        service_order_id: serviceOrders[1].id,
        amount: '200.00',
        payment_method: 'CARD',
        payment_status: 'PENDING',
        created_by_id: userResult[0].id
      },
      {
        service_order_id: serviceOrders[0].id,
        amount: '75.50',
        payment_method: 'CASH',
        payment_status: 'PAID',
        created_by_id: userResult[0].id
      }
    ]).execute();

    const result = await getDashboardStats();

    // Verify counts
    expect(result.total_orders).toEqual(3);
    expect(result.orders_in_progress).toEqual(1); // Only WORK_IN_PROGRESS (not COMPLETED or CANCELLED)
    expect(result.completed_orders).toEqual(1);
    expect(result.pending_payments).toEqual(1);
    
    // Verify revenue calculation (150.00 + 75.50 = 225.50)
    expect(result.total_revenue).toEqual(225.5);
    
    // Verify avg_completion_time is a number (exact value depends on timing)
    expect(typeof result.avg_completion_time).toEqual('number');
    expect(result.avg_completion_time).toBeGreaterThanOrEqual(0);
  });

  it('should handle numeric conversions correctly', async () => {
    // Create prerequisite data
    const userResult = await db.insert(usersTable).values({
      username: 'testuser2',
      email: 'test2@example.com',
      password_hash: 'hashedpassword',
      full_name: 'Test User 2',
      role: 'ADMIN'
    }).returning().execute();

    const customerResult = await db.insert(customersTable).values({
      name: 'Jane Doe',
      phone: '0987654321',
      email: 'jane@example.com'
    }).returning().execute();

    const vehicleResult = await db.insert(vehiclesTable).values({
      customer_id: customerResult[0].id,
      make: 'Honda',
      model: 'Civic',
      year: 2019,
      license_plate: 'XYZ789'
    }).returning().execute();

    const serviceOrderResult = await db.insert(serviceOrdersTable).values({
      order_number: 'SO-100',
      customer_id: customerResult[0].id,
      vehicle_id: vehicleResult[0].id,
      service_types: ['AC_SERVICE'],
      complaints: 'AC not working',
      created_by_id: userResult[0].id,
      status: 'COMPLETED'
    }).returning().execute();

    // Create payment with decimal amount
    await db.insert(paymentsTable).values({
      service_order_id: serviceOrderResult[0].id,
      amount: '99.99',
      payment_method: 'CARD',
      payment_status: 'PAID',
      created_by_id: userResult[0].id
    }).execute();

    const result = await getDashboardStats();

    // Verify all returned values are proper numbers
    expect(typeof result.total_orders).toEqual('number');
    expect(typeof result.orders_in_progress).toEqual('number');
    expect(typeof result.completed_orders).toEqual('number');
    expect(typeof result.pending_payments).toEqual('number');
    expect(typeof result.total_revenue).toEqual('number');
    expect(typeof result.avg_completion_time).toEqual('number');
    
    // Verify decimal handling
    expect(result.total_revenue).toEqual(99.99);
  });
});
