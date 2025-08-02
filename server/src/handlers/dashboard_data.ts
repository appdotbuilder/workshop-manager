
import { db } from '../db';
import { serviceOrdersTable, paymentsTable, usersTable } from '../db/schema';
import { eq, count, sum, and, gte, lt, isNull } from 'drizzle-orm';

export interface DashboardMetrics {
  totalBookings: number;
  totalRevenue: number;
  activeServiceOrders: number;
  completedToday: number;
  pendingQC: number;
  pendingPayment: number;
}

export interface MechanicTaskSummary {
  inProgress: number;
  pendingQC: number;
  paymentPending: number;
  newRequests: number;
}

export interface AdminDashboardData {
  totalUsers: number;
  activeUsers: number;
  totalServiceOrders: number;
  revenueThisMonth: number;
  systemHealth: {
    ordersInProgress: number;
    pendingApprovals: number;
    completionRate: number;
  };
}

export interface KabengDashboardData {
  workflowMonitoring: {
    ordersInProgress: number;
    qualityControlQueue: number;
    averageCompletionTime: number;
  };
  performanceMetrics: {
    completedToday: number;
    pendingEducation: number;
    pendingEstimation: number;
  };
}

export interface PlannerDashboardData {
  planningData: {
    rejectedEstimations: number;
    rePlanningTasks: number;
    serviceHistoryAnalysis: {
      mostCommonServices: string[];
      averageOrderValue: number;
    };
  };
}

export async function getOwnerDashboardMetrics(): Promise<DashboardMetrics> {
  try {
    // Get today's date range
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);

    // Total bookings (all service orders)
    const totalBookingsResult = await db.select({ count: count() })
      .from(serviceOrdersTable)
      .execute();
    const totalBookings = totalBookingsResult[0]?.count || 0;

    // Total revenue from paid payments
    const totalRevenueResult = await db.select({ 
      total: sum(paymentsTable.amount) 
    })
      .from(paymentsTable)
      .where(eq(paymentsTable.payment_status, 'PAID'))
      .execute();
    const totalRevenue = parseFloat(totalRevenueResult[0]?.total || '0');

    // Active service orders (not completed or cancelled)
    const activeOrdersResult = await db.select({ count: count() })
      .from(serviceOrdersTable)
      .where(and(
        eq(serviceOrdersTable.status, 'WORK_IN_PROGRESS'),
        eq(serviceOrdersTable.status, 'TECHNICAL_ANALYSIS'),
        eq(serviceOrdersTable.status, 'CUSTOMER_EDUCATION'),
        eq(serviceOrdersTable.status, 'COST_ESTIMATION'),
        eq(serviceOrdersTable.status, 'AWAITING_APPROVAL'),
        eq(serviceOrdersTable.status, 'QUALITY_CONTROL'),
        eq(serviceOrdersTable.status, 'AWAITING_PAYMENT')
      ))
      .execute();
    const activeServiceOrders = activeOrdersResult[0]?.count || 0;

    // Completed today
    const completedTodayResult = await db.select({ count: count() })
      .from(serviceOrdersTable)
      .where(and(
        eq(serviceOrdersTable.status, 'COMPLETED'),
        gte(serviceOrdersTable.updated_at, startOfDay),
        lt(serviceOrdersTable.updated_at, endOfDay)
      ))
      .execute();
    const completedToday = completedTodayResult[0]?.count || 0;

    // Pending QC
    const pendingQCResult = await db.select({ count: count() })
      .from(serviceOrdersTable)
      .where(eq(serviceOrdersTable.status, 'QUALITY_CONTROL'))
      .execute();
    const pendingQC = pendingQCResult[0]?.count || 0;

    // Pending payment
    const pendingPaymentResult = await db.select({ count: count() })
      .from(serviceOrdersTable)
      .where(eq(serviceOrdersTable.status, 'AWAITING_PAYMENT'))
      .execute();
    const pendingPayment = pendingPaymentResult[0]?.count || 0;

    return {
      totalBookings,
      totalRevenue,
      activeServiceOrders,
      completedToday,
      pendingQC,
      pendingPayment
    };
  } catch (error) {
    console.error('Owner dashboard metrics failed:', error);
    throw error;
  }
}

