
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { estimationLibraryTable, usersTable } from '../db/schema';
import { type CreateEstimationLibraryInput } from '../schema';
import { createEstimationLibrary } from '../handlers/create_estimation_library';
import { eq } from 'drizzle-orm';

describe('createEstimationLibrary', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create an estimation library entry', async () => {
    // Create prerequisite user
    const userResult = await db.insert(usersTable)
      .values({
        username: 'test_user',
        email: 'test@example.com',
        password_hash: 'hash123',
        full_name: 'Test User',
        role: 'ADMIN'
      })
      .returning()
      .execute();

    const testInput: CreateEstimationLibraryInput = {
      service_type: 'BRAKE_SERVICE',
      service_name: 'Brake Pad Replacement',
      economic_price: 150.00,
      standard_price: 200.00,
      premium_price: 280.00,
      estimated_labor_hours: 2.5,
      description: 'Complete brake pad replacement for front wheels',
      created_by_id: userResult[0].id
    };

    const result = await createEstimationLibrary(testInput);

    // Basic field validation
    expect(result.service_type).toEqual('BRAKE_SERVICE');
    expect(result.service_name).toEqual('Brake Pad Replacement');
    expect(result.economic_price).toEqual(150.00);
    expect(result.standard_price).toEqual(200.00);
    expect(result.premium_price).toEqual(280.00);
    expect(result.estimated_labor_hours).toEqual(2.5);
    expect(result.description).toEqual('Complete brake pad replacement for front wheels');
    expect(result.created_by_id).toEqual(userResult[0].id);
    expect(result.is_active).toBe(true);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeNull();

    // Verify numeric type conversions
    expect(typeof result.economic_price).toBe('number');
    expect(typeof result.standard_price).toBe('number');
    expect(typeof result.premium_price).toBe('number');
    expect(typeof result.estimated_labor_hours).toBe('number');
  });

  it('should save estimation library entry to database', async () => {
    // Create prerequisite user
    const userResult = await db.insert(usersTable)
      .values({
        username: 'test_user',
        email: 'test@example.com',
        password_hash: 'hash123',
        full_name: 'Test User',
        role: 'ADMIN'
      })
      .returning()
      .execute();

    const testInput: CreateEstimationLibraryInput = {
      service_type: 'ENGINE_SERVICE',
      service_name: 'Oil Change',
      economic_price: 50.00,
      standard_price: 75.00,
      premium_price: 100.00,
      estimated_labor_hours: 1.0,
      created_by_id: userResult[0].id
    };

    const result = await createEstimationLibrary(testInput);

    // Query database to verify data was saved correctly
    const saved = await db.select()
      .from(estimationLibraryTable)
      .where(eq(estimationLibraryTable.id, result.id))
      .execute();

    expect(saved).toHaveLength(1);
    expect(saved[0].service_type).toEqual('ENGINE_SERVICE');
    expect(saved[0].service_name).toEqual('Oil Change');
    expect(parseFloat(saved[0].economic_price)).toEqual(50.00);
    expect(parseFloat(saved[0].standard_price)).toEqual(75.00);
    expect(parseFloat(saved[0].premium_price)).toEqual(100.00);
    expect(parseFloat(saved[0].estimated_labor_hours)).toEqual(1.0);
    expect(saved[0].description).toBeNull();
    expect(saved[0].created_by_id).toEqual(userResult[0].id);
    expect(saved[0].is_active).toBe(true);
    expect(saved[0].created_at).toBeInstanceOf(Date);
  });

  it('should handle estimation library entry without optional description', async () => {
    // Create prerequisite user
    const userResult = await db.insert(usersTable)
      .values({
        username: 'test_user',
        email: 'test@example.com',
        password_hash: 'hash123',
        full_name: 'Test User',
        role: 'ADMIN'
      })
      .returning()
      .execute();

    const testInput: CreateEstimationLibraryInput = {
      service_type: 'TIRE_SERVICE',
      service_name: 'Tire Rotation',
      economic_price: 25.00,
      standard_price: 35.00,
      premium_price: 45.00,
      estimated_labor_hours: 0.5,
      created_by_id: userResult[0].id
    };

    const result = await createEstimationLibrary(testInput);

    expect(result.service_name).toEqual('Tire Rotation');
    expect(result.description).toBeNull();
    expect(result.economic_price).toEqual(25.00);
    expect(result.estimated_labor_hours).toEqual(0.5);
  });
});
