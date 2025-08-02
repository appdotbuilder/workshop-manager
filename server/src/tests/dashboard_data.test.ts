
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, customersTable, vehiclesTable, serviceOrdersTable, paymentsTable } from '../db/schema';
import { 
  getOwnerDashboardMetrics, 
  getMechanicDashboardData, 
  getAdminDashboardData,
  getKabengDashboardData,
  getPlannerDashboardData
} from '../handlers/dashboard_data';

describe('Dashboard Data Handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  describe('getOwnerDashboardMetrics', () => {
    it('should return default metrics when no data exists', async () => {
      const metrics = await getOwnerDashboardMetrics();

      expect(metrics.totalBookings).toBe(0);
      expect(metrics.totalRevenue).toBe(0);
      expect(metrics.activeServiceOrders).toBe(0);
      expect(metrics.completedToday).toBe(0);
      expect(metrics.pendingQC).toBe(0);
      expect(metrics.pendingPayment).toBe(0);
    });

    it('should calculate metrics with real data', async () => {
      // Create test user
      const userResult = await db.insert(usersTable).values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        full_name: 'Test User',
        role: 'MECHANIC'
      }).returning().execute();
      const userId = userResult[0].id;

      // Create test customer
      const customerResult = await db.insert(customersTable).values({
        name: 'Test Customer',
        phone: '1234567890',
        email: 'customer@example.com'
      }).returning().execute();
      const customerId = customerResult[0].id;

      // Create test vehicle
      const vehicleResult = await db.insert(vehiclesTable).values({
        customer_id: customerId,
        make: 'Toyota',
        model: 'Camry',
        year: 2020,
        license_plate: 'ABC123'
      }).returning().execute();
      const vehicleId = vehicleResult[0].id;

      // Create test service orders
      await db.insert(serviceOrdersTable).values([
        {
          order_number: 'SO-001',
          customer_id: customerId,
          vehicle_id: vehicleId,
          service_types: JSON.stringify(['GENERAL_SERVICE']),
          complaints: 'Test complaint 1',
          created_by_id: userId,
          status: 'COMPLETED'
        },
        {
          order_number: 'SO-002',
          customer_id: customerId,
          vehicle_id: vehicleId,
          service_types: JSON.stringify(['BRAKE_SERVICE']),
          complaints: 'Test complaint 2',
          created_by_id: userId,
          status: 'WORK_IN_PROGRESS'
        },
        {
          order_number: 'SO-003',
          customer_id: customerId,
          vehicle_id: vehicleId,
          service_types: JSON.stringify(['ENGINE_SERVICE']),
          complaints: 'Test complaint 3',
          created_by_id: userId,
          status: 'QUALITY_CONTROL'
        }
      ]).execute();

      // Get service order IDs for payments
      const orders = await db.select().from(serviceOrdersTable).execute();
      const completedOrderId = orders.find(o => o.status === 'COMPLETED')?.id;

      // Create test payment
      if (completedOrderId) {
        await db.insert(paymentsTable).values({
          service_order_id: completedOrderId,
          amount: '250.00',
          payment_method: 'cash',
          payment_status: 'PAID',
          created_by_id: userId
        }).execute();
      }

      const metrics = await getOwnerDashboardMetrics();

      expect(metrics.totalBookings).toBe(3);
      expect(metrics.totalRevenue).toBe(250);
      expect(metrics.pendingQC).toBe(1);
    });
  });

  describe('getMechanicDashboardData', () => {
    it('should return zero counts for non-existent mechanic', async () => {
      const data = await getMechanicDashboardData(999);

      expect(data.inProgress).toBe(0);
      expect(data.pendingQC).toBe(0);
      expect(data.paymentPending).toBe(0);
      expect(data.newRequests).toBe(0);
    });

    it('should count orders for specific mechanic', async () => {
      // Create test user
      const userResult = await db.insert(usersTable).values({
        username: 'mechanic1',
        email: 'mechanic@example.com',
        password_hash: 'hashedpassword',
        full_name: 'Test Mechanic',
        role: 'MECHANIC'
      }).returning().execute();
      const mechanicId = userResult[0].id;

      // Create test customer and vehicle
      const customerResult = await db.insert(customersTable).values({
        name: 'Test Customer',
        phone: '1234567890'
      }).returning().execute();
      const customerId = customerResult[0].id;

      const vehicleResult = await db.insert(vehiclesTable).values({
        customer_id: customerId,
        make: 'Honda',
        model: 'Civic',
        year: 2019,
        license_plate: 'XYZ789'
      }).returning().execute();
      const vehicleId = vehicleResult[0].id;

      // Create service orders assigned to mechanic
      await db.insert(serviceOrdersTable).values([
        {
          order_number: 'SO-M001',
          customer_id: customerId,
          vehicle_id: vehicleId,
          service_types: JSON.stringify(['GENERAL_SERVICE']),
          complaints: 'Test complaint',
          assigned_mechanic_id: mechanicId,
          created_by_id: mechanicId,
          status: 'WORK_IN_PROGRESS'
        },
        {
          order_number: 'SO-M002',
          customer_id: customerId,
          vehicle_id: vehicleId,
          service_types: JSON.stringify(['BRAKE_SERVICE']),
          complaints: 'Test complaint',
          assigned_mechanic_id: mechanicId,
          created_by_id: mechanicId,
          status: 'QUALITY_CONTROL'
        },
        {
          order_number: 'SO-M003',
          customer_id: customerId,
          vehicle_id: vehicleId,
          service_types: JSON.stringify(['ENGINE_SERVICE']),
          complaints: 'Test complaint',
          assigned_mechanic_id: mechanicId,
          created_by_id: mechanicId,
          status: 'PENDING_INITIAL_CHECK'
        }
      ]).execute();

      const data = await getMechanicDashboardData(mechanicId);

      expect(data.inProgress).toBe(1);
      expect(data.pendingQC).toBe(1);
      expect(data.newRequests).toBe(1);
      expect(data.paymentPending).toBe(0);
    });
  });

  describe('getAdminDashboardData', () => {
    it('should return system metrics', async () => {
      // Create test users
      await db.insert(usersTable).values([
        {
          username: 'admin1',
          email: 'admin@example.com',
          password_hash: 'hashedpassword',
          full_name: 'Admin User',
          role: 'ADMIN',
          is_active: true
        },
        {
          username: 'mechanic1',
          email: 'mechanic@example.com',
          password_hash: 'hashedpassword',
          full_name: 'Mechanic User',
          role: 'MECHANIC',
          is_active: false
        }
      ]).execute();

      const data = await getAdminDashboardData();

      expect(data.totalUsers).toBe(2);
      expect(data.activeUsers).toBe(1);
      expect(data.totalServiceOrders).toBe(0);
      expect(data.revenueThisMonth).toBe(0);
      expect(data.systemHealth.ordersInProgress).toBe(0);
      expect(data.systemHealth.pendingApprovals).toBe(0);
      expect(data.systemHealth.completionRate).toBe(0);
    });
  });

  describe('getKabengDashboardData', () => {
    it('should return workflow monitoring data', async () => {
      const data = await getKabengDashboardData();

      expect(data.workflowMonitoring.ordersInProgress).toBe(0);
      expect(data.workflowMonitoring.qualityControlQueue).toBe(0);
      expect(data.workflowMonitoring.averageCompletionTime).toBe(2.5);
      expect(data.performanceMetrics.completedToday).toBe(0);
      expect(data.performanceMetrics.pendingEducation).toBe(0);
      expect(data.performanceMetrics.pendingEstimation).toBe(0);
    });

    it('should count workflow states correctly', async () => {
      // Create test data
      const userResult = await db.insert(usersTable).values({
        username: 'kabeng1',
        email: 'kabeng@example.com',
        password_hash: 'hashedpassword',
        full_name: 'Kabeng User',
        role: 'KABENG'
      }).returning().execute();
      const userId = userResult[0].id;

      const customerResult = await db.insert(customersTable).values({
        name: 'Test Customer',
        phone: '1234567890'
      }).returning().execute();
      const customerId = customerResult[0].id;

      const vehicleResult = await db.insert(vehiclesTable).values({
        customer_id: customerId,
        make: 'Ford',
        model: 'Focus',
        year: 2018,
        license_plate: 'KAB123'
      }).returning().execute();
      const vehicleId = vehicleResult[0].id;

      // Create orders in different workflow states
      await db.insert(serviceOrdersTable).values([
        {
          order_number: 'SO-K001',
          customer_id: customerId,
          vehicle_id: vehicleId,
          service_types: JSON.stringify(['GENERAL_SERVICE']),
          complaints: 'Test complaint',
          created_by_id: userId,
          status: 'WORK_IN_PROGRESS'
        },
        {
          order_number: 'SO-K002',
          customer_id: customerId,
          vehicle_id: vehicleId,
          service_types: JSON.stringify(['BRAKE_SERVICE']),
          complaints: 'Test complaint',
          created_by_id: userId,
          status: 'CUSTOMER_EDUCATION'
        }
      ]).execute();

      const data = await getKabengDashboardData();

      expect(data.workflowMonitoring.ordersInProgress).toBe(1);
      expect(data.performanceMetrics.pendingEducation).toBe(1);
    });
  });

  describe('getPlannerDashboardData', () => {
    it('should return planning metrics', async () => {
      const data = await getPlannerDashboardData();

      expect(data.planningData.rejectedEstimations).toBe(0);
      expect(data.planningData.rePlanningTasks).toBe(0);
      expect(data.planningData.serviceHistoryAnalysis.mostCommonServices).toEqual([
        'GENERAL_SERVICE', 
        'BRAKE_SERVICE', 
        'ENGINE_SERVICE'
      ]);
      expect(typeof data.planningData.serviceHistoryAnalysis.averageOrderValue).toBe('number');
    });

    it('should calculate average order value correctly', async () => {
      // Create test data for payments
      const userResult = await db.insert(usersTable).values({
        username: 'planner1',
        email: 'planner@example.com',
        password_hash: 'hashedpassword',
        full_name: 'Planner User',
        role: 'PLANNER'
      }).returning().execute();
      const userId = userResult[0].id;

      const customerResult = await db.insert(customersTable).values({
        name: 'Test Customer',
        phone: '1234567890'
      }).returning().execute();
      const customerId = customerResult[0].id;

      const vehicleResult = await db.insert(vehiclesTable).values({
        customer_id: customerId,
        make: 'BMW',
        model: 'X5',
        year: 2021,
        license_plate: 'PLAN123'
      }).returning().execute();
      const vehicleId = vehicleResult[0].id;

      const orderResult = await db.insert(serviceOrdersTable).values({
        order_number: 'SO-P001',
        customer_id: customerId,
        vehicle_id: vehicleId,
        service_types: JSON.stringify(['GENERAL_SERVICE']),
        complaints: 'Test complaint',
        created_by_id: userId,
        status: 'COMPLETED'
      }).returning().execute();
      const orderId = orderResult[0].id;

      // Create payments
      await db.insert(paymentsTable).values([
        {
          service_order_id: orderId,
          amount: '300.00',
          payment_method: 'card',
          payment_status: 'PAID',
          created_by_id: userId
        },
        {
          service_order_id: orderId,
          amount: '200.00',
          payment_method: 'cash',
          payment_status: 'PAID',
          created_by_id: userId
        }
      ]).execute();

      const data = await getPlannerDashboardData();

      expect(data.planningData.serviceHistoryAnalysis.averageOrderValue).toBe(250); // (300 + 200) / 2
    });
  });
});
