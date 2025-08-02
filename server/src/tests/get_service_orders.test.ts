
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, customersTable, vehiclesTable, serviceOrdersTable } from '../db/schema';
import { getServiceOrders } from '../handlers/get_service_orders';

describe('getServiceOrders', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no service orders exist', async () => {
    const result = await getServiceOrders();
    expect(result).toEqual([]);
  });

  it('should fetch all service orders', async () => {
    // Create prerequisite data
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        full_name: 'Test User',
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
        license_plate: 'ABC123'
      })
      .returning()
      .execute();

    // Create test service orders
    await db.insert(serviceOrdersTable)
      .values([
        {
          order_number: 'SO-001',
          customer_id: customerResult[0].id,
          vehicle_id: vehicleResult[0].id,
          service_types: JSON.stringify(['GENERAL_SERVICE']),
          complaints: 'Engine noise',
          created_by_id: userResult[0].id
        },
        {
          order_number: 'SO-002',
          customer_id: customerResult[0].id,
          vehicle_id: vehicleResult[0].id,
          service_types: JSON.stringify(['BRAKE_SERVICE', 'TIRE_SERVICE']),
          complaints: 'Brake issues',
          referral_source: 'Friend',
          body_defects: 'Minor scratches',
          created_by_id: userResult[0].id
        }
      ])
      .execute();

    const result = await getServiceOrders();

    expect(result).toHaveLength(2);

    // Verify first order
    const order1 = result.find(o => o.order_number === 'SO-001');
    expect(order1).toBeDefined();
    expect(order1!.customer_id).toEqual(customerResult[0].id);
    expect(order1!.vehicle_id).toEqual(vehicleResult[0].id);
    expect(order1!.service_types).toEqual(['GENERAL_SERVICE']);
    expect(order1!.complaints).toEqual('Engine noise');
    expect(order1!.status).toEqual('PENDING_INITIAL_CHECK');
    expect(order1!.created_by_id).toEqual(userResult[0].id);
    expect(order1!.created_at).toBeInstanceOf(Date);

    // Verify second order
    const order2 = result.find(o => o.order_number === 'SO-002');
    expect(order2).toBeDefined();
    expect(order2!.service_types).toEqual(['BRAKE_SERVICE', 'TIRE_SERVICE']);
    expect(order2!.complaints).toEqual('Brake issues');
    expect(order2!.referral_source).toEqual('Friend');
    expect(order2!.body_defects).toEqual('Minor scratches');
    expect(order2!.other_defects).toBeNull();
    expect(order2!.assigned_mechanic_id).toBeNull();
  });

  it('should handle service orders with all optional fields', async () => {
    // Create prerequisite data
    const userResult = await db.insert(usersTable)
      .values({
        username: 'mechanic1',
        email: 'mechanic@example.com',
        password_hash: 'hashedpassword',
        full_name: 'Mechanic User',
        role: 'MECHANIC'
      })
      .returning()
      .execute();

    const adminResult = await db.insert(usersTable)
      .values({
        username: 'admin1',
        email: 'admin@example.com',
        password_hash: 'hashedpassword',
        full_name: 'Admin User',
        role: 'ADMIN'
      })
      .returning()
      .execute();

    const customerResult = await db.insert(customersTable)
      .values({
        name: 'Full Customer',
        phone: '9876543210',
        email: 'customer@example.com',
        address: '123 Main St'
      })
      .returning()
      .execute();

    const vehicleResult = await db.insert(vehiclesTable)
      .values({
        customer_id: customerResult[0].id,
        make: 'Honda',
        model: 'Civic',
        year: 2022,
        license_plate: 'XYZ789',
        vin: '1HGBH41JXMN109186'
      })
      .returning()
      .execute();

    // Create service order with all fields populated
    await db.insert(serviceOrdersTable)
      .values({
        order_number: 'SO-FULL-001',
        customer_id: customerResult[0].id,
        vehicle_id: vehicleResult[0].id,
        service_types: JSON.stringify(['ENGINE_SERVICE', 'ELECTRICAL_SERVICE']),
        complaints: 'Multiple issues with engine and electrical system',
        referral_source: 'Online search',
        body_defects: 'Dent on rear door',
        other_defects: 'Radio not working',
        assigned_mechanic_id: userResult[0].id,
        created_by_id: adminResult[0].id,
        status: 'TECHNICAL_ANALYSIS'
      })
      .returning()
      .execute();

    const result = await getServiceOrders();

    expect(result).toHaveLength(1);
    const order = result[0];

    expect(order.order_number).toEqual('SO-FULL-001');
    expect(order.service_types).toEqual(['ENGINE_SERVICE', 'ELECTRICAL_SERVICE']);
    expect(order.complaints).toEqual('Multiple issues with engine and electrical system');
    expect(order.referral_source).toEqual('Online search');
    expect(order.body_defects).toEqual('Dent on rear door');
    expect(order.other_defects).toEqual('Radio not working');
    expect(order.assigned_mechanic_id).toEqual(userResult[0].id);
    expect(order.created_by_id).toEqual(adminResult[0].id);
    expect(order.status).toEqual('TECHNICAL_ANALYSIS');
    expect(order.created_at).toBeInstanceOf(Date);
    expect(order.updated_at).toBeNull();
  });
});
