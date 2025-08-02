
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, customersTable, vehiclesTable, serviceOrdersTable, costEstimationsTable } from '../db/schema';
import { getCostEstimations } from '../handlers/get_cost_estimations';

describe('getCostEstimations', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no cost estimations exist', async () => {
    const result = await getCostEstimations();

    expect(result).toEqual([]);
  });

  it('should fetch all cost estimations', async () => {
    // Create user first
    const [user] = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        full_name: 'Test User',
        role: 'MECHANIC'
      })
      .returning()
      .execute();

    // Create customer
    const [customer] = await db.insert(customersTable)
      .values({
        name: 'Test Customer',
        phone: '1234567890',
        email: 'customer@example.com'
      })
      .returning()
      .execute();

    // Create vehicle
    const [vehicle] = await db.insert(vehiclesTable)
      .values({
        customer_id: customer.id,
        make: 'Toyota',
        model: 'Camry',
        year: 2020,
        license_plate: 'ABC123'
      })
      .returning()
      .execute();

    // Create service order
    const [serviceOrder] = await db.insert(serviceOrdersTable)
      .values({
        order_number: 'ORD001',
        customer_id: customer.id,
        vehicle_id: vehicle.id,
        service_types: ['GENERAL_SERVICE'],
        complaints: 'Engine noise',
        created_by_id: user.id
      })
      .returning()
      .execute();

    // Create cost estimation
    await db.insert(costEstimationsTable)
      .values({
        service_order_id: serviceOrder.id,
        economic_tier_price: '150.00',
        standard_tier_price: '250.00',
        premium_tier_price: '350.00',
        economic_description: 'Basic service',
        standard_description: 'Standard service',
        premium_description: 'Premium service',
        estimated_by_id: user.id
      })
      .execute();

    const result = await getCostEstimations();

    expect(result).toHaveLength(1);
    expect(result[0].service_order_id).toEqual(serviceOrder.id);
    expect(result[0].economic_tier_price).toEqual(150.00);
    expect(result[0].standard_tier_price).toEqual(250.00);
    expect(result[0].premium_tier_price).toEqual(350.00);
    expect(result[0].economic_description).toEqual('Basic service');
    expect(result[0].standard_description).toEqual('Standard service');
    expect(result[0].premium_description).toEqual('Premium service');
    expect(result[0].customer_decision).toEqual('PENDING');
    expect(result[0].chosen_tier).toBeNull();
    expect(result[0].estimated_by_id).toEqual(user.id);
    expect(result[0].estimation_date).toBeInstanceOf(Date);
    expect(result[0].customer_response_date).toBeNull();
    expect(result[0].created_at).toBeInstanceOf(Date);
    expect(result[0].id).toBeDefined();
  });

  it('should fetch multiple cost estimations', async () => {
    // Create user
    const [user] = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        full_name: 'Test User',
        role: 'MECHANIC'
      })
      .returning()
      .execute();

    // Create customer
    const [customer] = await db.insert(customersTable)
      .values({
        name: 'Test Customer',
        phone: '1234567890',
        email: 'customer@example.com'
      })
      .returning()
      .execute();

    // Create vehicle
    const [vehicle] = await db.insert(vehiclesTable)
      .values({
        customer_id: customer.id,
        make: 'Toyota',
        model: 'Camry',
        year: 2020,
        license_plate: 'ABC123'
      })
      .returning()
      .execute();

    // Create first service order
    const [serviceOrder1] = await db.insert(serviceOrdersTable)
      .values({
        order_number: 'ORD001',
        customer_id: customer.id,
        vehicle_id: vehicle.id,
        service_types: ['GENERAL_SERVICE'],
        complaints: 'Engine noise',
        created_by_id: user.id
      })
      .returning()
      .execute();

    // Create second service order
    const [serviceOrder2] = await db.insert(serviceOrdersTable)
      .values({
        order_number: 'ORD002',
        customer_id: customer.id,
        vehicle_id: vehicle.id,
        service_types: ['BRAKE_SERVICE'],
        complaints: 'Brake squeaking',
        created_by_id: user.id
      })
      .returning()
      .execute();

    // Create cost estimations
    await db.insert(costEstimationsTable)
      .values([
        {
          service_order_id: serviceOrder1.id,
          economic_tier_price: '150.00',
          standard_tier_price: '250.00',
          premium_tier_price: '350.00',
          economic_description: 'Basic engine service',
          standard_description: 'Standard engine service',
          premium_description: 'Premium engine service',
          estimated_by_id: user.id
        },
        {
          service_order_id: serviceOrder2.id,
          economic_tier_price: '200.00',
          standard_tier_price: '300.00',
          premium_tier_price: '400.00',
          economic_description: 'Basic brake service',
          standard_description: 'Standard brake service',
          premium_description: 'Premium brake service',
          estimated_by_id: user.id
        }
      ])
      .execute();

    const result = await getCostEstimations();

    expect(result).toHaveLength(2);
    
    // Check first estimation
    const estimation1 = result.find(e => e.service_order_id === serviceOrder1.id);
    expect(estimation1).toBeDefined();
    expect(estimation1!.economic_tier_price).toEqual(150.00);
    expect(estimation1!.economic_description).toEqual('Basic engine service');

    // Check second estimation
    const estimation2 = result.find(e => e.service_order_id === serviceOrder2.id);
    expect(estimation2).toBeDefined();
    expect(estimation2!.economic_tier_price).toEqual(200.00);
    expect(estimation2!.economic_description).toEqual('Basic brake service');

    // Verify numeric conversions
    result.forEach(estimation => {
      expect(typeof estimation.economic_tier_price).toBe('number');
      expect(typeof estimation.standard_tier_price).toBe('number');
      expect(typeof estimation.premium_tier_price).toBe('number');
    });

    // Verify date conversions
    result.forEach(estimation => {
      expect(estimation.estimation_date).toBeInstanceOf(Date);
      expect(estimation.created_at).toBeInstanceOf(Date);
    });
  });
});
