
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { estimationLibraryTable, usersTable } from '../db/schema';
import { type CreateEstimationLibraryInput } from '../schema';
import { getEstimationLibrary } from '../handlers/get_estimation_library';
import { eq } from 'drizzle-orm';

describe('getEstimationLibrary', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no entries exist', async () => {
    const result = await getEstimationLibrary();
    
    expect(result).toEqual([]);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should fetch all estimation library entries', async () => {
    // Create a test user first
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

    // Create test estimation library entries
    const testEntries = [
      {
        service_type: 'BRAKE_SERVICE' as const,
        service_name: 'Brake Pad Replacement',
        economic_price: 150.00,
        standard_price: 200.00,
        premium_price: 300.00,
        estimated_labor_hours: 2.5,
        description: 'Replace brake pads',
        created_by_id: user[0].id
      },
      {
        service_type: 'ENGINE_SERVICE' as const,
        service_name: 'Oil Change',
        economic_price: 50.00,
        standard_price: 75.00,
        premium_price: 100.00,
        estimated_labor_hours: 1.0,
        description: 'Standard oil change',
        created_by_id: user[0].id
      }
    ];

    // Insert test entries
    await db.insert(estimationLibraryTable)
      .values(testEntries.map(entry => ({
        ...entry,
        economic_price: entry.economic_price.toString(),
        standard_price: entry.standard_price.toString(),
        premium_price: entry.premium_price.toString(),
        estimated_labor_hours: entry.estimated_labor_hours.toString()
      })))
      .execute();

    const result = await getEstimationLibrary();

    expect(result).toHaveLength(2);
    
    // Verify first entry
    const brakeService = result.find(entry => entry.service_name === 'Brake Pad Replacement');
    expect(brakeService).toBeDefined();
    expect(brakeService?.service_type).toEqual('BRAKE_SERVICE');
    expect(brakeService?.economic_price).toEqual(150.00);
    expect(brakeService?.standard_price).toEqual(200.00);
    expect(brakeService?.premium_price).toEqual(300.00);
    expect(brakeService?.estimated_labor_hours).toEqual(2.5);
    expect(brakeService?.description).toEqual('Replace brake pads');
    expect(brakeService?.is_active).toBe(true);
    expect(brakeService?.created_at).toBeInstanceOf(Date);

    // Verify second entry
    const oilChange = result.find(entry => entry.service_name === 'Oil Change');
    expect(oilChange).toBeDefined();
    expect(oilChange?.service_type).toEqual('ENGINE_SERVICE');
    expect(oilChange?.economic_price).toEqual(50.00);
    expect(oilChange?.standard_price).toEqual(75.00);
    expect(oilChange?.premium_price).toEqual(100.00);
    expect(oilChange?.estimated_labor_hours).toEqual(1.0);
  });

  it('should include inactive entries in results', async () => {
    // Create a test user
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

    // Create active and inactive entries
    await db.insert(estimationLibraryTable)
      .values([
        {
          service_type: 'GENERAL_SERVICE',
          service_name: 'Active Service',
          economic_price: '100.00',
          standard_price: '150.00',
          premium_price: '200.00',
          estimated_labor_hours: '2.0',
          created_by_id: user[0].id,
          is_active: true
        },
        {
          service_type: 'TIRE_SERVICE',
          service_name: 'Inactive Service',
          economic_price: '80.00',
          standard_price: '120.00',
          premium_price: '160.00',
          estimated_labor_hours: '1.5',
          created_by_id: user[0].id,
          is_active: false
        }
      ])
      .execute();

    const result = await getEstimationLibrary();

    expect(result).toHaveLength(2);
    
    const activeEntry = result.find(entry => entry.service_name === 'Active Service');
    const inactiveEntry = result.find(entry => entry.service_name === 'Inactive Service');
    
    expect(activeEntry?.is_active).toBe(true);
    expect(inactiveEntry?.is_active).toBe(false);
  });

  it('should convert numeric fields correctly', async () => {
    // Create a test user
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

    // Create entry with decimal values
    await db.insert(estimationLibraryTable)
      .values({
        service_type: 'AC_SERVICE',
        service_name: 'AC Repair',
        economic_price: '99.99',
        standard_price: '149.50',
        premium_price: '199.95',
        estimated_labor_hours: '3.75',
        created_by_id: user[0].id
      })
      .execute();

    const result = await getEstimationLibrary();

    expect(result).toHaveLength(1);
    expect(typeof result[0].economic_price).toBe('number');
    expect(typeof result[0].standard_price).toBe('number');
    expect(typeof result[0].premium_price).toBe('number');
    expect(typeof result[0].estimated_labor_hours).toBe('number');
    expect(result[0].economic_price).toEqual(99.99);
    expect(result[0].standard_price).toEqual(149.50);
    expect(result[0].premium_price).toEqual(199.95);
    expect(result[0].estimated_labor_hours).toEqual(3.75);
  });
});
