
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, customersTable, vehiclesTable, serviceOrdersTable, costEstimationsTable } from '../db/schema';
import { type CreateCostEstimationInput } from '../schema';
import { createCostEstimation, getCostEstimationByServiceOrder, updateCostEstimationDecision } from '../handlers/cost_estimation';
import { eq } from 'drizzle-orm';

// Test data setup
const createTestUser = async () => {
  const result = await db.insert(usersTable)
    .values({
      username: 'testestimator',
      email: 'estimator@test.com',
      password_hash: 'hash123',
      full_name: 'Test Estimator',
      role: 'MECHANIC'
    })
    .returning()
    .execute();
  return result[0];
};

const createTestCustomer = async () => {
  const result = await db.insert(customersTable)
    .values({
      name: 'Test Customer',
      phone: '1234567890',
      email: 'customer@test.com'
    })
    .returning()
    .execute();
  return result[0];
};

const createTestVehicle = async (customerId: number) => {
  const result = await db.insert(vehiclesTable)
    .values({
      customer_id: customerId,
      make: 'Toyota',
      model: 'Camry',
      year: 2020,
      license_plate: 'ABC123'
    })
    .returning()
    .execute();
  return result[0];
};

const createTestServiceOrder = async (customerId: number, vehicleId: number, createdById: number) => {
  const result = await db.insert(serviceOrdersTable)
    .values({
      order_number: 'SO-2024-001',
      customer_id: customerId,
      vehicle_id: vehicleId,
      service_types: ['GENERAL_SERVICE'],
      complaints: 'Test complaint',
      created_by_id: createdById
    })
    .returning()
    .execute();
  return result[0];
};

const testInput: CreateCostEstimationInput = {
  service_order_id: 1,
  economic_tier_price: 150.00,
  standard_tier_price: 250.00,
  premium_tier_price: 350.00,
  economic_description: 'Basic service with essential repairs',
  standard_description: 'Standard service with quality parts',
  premium_description: 'Premium service with top-tier parts and warranty',
  estimated_by_id: 1
};

describe('createCostEstimation', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a cost estimation', async () => {
    const user = await createTestUser();
    const customer = await createTestCustomer();
    const vehicle = await createTestVehicle(customer.id);
    const serviceOrder = await createTestServiceOrder(customer.id, vehicle.id, user.id);

    const input = {
      ...testInput,
      service_order_id: serviceOrder.id,
      estimated_by_id: user.id
    };

    const result = await createCostEstimation(input);

    // Basic field validation
    expect(result.service_order_id).toEqual(serviceOrder.id);
    expect(result.economic_tier_price).toEqual(150.00);
    expect(result.standard_tier_price).toEqual(250.00);
    expect(result.premium_tier_price).toEqual(350.00);
    expect(result.economic_description).toEqual(input.economic_description);
    expect(result.standard_description).toEqual(input.standard_description);
    expect(result.premium_description).toEqual(input.premium_description);
    expect(result.estimated_by_id).toEqual(user.id);
    expect(result.customer_decision).toEqual('PENDING');
    expect(result.chosen_tier).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.estimation_date).toBeInstanceOf(Date);
    expect(result.customer_response_date).toBeNull();
  });

  it('should save cost estimation to database', async () => {
    const user = await createTestUser();
    const customer = await createTestCustomer();
    const vehicle = await createTestVehicle(customer.id);
    const serviceOrder = await createTestServiceOrder(customer.id, vehicle.id, user.id);

    const input = {
      ...testInput,
      service_order_id: serviceOrder.id,
      estimated_by_id: user.id
    };

    const result = await createCostEstimation(input);

    const estimations = await db.select()
      .from(costEstimationsTable)
      .where(eq(costEstimationsTable.id, result.id))
      .execute();

    expect(estimations).toHaveLength(1);
    expect(estimations[0].service_order_id).toEqual(serviceOrder.id);
    expect(parseFloat(estimations[0].economic_tier_price)).toEqual(150.00);
    expect(parseFloat(estimations[0].standard_tier_price)).toEqual(250.00);
    expect(parseFloat(estimations[0].premium_tier_price)).toEqual(350.00);
    expect(estimations[0].created_at).toBeInstanceOf(Date);
    expect(typeof estimations[0].estimation_date).toBe('string'); // Raw DB returns string
  });

  it('should throw error for non-existent service order', async () => {
    const user = await createTestUser();
    
    const input = {
      ...testInput,
      service_order_id: 999,
      estimated_by_id: user.id
    };

    expect(createCostEstimation(input)).rejects.toThrow(/service order not found/i);
  });
});

