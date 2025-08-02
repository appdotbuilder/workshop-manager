
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { costEstimationsTable, usersTable, customersTable, vehiclesTable, serviceOrdersTable } from '../db/schema';
import { type CreateCostEstimationInput } from '../schema';
import { createCostEstimation } from '../handlers/create_cost_estimation';
import { eq } from 'drizzle-orm';

describe('createCostEstimation', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUser: any;
  let testCustomer: any;
  let testVehicle: any;
  let testServiceOrder: any;

  beforeEach(async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hash123',
        full_name: 'Test User',
        role: 'MECHANIC'
      })
      .returning()
      .execute();
    testUser = userResult[0];

    // Create test customer
    const customerResult = await db.insert(customersTable)
      .values({
        name: 'Test Customer',
        phone: '1234567890',
        email: 'customer@example.com'
      })
      .returning()
      .execute();
    testCustomer = customerResult[0];

    // Create test vehicle
    const vehicleResult = await db.insert(vehiclesTable)
      .values({
        customer_id: testCustomer.id,
        make: 'Toyota',
        model: 'Camry',
        year: 2020,
        license_plate: 'ABC123'
      })
      .returning()
      .execute();
    testVehicle = vehicleResult[0];

    // Create test service order
    const serviceOrderResult = await db.insert(serviceOrdersTable)
      .values({
        order_number: 'SO-001',
        customer_id: testCustomer.id,
        vehicle_id: testVehicle.id,
        service_types: ['BRAKE_SERVICE'],
        complaints: 'Brake noise',
        created_by_id: testUser.id,
        status: 'COST_ESTIMATION'
      })
      .returning()
      .execute();
    testServiceOrder = serviceOrderResult[0];
  });

  it('should create a cost estimation with all pricing tiers', async () => {
    const testInput: CreateCostEstimationInput = {
      service_order_id: testServiceOrder.id,
      economic_tier_price: 150.00,
      standard_tier_price: 250.00,
      premium_tier_price: 350.00,
      economic_description: 'Basic brake pad replacement',
      standard_description: 'Brake pad replacement with inspection',
      premium_description: 'Complete brake system overhaul with premium parts',
      estimated_by_id: testUser.id
    };

    const result = await createCostEstimation(testInput);

    // Verify returned data
    expect(result.service_order_id).toEqual(testServiceOrder.id);
    expect(result.economic_tier_price).toEqual(150.00);
    expect(result.standard_tier_price).toEqual(250.00);
    expect(result.premium_tier_price).toEqual(350.00);
    expect(result.economic_description).toEqual('Basic brake pad replacement');
    expect(result.standard_description).toEqual('Brake pad replacement with inspection');
    expect(result.premium_description).toEqual('Complete brake system overhaul with premium parts');
    expect(result.estimated_by_id).toEqual(testUser.id);
    expect(result.customer_decision).toEqual('PENDING');
    expect(result.chosen_tier).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.estimation_date).toBeInstanceOf(Date);
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save cost estimation to database', async () => {
    const testInput: CreateCostEstimationInput = {
      service_order_id: testServiceOrder.id,
      economic_tier_price: 200.50,
      standard_tier_price: 300.75,
      premium_tier_price: 400.99,
      economic_description: 'Economy service',
      standard_description: 'Standard service',
      premium_description: 'Premium service',
      estimated_by_id: testUser.id
    };

    const result = await createCostEstimation(testInput);

    // Verify in database
    const estimations = await db.select()
      .from(costEstimationsTable)
      .where(eq(costEstimationsTable.id, result.id))
      .execute();

    expect(estimations).toHaveLength(1);
    const saved = estimations[0];
    expect(saved.service_order_id).toEqual(testServiceOrder.id);
    expect(parseFloat(saved.economic_tier_price)).toEqual(200.50);
    expect(parseFloat(saved.standard_tier_price)).toEqual(300.75);
    expect(parseFloat(saved.premium_tier_price)).toEqual(400.99);
    expect(saved.economic_description).toEqual('Economy service');
    expect(saved.customer_decision).toEqual('PENDING');
    // Note: estimation_date in database is a string in YYYY-MM-DD format
    expect(typeof saved.estimation_date).toBe('string');
    expect(saved.estimation_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('should handle numeric price conversions correctly', async () => {
    const testInput: CreateCostEstimationInput = {
      service_order_id: testServiceOrder.id,
      economic_tier_price: 99.99,
      standard_tier_price: 199.99,
      premium_tier_price: 299.99,
      economic_description: 'Budget option',
      standard_description: 'Standard option',
      premium_description: 'Premium option',
      estimated_by_id: testUser.id
    };

    const result = await createCostEstimation(testInput);

    // Verify numeric types in response
    expect(typeof result.economic_tier_price).toBe('number');
    expect(typeof result.standard_tier_price).toBe('number');
    expect(typeof result.premium_tier_price).toBe('number');
    expect(result.economic_tier_price).toEqual(99.99);
    expect(result.standard_tier_price).toEqual(199.99);
    expect(result.premium_tier_price).toEqual(299.99);
  });

  it('should throw error when service order does not exist', async () => {
    const testInput: CreateCostEstimationInput = {
      service_order_id: 99999, // Non-existent service order
      economic_tier_price: 100.00,
      standard_tier_price: 200.00,
      premium_tier_price: 300.00,
      economic_description: 'Economy',
      standard_description: 'Standard',
      premium_description: 'Premium',
      estimated_by_id: testUser.id
    };

    await expect(createCostEstimation(testInput)).rejects.toThrow(/Service order with id 99999 not found/i);
  });

  it('should create estimation with default enum values', async () => {
    const testInput: CreateCostEstimationInput = {
      service_order_id: testServiceOrder.id,
      economic_tier_price: 120.00,
      standard_tier_price: 220.00,
      premium_tier_price: 320.00,
      economic_description: 'Basic repair',
      standard_description: 'Standard repair',
      premium_description: 'Premium repair',
      estimated_by_id: testUser.id
    };

    const result = await createCostEstimation(testInput);

    // Verify default enum values
    expect(result.customer_decision).toEqual('PENDING');
    expect(result.chosen_tier).toBeNull();
    expect(result.customer_response_date).toBeNull();
  });
});