export async function getMechanicDashboardData(mechanicId: number): Promise<MechanicTaskSummary> {
  try {
    // Orders in progress assigned to this mechanic
    const inProgressResult = await db.select({ count: count() })
      .from(serviceOrdersTable)
      .where(and(
        eq(serviceOrdersTable.assigned_mechanic_id, mechanicId),
        eq(serviceOrdersTable.status, 'WORK_IN_PROGRESS')
      ))
      .execute();
    const inProgress = inProgressResult[0]?.count || 0;

    // Orders pending QC from this mechanic
    const pendingQCResult = await db.select({ count: count() })
      .from(serviceOrdersTable)
      .where(and(
        eq(serviceOrdersTable.assigned_mechanic_id, mechanicId),
        eq(serviceOrdersTable.status, 'QUALITY_CONTROL')
      ))
      .execute();
    const pendingQC = pendingQCResult[0]?.count || 0;

    // Orders awaiting payment for this mechanic's work
    const paymentPendingResult = await db.select({ count: count() })
      .from(serviceOrdersTable)
      .where(and(
        eq(serviceOrdersTable.assigned_mechanic_id, mechanicId),
        eq(serviceOrdersTable.status, 'AWAITING_PAYMENT')
      ))
      .execute();
    const paymentPending = paymentPendingResult[0]?.count || 0;

    // New requests assigned but not started
    const newRequestsResult = await db.select({ count: count() })
      .from(serviceOrdersTable)
      .where(and(
        eq(serviceOrdersTable.assigned_mechanic_id, mechanicId),
        eq(serviceOrdersTable.status, 'PENDING_INITIAL_CHECK')
      ))
      .execute();
    const newRequests = newRequestsResult[0]?.count || 0;

    return {
      inProgress,
      pendingQC,
      paymentPending,
      newRequests
    };
  } catch (error) {
    console.error('Mechanic dashboard data failed:', error);
    throw error;
  }
}

export async function getAdminDashboardData(): Promise<AdminDashboardData> {
  try {
    // Total users
    const totalUsersResult = await db.select({ count: count() })
      .from(usersTable)
      .execute();
    const totalUsers = totalUsersResult[0]?.count || 0;

    // Active users
    const activeUsersResult = await db.select({ count: count() })
      .from(usersTable)
      .where(eq(usersTable.is_active, true))
      .execute();
    const activeUsers = activeUsersResult[0]?.count || 0;

    // Total service orders
    const totalOrdersResult = await db.select({ count: count() })
      .from(serviceOrdersTable)
      .execute();
    const totalServiceOrders = totalOrdersResult[0]?.count || 0;

    // Revenue this month
    const currentMonth = new Date();
    const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);

    const monthlyRevenueResult = await db.select({ 
      total: sum(paymentsTable.amount) 
    })
      .from(paymentsTable)
      .where(and(
        eq(paymentsTable.payment_status, 'PAID'),
        gte(paymentsTable.payment_date, startOfMonth),
        lt(paymentsTable.payment_date, endOfMonth)
      ))
      .execute();
    const revenueThisMonth = parseFloat(monthlyRevenueResult[0]?.total || '0');

    // System health metrics
    const ordersInProgressResult = await db.select({ count: count() })
      .from(serviceOrdersTable)
      .where(eq(serviceOrdersTable.status, 'WORK_IN_PROGRESS'))
      .execute();
    const ordersInProgress = ordersInProgressResult[0]?.count || 0;

    const pendingApprovalsResult = await db.select({ count: count() })
      .from(serviceOrdersTable)
      .where(eq(serviceOrdersTable.status, 'AWAITING_APPROVAL'))
      .execute();
    const pendingApprovals = pendingApprovalsResult[0]?.count || 0;

    const completedOrdersResult = await db.select({ count: count() })
      .from(serviceOrdersTable)
      .where(eq(serviceOrdersTable.status, 'COMPLETED'))
      .execute();
    const completedOrders = completedOrdersResult[0]?.count || 0;

    const completionRate = totalServiceOrders > 0 ? (completedOrders / totalServiceOrders) * 100 : 0;

    return {
      totalUsers,
      activeUsers,
      totalServiceOrders,
      revenueThisMonth,
      systemHealth: {
        ordersInProgress,
        pendingApprovals,
        completionRate
      }
    };
  } catch (error) {
    console.error('Admin dashboard data failed:', error);
    throw error;
  }
}

