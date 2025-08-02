
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { estimationLibraryTable, usersTable } from '../db/schema';
import { type CreateEstimationLibraryInput } from '../schema';
import { 
  createEstimationLibraryItem, 
  getEstimationLibrary,
  getEstimationLibraryByServiceType,
  updateEstimationLibraryItem,
  deleteEstimationLibraryItem
} from '../handlers/estimation_library';
import { eq } from 'drizzle-orm';

// Test user for foreign key requirements
const testUser = {
  username: 'testuser',
  email: 'test@example.com',
  password_hash: 'hashedpassword',
  full_name: 'Test User',
  role: 'ADMIN' as const
};

// Test estimation library item input
const testInput: CreateEstimationLibraryInput = {
  service_type: 'BRAKE_SERVICE',
  service_name: 'Brake Pad Replacement',
  economic_price: 150.00,
  standard_price: 200.00,
  premium_price: 300.00,
  estimated_labor_hours: 2.5,
  description: 'Complete brake pad replacement service',
  created_by_id: 1
};

describe('Estimation Library Handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  describe('createEstimationLibraryItem', () => {
    it('should create an estimation library item', async () => {
      // Create test user first
      await db.insert(usersTable).values(testUser).execute();

      const result = await createEstimationLibraryItem(testInput);

      expect(result.service_type).toEqual('BRAKE_SERVICE');
      expect(result.service_name).toEqual('Brake Pad Replacement');
      expect(result.economic_price).toEqual(150.00);
      expect(result.standard_price).toEqual(200.00);
      expect(result.premium_price).toEqual(300.00);
      expect(result.estimated_labor_hours).toEqual(2.5);
      expect(result.description).toEqual('Complete brake pad replacement service');
      expect(result.created_by_id).toEqual(1);
      expect(result.is_active).toBe(true);
      expect(result.id).toBeDefined();
      expect(result.created_at).toBeInstanceOf(Date);
    });

    it('should save item to database with correct numeric conversions', async () => {
      await db.insert(usersTable).values(testUser).execute();

      const result = await createEstimationLibraryItem(testInput);

      const items = await db.select()
        .from(estimationLibraryTable)
        .where(eq(estimationLibraryTable.id, result.id))
        .execute();

      expect(items).toHaveLength(1);
      expect(items[0].service_name).toEqual('Brake Pad Replacement');
      expect(parseFloat(items[0].economic_price)).toEqual(150.00);
      expect(parseFloat(items[0].standard_price)).toEqual(200.00);
      expect(parseFloat(items[0].premium_price)).toEqual(300.00);
      expect(parseFloat(items[0].estimated_labor_hours)).toEqual(2.5);
    });

    it('should throw error when user does not exist', async () => {
      expect(createEstimationLibraryItem(testInput)).rejects.toThrow(/violates foreign key constraint/i);
    });
  });

  describe('getEstimationLibrary', () => {
    it('should return all active estimation library items', async () => {
      await db.insert(usersTable).values(testUser).execute();
      
      // Create multiple items
      await createEstimationLibraryItem(testInput);
      await createEstimationLibraryItem({
        ...testInput,
        service_name: 'Oil Change',
        service_type: 'GENERAL_SERVICE'
      });

      const results = await getEstimationLibrary();

      expect(results).toHaveLength(2);
      expect(results[0].economic_price).toEqual(150.00);
      expect(results[1].economic_price).toEqual(150.00);
      expect(typeof results[0].economic_price).toBe('number');
      expect(typeof results[0].standard_price).toBe('number');
      expect(typeof results[0].premium_price).toBe('number');
      expect(typeof results[0].estimated_labor_hours).toBe('number');
    });

    it('should not return inactive items', async () => {
      await db.insert(usersTable).values(testUser).execute();
      
      const item = await createEstimationLibraryItem(testInput);
      await deleteEstimationLibraryItem(item.id);

      const results = await getEstimationLibrary();
      expect(results).toHaveLength(0);
    });
  });

  describe('getEstimationLibraryByServiceType', () => {
    it('should return items filtered by service type', async () => {
      await db.insert(usersTable).values(testUser).execute();
      
      await createEstimationLibraryItem(testInput);
      await createEstimationLibraryItem({
        ...testInput,
        service_name: 'Oil Change',
        service_type: 'GENERAL_SERVICE'
      });

      const brakeResults = await getEstimationLibraryByServiceType('BRAKE_SERVICE');
      const generalResults = await getEstimationLibraryByServiceType('GENERAL_SERVICE');

      expect(brakeResults).toHaveLength(1);
      expect(brakeResults[0].service_type).toEqual('BRAKE_SERVICE');
      expect(generalResults).toHaveLength(1);
      expect(generalResults[0].service_type).toEqual('GENERAL_SERVICE');
    });

    it('should return empty array for non-existent service type', async () => {
      await db.insert(usersTable).values(testUser).execute();
      
      const results = await getEstimationLibraryByServiceType('ENGINE_SERVICE');
      expect(results).toHaveLength(0);
    });
  });

  describe('updateEstimationLibraryItem', () => {
    it('should update estimation library item', async () => {
      await db.insert(usersTable).values(testUser).execute();
      
      const item = await createEstimationLibraryItem(testInput);

      const updateData = {
        service_name: 'Updated Brake Service',
        economic_price: 175.00,
        standard_price: 225.00
      };

      const result = await updateEstimationLibraryItem(item.id, updateData);

      expect(result.service_name).toEqual('Updated Brake Service');
      expect(result.economic_price).toEqual(175.00);
      expect(result.standard_price).toEqual(225.00);
      expect(result.premium_price).toEqual(300.00); // Unchanged
      expect(result.updated_at).toBeInstanceOf(Date);
    });

    it('should throw error when item does not exist', async () => {
      expect(updateEstimationLibraryItem(999, { service_name: 'Test' }))
        .rejects.toThrow(/not found/i);
    });
  });

  describe('deleteEstimationLibraryItem', () => {
    it('should deactivate estimation library item', async () => {
      await db.insert(usersTable).values(testUser).execute();
      
      const item = await createEstimationLibraryItem(testInput);

      const result = await deleteEstimationLibraryItem(item.id);
      expect(result).toBe(true);

      // Verify item is deactivated
      const items = await db.select()
        .from(estimationLibraryTable)
        .where(eq(estimationLibraryTable.id, item.id))
        .execute();

      expect(items[0].is_active).toBe(false);
      expect(items[0].updated_at).toBeInstanceOf(Date);
    });

    it('should return false when item does not exist', async () => {
      const result = await deleteEstimationLibraryItem(999);
      expect(result).toBe(false);
    });
  });
});