describe('getCostEstimationByServiceOrder', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should retrieve cost estimation by service order id', async () => {
    const user = await createTestUser();
    const customer = await createTestCustomer();
    const vehicle = await createTestVehicle(customer.id);
    const serviceOrder = await createTestServiceOrder(customer.id, vehicle.id, user.id);

    const input = {
      ...testInput,
      service_order_id: serviceOrder.id,
      estimated_by_id: user.id
    };

    const created = await createCostEstimation(input);
    const retrieved = await getCostEstimationByServiceOrder(serviceOrder.id);

    expect(retrieved).not.toBeNull();
    expect(retrieved!.id).toEqual(created.id);
    expect(retrieved!.service_order_id).toEqual(serviceOrder.id);
    expect(retrieved!.economic_tier_price).toEqual(150.00);
    expect(retrieved!.standard_tier_price).toEqual(250.00);
    expect(retrieved!.premium_tier_price).toEqual(350.00);
    expect(retrieved!.estimation_date).toBeInstanceOf(Date);
    expect(retrieved!.customer_response_date).toBeNull();
  });

  it('should return null for non-existent service order', async () => {
    const result = await getCostEstimationByServiceOrder(999);
    expect(result).toBeNull();
  });
});

describe('updateCostEstimationDecision', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update customer decision and chosen tier', async () => {
    const user = await createTestUser();
    const customer = await createTestCustomer();
    const vehicle = await createTestVehicle(customer.id);
    const serviceOrder = await createTestServiceOrder(customer.id, vehicle.id, user.id);

    const input = {
      ...testInput,
      service_order_id: serviceOrder.id,
      estimated_by_id: user.id
    };

    await createCostEstimation(input);
    const updated = await updateCostEstimationDecision(serviceOrder.id, 'APPROVED', 'STANDARD');

    expect(updated.customer_decision).toEqual('APPROVED');
    expect(updated.chosen_tier).toEqual('STANDARD');
    expect(updated.customer_response_date).toBeInstanceOf(Date);
    expect(updated.estimation_date).toBeInstanceOf(Date);
  });

  it('should update decision without chosen tier', async () => {
    const user = await createTestUser();
    const customer = await createTestCustomer();
    const vehicle = await createTestVehicle(customer.id);
    const serviceOrder = await createTestServiceOrder(customer.id, vehicle.id, user.id);

    const input = {
      ...testInput,
      service_order_id: serviceOrder.id,
      estimated_by_id: user.id
    };

    await createCostEstimation(input);
    const updated = await updateCostEstimationDecision(serviceOrder.id, 'REJECTED');

    expect(updated.customer_decision).toEqual('REJECTED');
    expect(updated.chosen_tier).toBeNull();
    expect(updated.customer_response_date).toBeInstanceOf(Date);
  });

  it('should throw error for non-existent cost estimation', async () => {
    expect(updateCostEstimationDecision(999, 'APPROVED')).rejects.toThrow(/cost estimation not found/i);
  });

  it('should handle numeric price conversions correctly', async () => {
    const user = await createTestUser();
    const customer = await createTestCustomer();
    const vehicle = await createTestVehicle(customer.id);
    const serviceOrder = await createTestServiceOrder(customer.id, vehicle.id, user.id);

    const input = {
      ...testInput,
      service_order_id: serviceOrder.id,
      estimated_by_id: user.id
    };

    await createCostEstimation(input);
    const updated = await updateCostEstimationDecision(serviceOrder.id, 'APPROVED', 'PREMIUM');

    expect(typeof updated.economic_tier_price).toBe('number');
    expect(typeof updated.standard_tier_price).toBe('number');
    expect(typeof updated.premium_tier_price).toBe('number');
    expect(updated.premium_tier_price).toEqual(350.00);
  });
});
