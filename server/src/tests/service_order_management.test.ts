
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { serviceOrdersTable, customersTable, vehiclesTable, usersTable } from '../db/schema';
import { type CreateServiceOrderInput, type ServiceType } from '../schema';
import { 
  createServiceOrder, 
  getServiceOrders, 
  getServiceOrderById, 
  updateServiceOrderStatus,
  getServiceOrdersByMechanic,
  getServiceOrdersByStatus
} from '../handlers/service_order_management';
import { eq } from 'drizzle-orm';

describe('Service Order Management', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testCustomerId: number;
  let testVehicleId: number;
  let testUserId: number;
  let testMechanicId: number;

  beforeEach(async () => {
    // Create test customer
    const customerResult = await db.insert(customersTable)
      .values({
        name: 'Test Customer',
        phone: '08123456789',
        email: 'test@example.com'
      })
      .returning()
      .execute();
    testCustomerId = customerResult[0].id;

    // Create test vehicle
    const vehicleResult = await db.insert(vehiclesTable)
      .values({
        customer_id: testCustomerId,
        make: 'Toyota',
        model: 'Camry',
        year: 2020,
        license_plate: 'B1234CD'
      })
      .returning()
      .execute();
    testVehicleId = vehicleResult[0].id;

    // Create test user (creator)
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'user@test.com',
        password_hash: 'hashed_password',
        full_name: 'Test User',
        role: 'ADMIN'
      })
      .returning()
      .execute();
    testUserId = userResult[0].id;

    // Create test mechanic
    const mechanicResult = await db.insert(usersTable)
      .values({
        username: 'testmechanic',
        email: 'mechanic@test.com',
        password_hash: 'hashed_password',
        full_name: 'Test Mechanic',
        role: 'MECHANIC'
      })
      .returning()
      .execute();
    testMechanicId = mechanicResult[0].id;
  });

  describe('createServiceOrder', () => {
    it('should create a service order with all fields', async () => {
      const input: CreateServiceOrderInput = {
        customer_id: testCustomerId,
        vehicle_id: testVehicleId,
        service_types: ['GENERAL_SERVICE', 'BRAKE_SERVICE'] as ServiceType[],
        complaints: 'Engine making strange noise',
        referral_source: 'Friend recommendation',
        body_defects: 'Minor scratches on door',
        other_defects: 'Dashboard light flickering',
        assigned_mechanic_id: testMechanicId,
        created_by_id: testUserId
      };

      const result = await createServiceOrder(input);

      expect(result.customer_id).toBe(testCustomerId);
      expect(result.vehicle_id).toBe(testVehicleId);
      expect(result.service_types).toEqual(['GENERAL_SERVICE', 'BRAKE_SERVICE']);
      expect(result.complaints).toBe('Engine making strange noise');
      expect(result.referral_source).toBe('Friend recommendation');
      expect(result.body_defects).toBe('Minor scratches on door');
      expect(result.other_defects).toBe('Dashboard light flickering');
      expect(result.assigned_mechanic_id).toBe(testMechanicId);
      expect(result.created_by_id).toBe(testUserId);
      expect(result.status).toBe('PENDING_INITIAL_CHECK');
      expect(result.order_number).toMatch(/^PKB-\d+$/);
      expect(result.id).toBeDefined();
      expect(result.created_at).toBeInstanceOf(Date);
    });

    it('should create service order without optional fields', async () => {
      const input: CreateServiceOrderInput = {
        customer_id: testCustomerId,
        vehicle_id: testVehicleId,
        service_types: ['ENGINE_SERVICE'] as ServiceType[],
        complaints: 'Oil change needed',
        created_by_id: testUserId
      };

      const result = await createServiceOrder(input);

      expect(result.customer_id).toBe(testCustomerId);
      expect(result.service_types).toEqual(['ENGINE_SERVICE']);
      expect(result.complaints).toBe('Oil change needed');
      expect(result.referral_source).toBeNull();
      expect(result.body_defects).toBeNull();
      expect(result.other_defects).toBeNull();
      expect(result.assigned_mechanic_id).toBeNull();
    });

    it('should generate unique order numbers', async () => {
      const input: CreateServiceOrderInput = {
        customer_id: testCustomerId,
        vehicle_id: testVehicleId,
        service_types: ['GENERAL_SERVICE'] as ServiceType[],
        complaints: 'Test complaint',
        created_by_id: testUserId
      };

      const result1 = await createServiceOrder(input);
      const result2 = await createServiceOrder(input);

      expect(result1.order_number).not.toBe(result2.order_number);
      expect(result1.order_number).toMatch(/^PKB-\d+$/);
      expect(result2.order_number).toMatch(/^PKB-\d+$/);
    });

    it('should save service order to database', async () => {
      const input: CreateServiceOrderInput = {
        customer_id: testCustomerId,
        vehicle_id: testVehicleId,
        service_types: ['TIRE_SERVICE'] as ServiceType[],
        complaints: 'Tire pressure check',
        created_by_id: testUserId
      };

      const result = await createServiceOrder(input);

      const saved = await db.select()
        .from(serviceOrdersTable)
        .where(eq(serviceOrdersTable.id, result.id))
        .execute();

      expect(saved).toHaveLength(1);
      expect(saved[0].customer_id).toBe(testCustomerId);
      expect(saved[0].complaints).toBe('Tire pressure check');
      expect(saved[0].service_types).toEqual(['TIRE_SERVICE']); // JSONB field returns array directly
    });

    it('should throw error for non-existent customer', async () => {
      const input: CreateServiceOrderInput = {
        customer_id: 99999,
        vehicle_id: testVehicleId,
        service_types: ['GENERAL_SERVICE'] as ServiceType[],
        complaints: 'Test complaint',
        created_by_id: testUserId
      };

      expect(createServiceOrder(input)).rejects.toThrow(/customer not found/i);
    });

    it('should throw error for vehicle not belonging to customer', async () => {
      // Create another customer
      const otherCustomer = await db.insert(customersTable)
        .values({
          name: 'Other Customer',
          phone: '08987654321'
        })
        .returning()
        .execute();

      const input: CreateServiceOrderInput = {
        customer_id: otherCustomer[0].id,
        vehicle_id: testVehicleId, // belongs to testCustomerId
        service_types: ['GENERAL_SERVICE'] as ServiceType[],
        complaints: 'Test complaint',
        created_by_id: testUserId
      };

      expect(createServiceOrder(input)).rejects.toThrow(/vehicle not found or does not belong to customer/i);
    });

    it('should throw error for non-existent mechanic', async () => {
      const input: CreateServiceOrderInput = {
        customer_id: testCustomerId,
        vehicle_id: testVehicleId,
        service_types: ['GENERAL_SERVICE'] as ServiceType[],
        complaints: 'Test complaint',
        assigned_mechanic_id: 99999,
        created_by_id: testUserId
      };

      expect(createServiceOrder(input)).rejects.toThrow(/assigned mechanic not found/i);
    });
  });

  describe('getServiceOrders', () => {
    it('should return all service orders', async () => {
      // Create test service orders
      await createServiceOrder({
        customer_id: testCustomerId,
        vehicle_id: testVehicleId,
        service_types: ['GENERAL_SERVICE'] as ServiceType[],
        complaints: 'First order',
        created_by_id: testUserId
      });

      await createServiceOrder({
        customer_id: testCustomerId,
        vehicle_id: testVehicleId,
        service_types: ['BRAKE_SERVICE'] as ServiceType[],
        complaints: 'Second order',
        created_by_id: testUserId
      });

      const results = await getServiceOrders();

      expect(results).toHaveLength(2);
      expect(results[0].complaints).toBe('Second order'); // Latest first
      expect(results[1].complaints).toBe('First order');
    });

    it('should return empty array when no orders exist', async () => {
      const results = await getServiceOrders();
      expect(results).toHaveLength(0);
    });
  });

  describe('getServiceOrderById', () => {
    it('should return service order by id', async () => {
      const created = await createServiceOrder({
        customer_id: testCustomerId,
        vehicle_id: testVehicleId,
        service_types: ['AC_SERVICE'] as ServiceType[],
        complaints: 'AC not working',
        created_by_id: testUserId
      });

      const result = await getServiceOrderById(created.id);

      expect(result).not.toBeNull();
      expect(result!.id).toBe(created.id);
      expect(result!.complaints).toBe('AC not working');
      expect(result!.service_types).toEqual(['AC_SERVICE']);
    });

    it('should return null for non-existent id', async () => {
      const result = await getServiceOrderById(99999);
      expect(result).toBeNull();
    });
  });

  describe('updateServiceOrderStatus', () => {
    it('should update service order status', async () => {
      const created = await createServiceOrder({
        customer_id: testCustomerId,
        vehicle_id: testVehicleId,
        service_types: ['ELECTRICAL_SERVICE'] as ServiceType[],
        complaints: 'Electrical issue',
        created_by_id: testUserId
      });

      const result = await updateServiceOrderStatus(created.id, 'TECHNICAL_ANALYSIS');

      expect(result.id).toBe(created.id);
      expect(result.status).toBe('TECHNICAL_ANALYSIS');
      expect(result.updated_at).toBeInstanceOf(Date);
    });

    it('should throw error for non-existent service order', async () => {
      expect(updateServiceOrderStatus(99999, 'COMPLETED')).rejects.toThrow(/service order not found/i);
    });
  });

  describe('getServiceOrdersByMechanic', () => {
    it('should return orders assigned to mechanic', async () => {
      await createServiceOrder({
        customer_id: testCustomerId,
        vehicle_id: testVehicleId,
        service_types: ['TRANSMISSION_SERVICE'] as ServiceType[],
        complaints: 'Transmission repair',
        assigned_mechanic_id: testMechanicId,
        created_by_id: testUserId
      });

      await createServiceOrder({
        customer_id: testCustomerId,
        vehicle_id: testVehicleId,
        service_types: ['BODY_WORK'] as ServiceType[],
        complaints: 'Body repair',
        created_by_id: testUserId
      });

      const results = await getServiceOrdersByMechanic(testMechanicId);

      expect(results).toHaveLength(1);
      expect(results[0].complaints).toBe('Transmission repair');
      expect(results[0].assigned_mechanic_id).toBe(testMechanicId);
    });

    it('should throw error for non-existent mechanic', async () => {
      expect(getServiceOrdersByMechanic(99999)).rejects.toThrow(/mechanic not found/i);
    });
  });

  describe('getServiceOrdersByStatus', () => {
    it('should return orders with specific status', async () => {
      const order1 = await createServiceOrder({
        customer_id: testCustomerId,
        vehicle_id: testVehicleId,
        service_types: ['GENERAL_SERVICE'] as ServiceType[],
        complaints: 'First order',
        created_by_id: testUserId
      });

      await updateServiceOrderStatus(order1.id, 'WORK_IN_PROGRESS');

      await createServiceOrder({
        customer_id: testCustomerId,
        vehicle_id: testVehicleId,
        service_types: ['BRAKE_SERVICE'] as ServiceType[],
        complaints: 'Second order',
        created_by_id: testUserId
      });

      const pendingOrders = await getServiceOrdersByStatus('PENDING_INITIAL_CHECK');
      const inProgressOrders = await getServiceOrdersByStatus('WORK_IN_PROGRESS');

      expect(pendingOrders).toHaveLength(1);
      expect(pendingOrders[0].complaints).toBe('Second order');
      expect(inProgressOrders).toHaveLength(1);
      expect(inProgressOrders[0].complaints).toBe('First order');
    });
  });
});