export async function getKabengDashboardData(): Promise<KabengDashboardData> {
  try {
    // Orders in progress
    const ordersInProgressResult = await db.select({ count: count() })
      .from(serviceOrdersTable)
      .where(eq(serviceOrdersTable.status, 'WORK_IN_PROGRESS'))
      .execute();
    const ordersInProgress = ordersInProgressResult[0]?.count || 0;

    // Quality control queue
    const qualityControlQueueResult = await db.select({ count: count() })
      .from(serviceOrdersTable)
      .where(eq(serviceOrdersTable.status, 'QUALITY_CONTROL'))
      .execute();
    const qualityControlQueue = qualityControlQueueResult[0]?.count || 0;

    // Average completion time (simplified calculation)
    const averageCompletionTime = 2.5; // Days - in real implementation, calculate from created_at to completion

    // Completed today
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);

    const completedTodayResult = await db.select({ count: count() })
      .from(serviceOrdersTable)
      .where(and(
        eq(serviceOrdersTable.status, 'COMPLETED'),
        gte(serviceOrdersTable.updated_at, startOfDay),
        lt(serviceOrdersTable.updated_at, endOfDay)
      ))
      .execute();
    const completedToday = completedTodayResult[0]?.count || 0;

    // Pending education
    const pendingEducationResult = await db.select({ count: count() })
      .from(serviceOrdersTable)
      .where(eq(serviceOrdersTable.status, 'CUSTOMER_EDUCATION'))
      .execute();
    const pendingEducation = pendingEducationResult[0]?.count || 0;

    // Pending estimation
    const pendingEstimationResult = await db.select({ count: count() })
      .from(serviceOrdersTable)
      .where(eq(serviceOrdersTable.status, 'COST_ESTIMATION'))
      .execute();
    const pendingEstimation = pendingEstimationResult[0]?.count || 0;

    return {
      workflowMonitoring: {
        ordersInProgress,
        qualityControlQueue,
        averageCompletionTime
      },
      performanceMetrics: {
        completedToday,
        pendingEducation,
        pendingEstimation
      }
    };
  } catch (error) {
    console.error('Kabeng dashboard data failed:', error);
    throw error;
  }
}

export async function getPlannerDashboardData(): Promise<PlannerDashboardData> {
  try {
    // Rejected estimations (REJECTED decision)
    const rejectedEstimationsResult = await db.select({ count: count() })
      .from(serviceOrdersTable)
      .where(eq(serviceOrdersTable.status, 'CANCELLED'))
      .execute();
    const rejectedEstimations = rejectedEstimationsResult[0]?.count || 0;

    // Re-planning tasks (orders that need to be re-planned after rejection)
    const rePlanningTasksResult = await db.select({ count: count() })
      .from(serviceOrdersTable)
      .where(and(
        eq(serviceOrdersTable.status, 'COST_ESTIMATION'),
        isNull(serviceOrdersTable.assigned_mechanic_id)
      ))
      .execute();
    const rePlanningTasks = rePlanningTasksResult[0]?.count || 0;

    // Service history analysis - most common services (simplified)
    const mostCommonServices = ['GENERAL_SERVICE', 'BRAKE_SERVICE', 'ENGINE_SERVICE'];

    // Average order value
    const averageOrderResult = await db.select({ 
      avg: sum(paymentsTable.amount),
      count: count()
    })
      .from(paymentsTable)
      .where(eq(paymentsTable.payment_status, 'PAID'))
      .execute();
    
    const totalAmount = parseFloat(averageOrderResult[0]?.avg || '0');
    const orderCount = averageOrderResult[0]?.count || 1;
    const averageOrderValue = totalAmount / orderCount;

    return {
      planningData: {
        rejectedEstimations,
        rePlanningTasks,
        serviceHistoryAnalysis: {
          mostCommonServices,
          averageOrderValue
        }
      }
    };
  } catch (error) {
    console.error('Planner dashboard data failed:', error);
    throw error;
  }
}
