
import { db } from '../db';
import { serviceOrdersTable, paymentsTable } from '../db/schema';
import { type DashboardStats } from '../schema';
import { eq, sql } from 'drizzle-orm';

export async function getDashboardStats(): Promise<DashboardStats> {
  try {
    // Get total orders count
    const totalOrdersResult = await db.select({
      count: sql<number>`count(*)`
    })
    .from(serviceOrdersTable)
    .execute();

    const total_orders = Number(totalOrdersResult[0]?.count || 0);

    // Get orders in progress count (not completed or cancelled)
    const ordersInProgressResult = await db.select({
      count: sql<number>`count(*)`
    })
    .from(serviceOrdersTable)
    .where(sql`${serviceOrdersTable.status} NOT IN ('COMPLETED', 'CANCELLED')`)
    .execute();

    const orders_in_progress = Number(ordersInProgressResult[0]?.count || 0);

    // Get completed orders count
    const completedOrdersResult = await db.select({
      count: sql<number>`count(*)`
    })
    .from(serviceOrdersTable)
    .where(eq(serviceOrdersTable.status, 'COMPLETED'))
    .execute();

    const completed_orders = Number(completedOrdersResult[0]?.count || 0);

    // Get pending payments count (payment status = 'PENDING')
    const pendingPaymentsResult = await db.select({
      count: sql<number>`count(*)`
    })
    .from(paymentsTable)
    .where(eq(paymentsTable.payment_status, 'PENDING'))
    .execute();

    const pending_payments = Number(pendingPaymentsResult[0]?.count || 0);

    // Get total revenue from paid payments
    const totalRevenueResult = await db.select({
      sum: sql<string>`coalesce(sum(${paymentsTable.amount}), 0)`
    })
    .from(paymentsTable)
    .where(eq(paymentsTable.payment_status, 'PAID'))
    .execute();

    const total_revenue = parseFloat(totalRevenueResult[0]?.sum || '0');

    // Calculate average completion time (in days) for completed orders
    const avgCompletionResult = await db.select({
      avg_days: sql<string>`coalesce(avg(extract(epoch from (${serviceOrdersTable.updated_at} - ${serviceOrdersTable.created_at})) / 86400), 0)`
    })
    .from(serviceOrdersTable)
    .where(eq(serviceOrdersTable.status, 'COMPLETED'))
    .execute();

    const avg_completion_time = parseFloat(avgCompletionResult[0]?.avg_days || '0');

    return {
      total_orders,
      orders_in_progress,
      completed_orders,
      pending_payments,
      total_revenue,
      avg_completion_time
    };
  } catch (error) {
    console.error('Dashboard stats retrieval failed:', error);
    throw error;
  }
}
