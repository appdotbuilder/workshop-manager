
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { 
  workExecutionTable, 
  usersTable, 
  customersTable, 
  vehiclesTable, 
  serviceOrdersTable, 
  costEstimationsTable 
} from '../db/schema';
import { type CreateWorkExecutionInput } from '../schema';
import { 
  createWorkExecution, 
  getWorkExecutionByServiceOrder, 
  updateWorkExecution, 
  completeWorkExecution 
} from '../handlers/work_execution';
import { eq } from 'drizzle-orm';

describe('Work Execution Handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper function to create prerequisite data
  const createPrerequisites = async () => {
    // Create user
    const user = await db.insert(usersTable)
      .values({
        username: 'mechanic1',
        email: 'mechanic@test.com',
        password_hash: 'hash123',
        full_name: 'Test Mechanic',
        role: 'MECHANIC'
      })
      .returning()
      .execute();

    // Create customer
    const customer = await db.insert(customersTable)
      .values({
        name: 'Test Customer',
        phone: '1234567890',
        email: 'customer@test.com'
      })
      .returning()
      .execute();

    // Create vehicle
    const vehicle = await db.insert(vehiclesTable)
      .values({
        customer_id: customer[0].id,
        make: 'Toyota',
        model: 'Camry',
        year: 2020,
        license_plate: 'ABC123'
      })
      .returning()
      .execute();

    // Create service order
    const serviceOrder = await db.insert(serviceOrdersTable)
      .values({
        order_number: 'SO-2024-001',
        customer_id: customer[0].id,
        vehicle_id: vehicle[0].id,
        service_types: ['GENERAL_SERVICE'],
        complaints: 'Engine making noise',
        created_by_id: user[0].id
      })
      .returning()
      .execute();

    // Create approved cost estimation
    await db.insert(costEstimationsTable)
      .values({
        service_order_id: serviceOrder[0].id,
        economic_tier_price: '100.00',
        standard_tier_price: '150.00',
        premium_tier_price: '200.00',
        economic_description: 'Basic repair',
        standard_description: 'Standard repair',
        premium_description: 'Premium repair',
        customer_decision: 'APPROVED',
        chosen_tier: 'STANDARD',
        estimated_by_id: user[0].id
      })
      .execute();

    return { user: user[0], serviceOrder: serviceOrder[0] };
  };

  const testInput: CreateWorkExecutionInput = {
    service_order_id: 1, // Will be overridden in tests
    work_description: 'Replaced engine oil and filter',
    parts_used: 'Engine oil 5L, Oil filter',
    labor_hours: 2.5,
    completion_checklist: {
      'oil_changed': true,
      'filter_replaced': true,
      'test_drive': false
    },
    work_photos: ['https://example.com/photo1.jpg'],
    executed_by_id: 1 // Will be overridden in tests
  };

  describe('createWorkExecution', () => {
    it('should create work execution with approved estimate', async () => {
      const { user, serviceOrder } = await createPrerequisites();
      const input = { ...testInput, service_order_id: serviceOrder.id, executed_by_id: user.id };

      const result = await createWorkExecution(input);

      expect(result.service_order_id).toEqual(serviceOrder.id);
      expect(result.work_description).toEqual('Replaced engine oil and filter');
      expect(result.parts_used).toEqual('Engine oil 5L, Oil filter');
      expect(result.labor_hours).toEqual(2.5);
      expect(typeof result.labor_hours).toBe('number');
      expect(result.completion_checklist).toEqual({
        'oil_changed': true,
        'filter_replaced': true,
        'test_drive': false
      });
      expect(result.work_photos).toEqual(['https://example.com/photo1.jpg']);
      expect(result.executed_by_id).toEqual(user.id);
      expect(result.id).toBeDefined();
      expect(result.created_at).toBeInstanceOf(Date);
      expect(result.start_date).toBeInstanceOf(Date);
      expect(result.completion_date).toBeNull();
    });

    it('should save work execution to database', async () => {
      const { user, serviceOrder } = await createPrerequisites();
      const input = { ...testInput, service_order_id: serviceOrder.id, executed_by_id: user.id };

      const result = await createWorkExecution(input);

      const saved = await db.select()
        .from(workExecutionTable)
        .where(eq(workExecutionTable.id, result.id))
        .execute();

      expect(saved).toHaveLength(1);
      expect(saved[0].work_description).toEqual('Replaced engine oil and filter');
      expect(parseFloat(saved[0].labor_hours)).toEqual(2.5);
      expect(saved[0].completion_checklist).toEqual({
        'oil_changed': true,
        'filter_replaced': true,
        'test_drive': false
      });
    });

    it('should throw error for non-existent service order', async () => {
      const { user } = await createPrerequisites();
      const input = { ...testInput, service_order_id: 99999, executed_by_id: user.id };

      expect(() => createWorkExecution(input)).toThrow(/Service order not found/i);
    });

    it('should throw error without approved estimate', async () => {
      const { user } = await createPrerequisites();
      
      // Create service order without approved estimate
      const customer = await db.insert(customersTable)
        .values({
          name: 'Test Customer 2',
          phone: '9876543210',
          email: 'customer2@test.com'
        })
        .returning()
        .execute();

      const vehicle = await db.insert(vehiclesTable)
        .values({
          customer_id: customer[0].id,
          make: 'Honda',
          model: 'Civic',
          year: 2019,
          license_plate: 'XYZ789'
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
          created_by_id: user.id
        })
        .returning()
        .execute();

      const input = { ...testInput, service_order_id: serviceOrder[0].id, executed_by_id: user.id };

      expect(() => createWorkExecution(input)).toThrow(/No approved cost estimation found/i);
    });
  });

  describe('getWorkExecutionByServiceOrder', () => {
    it('should return work execution for service order', async () => {
      const { user, serviceOrder } = await createPrerequisites();
      const input = { ...testInput, service_order_id: serviceOrder.id, executed_by_id: user.id };

      const created = await createWorkExecution(input);
      const result = await getWorkExecutionByServiceOrder(serviceOrder.id);

      expect(result).toBeDefined();
      expect(result!.id).toEqual(created.id);
      expect(result!.work_description).toEqual('Replaced engine oil and filter');
      expect(result!.labor_hours).toEqual(2.5);
      expect(typeof result!.labor_hours).toBe('number');
      expect(result!.start_date).toBeInstanceOf(Date);
    });

    it('should return null for non-existent service order', async () => {
      const result = await getWorkExecutionByServiceOrder(99999);
      expect(result).toBeNull();
    });
  });

  describe('updateWorkExecution', () => {
    it('should update work execution fields', async () => {
      const { user, serviceOrder } = await createPrerequisites();
      const input = { ...testInput, service_order_id: serviceOrder.id, executed_by_id: user.id };

      const created = await createWorkExecution(input);
      const updateData = {
        work_description: 'Updated work description',
        labor_hours: 3.0,
        completion_checklist: {
          'oil_changed': true,
          'filter_replaced': true,
          'test_drive': true
        }
      };

      const result = await updateWorkExecution(created.id, updateData);

      expect(result.work_description).toEqual('Updated work description');
      expect(result.labor_hours).toEqual(3.0);
      expect(typeof result.labor_hours).toBe('number');
      expect(result.completion_checklist).toEqual({
        'oil_changed': true,
        'filter_replaced': true,
        'test_drive': true
      });
      expect(result.parts_used).toEqual(input.parts_used || null); // Unchanged field
    });

    it('should throw error for non-existent work execution', async () => {
      expect(() => updateWorkExecution(99999, { work_description: 'test' })).toThrow(/Work execution not found/i);
    });
  });

  describe('completeWorkExecution', () => {
    it('should mark work execution as completed', async () => {
      const { user, serviceOrder } = await createPrerequisites();
      const input = { ...testInput, service_order_id: serviceOrder.id, executed_by_id: user.id };

      const created = await createWorkExecution(input);
      expect(created.completion_date).toBeNull();

      const result = await completeWorkExecution(created.id);

      expect(result.completion_date).toBeInstanceOf(Date);
      expect(result.completion_date).not.toBeNull();
    });

    it('should save completion date to database', async () => {
      const { user, serviceOrder } = await createPrerequisites();
      const input = { ...testInput, service_order_id: serviceOrder.id, executed_by_id: user.id };

      const created = await createWorkExecution(input);
      await completeWorkExecution(created.id);

      const saved = await db.select()
        .from(workExecutionTable)
        .where(eq(workExecutionTable.id, created.id))
        .execute();

      expect(saved[0].completion_date).not.toBeNull();
      expect(new Date(saved[0].completion_date!)).toBeInstanceOf(Date);
    });

    it('should throw error for non-existent work execution', async () => {
      expect(() => completeWorkExecution(99999)).toThrow(/Work execution not found/i);
    });
  });
});
