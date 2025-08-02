
import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import all schemas
import { 
  loginInputSchema,
  createUserInputSchema,
  updateUserInputSchema,
  createCustomerInputSchema,
  createVehicleInputSchema,
  createServiceOrderInputSchema,
  createInitialCheckInputSchema,
  createTechnicalAnalysisInputSchema,
  createCustomerEducationInputSchema,
  createCostEstimationInputSchema,
  createWorkExecutionInputSchema,
  createQualityControlInputSchema,
  createPaymentInputSchema,
  createAnalysisTemplateInputSchema,
  createEstimationLibraryInputSchema
} from './schema';

// Import all handlers
import { login, validateToken } from './handlers/auth';
import { createUser, updateUser, getUsers, getUserById, deleteUser } from './handlers/user_management';
import { createCustomer, getCustomers, getCustomerById, searchCustomers } from './handlers/customer_management';
import { createVehicle, getVehiclesByCustomer, getVehicleById } from './handlers/vehicle_management';
import { 
  createServiceOrder, 
  getServiceOrders, 
  getServiceOrderById, 
  updateServiceOrderStatus,
  getServiceOrdersByMechanic,
  getServiceOrdersByStatus
} from './handlers/service_order_management';
import { createInitialCheck, getInitialCheckByServiceOrder, updateInitialCheck } from './handlers/initial_check';
import { createTechnicalAnalysis, getTechnicalAnalysisByServiceOrder, updateTechnicalAnalysis } from './handlers/technical_analysis';
import { createCustomerEducation, getCustomerEducationByServiceOrder, updateCustomerEducation } from './handlers/customer_education';
import { createCostEstimation, getCostEstimationByServiceOrder, updateCostEstimation } from './handlers/cost_estimation';
import { 
  createWorkExecution, 
  getWorkExecutionByServiceOrder, 
  updateWorkExecution, 
  completeWorkExecution 
} from './handlers/work_execution';
import { 
  createQualityControl, 
  getQualityControlByServiceOrder, 
  updateQualityControl,
  getQualityControlQueue
} from './handlers/quality_control';
import { createPayment, getPaymentByServiceOrder, updatePaymentStatus, generateInvoice } from './handlers/payment_processing';
import { 
  createAnalysisTemplate, 
  getAnalysisTemplates, 
  getAnalysisTemplatesByServiceType,
  updateAnalysisTemplate,
  deleteAnalysisTemplate
} from './handlers/analysis_templates';
import { 
  createEstimationLibraryItem,
  getEstimationLibrary,
  getEstimationLibraryByCategory,
  getEstimationLibraryServices,
  getEstimationLibraryParts,
  updateEstimationLibraryItem,
  deleteEstimationLibraryItem
} from './handlers/estimation_library';
import { 
  getOwnerDashboardMetrics,
  getMechanicDashboardData,
  getAdminDashboardData,
  getKabengDashboardData,
  getPlannerDashboardData
} from './handlers/dashboard_data';
import { 
  sendServiceUpdate,
  sendEstimateMessage,
  sendInvoiceMessage,
  sendThankYouMessage,
  getWhatsAppTemplates,
  createWhatsAppTemplate
} from './handlers/whatsapp_integration';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // Authentication
  login: publicProcedure
    .input(loginInputSchema)
    .mutation(({ input }) => login(input)),

  // User Management
  createUser: publicProcedure
    .input(createUserInputSchema)
    .mutation(({ input }) => createUser(input)),
  
  updateUser: publicProcedure
    .input(updateUserInputSchema)
    .mutation(({ input }) => updateUser(input)),
  
  getUsers: publicProcedure
    .query(() => getUsers()),
  
  getUserById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => getUserById(input.id)),
  
  deleteUser: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => deleteUser(input.id)),

  // Customer Management
  createCustomer: publicProcedure
    .input(createCustomerInputSchema)
    .mutation(({ input }) => createCustomer(input)),
  
  getCustomers: publicProcedure
    .query(() => getCustomers()),
  
  getCustomerById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => getCustomerById(input.id)),
  
  searchCustomers: publicProcedure
    .input(z.object({ query: z.string() }))
    .query(({ input }) => searchCustomers(input.query)),

  // Vehicle Management
  createVehicle: publicProcedure
    .input(createVehicleInputSchema)
    .mutation(({ input }) => createVehicle(input)),
  
  getVehiclesByCustomer: publicProcedure
    .input(z.object({ customerId: z.number() }))
    .query(({ input }) => getVehiclesByCustomer(input.customerId)),
  
  getVehicleById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => getVehicleById(input.id)),

  // Service Order Management
  createServiceOrder: publicProcedure
    .input(createServiceOrderInputSchema)
    .mutation(({ input }) => createServiceOrder(input, 1)), // TODO: Get user ID from context
  
  getServiceOrders: publicProcedure
    .query(() => getServiceOrders()),
  
  getServiceOrderById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => getServiceOrderById(input.id)),
  
  updateServiceOrderStatus: publicProcedure
    .input(z.object({ id: z.number(), status: z.string() }))
    .mutation(({ input }) => updateServiceOrderStatus(input.id, input.status)),
  
  getServiceOrdersByMechanic: publicProcedure
    .input(z.object({ mechanicId: z.number() }))
    .query(({ input }) => getServiceOrdersByMechanic(input.mechanicId)),
  
  getServiceOrdersByStatus: publicProcedure
    .input(z.object({ status: z.string() }))
    .query(({ input }) => getServiceOrdersByStatus(input.status)),

  // Initial Check
  createInitialCheck: publicProcedure
    .input(createInitialCheckInputSchema)
    .mutation(({ input }) => createInitialCheck(input, 1)), // TODO: Get mechanic ID from context
  
  getInitialCheckByServiceOrder: publicProcedure
    .input(z.object({ serviceOrderId: z.number() }))
    .query(({ input }) => getInitialCheckByServiceOrder(input.serviceOrderId)),
  
  updateInitialCheck: publicProcedure
    .input(z.object({ id: z.number(), data: createInitialCheckInputSchema.partial() }))
    .mutation(({ input }) => updateInitialCheck(input.id, input.data)),

  // Technical Analysis
  createTechnicalAnalysis: publicProcedure
    .input(createTechnicalAnalysisInputSchema)
    .mutation(({ input }) => createTechnicalAnalysis(input, 1)), // TODO: Get mechanic ID from context
  
  getTechnicalAnalysisByServiceOrder: publicProcedure
    .input(z.object({ serviceOrderId: z.number() }))
    .query(({ input }) => getTechnicalAnalysisByServiceOrder(input.serviceOrderId)),
  
  updateTechnicalAnalysis: publicProcedure
    .input(z.object({ id: z.number(), data: createTechnicalAnalysisInputSchema.partial() }))
    .mutation(({ input }) => updateTechnicalAnalysis(input.id, input.data)),

  // Customer Education
  createCustomerEducation: publicProcedure
    .input(createCustomerEducationInputSchema)
    .mutation(({ input }) => createCustomerEducation(input, 1)), // TODO: Get educator ID from context
  
  getCustomerEducationByServiceOrder: publicProcedure
    .input(z.object({ serviceOrderId: z.number() }))
    .query(({ input }) => getCustomerEducationByServiceOrder(input.serviceOrderId)),
  
  updateCustomerEducation: publicProcedure
    .input(z.object({ id: z.number(), data: createCustomerEducationInputSchema.partial() }))
    .mutation(({ input }) => updateCustomerEducation(input.id, input.data)),

  // Cost Estimation
  createCostEstimation: publicProcedure
    .input(createCostEstimationInputSchema)
    .mutation(({ input }) => createCostEstimation(input, 1)), // TODO: Get estimator ID from context
  
  getCostEstimationByServiceOrder: publicProcedure
    .input(z.object({ serviceOrderId: z.number() }))
    .query(({ input }) => getCostEstimationByServiceOrder(input.serviceOrderId)),
  
  updateCostEstimation: publicProcedure
    .input(z.object({ id: z.number(), data: createCostEstimationInputSchema.partial() }))
    .mutation(({ input }) => updateCostEstimation(input.id, input.data)),

  // Work Execution
  createWorkExecution: publicProcedure
    .input(createWorkExecutionInputSchema)
    .mutation(({ input }) => createWorkExecution(input, 1)), // TODO: Get mechanic ID from context
  
  getWorkExecutionByServiceOrder: publicProcedure
    .input(z.object({ serviceOrderId: z.number() }))
    .query(({ input }) => getWorkExecutionByServiceOrder(input.serviceOrderId)),
  
  updateWorkExecution: publicProcedure
    .input(z.object({ id: z.number(), data: createWorkExecutionInputSchema.partial() }))
    .mutation(({ input }) => updateWorkExecution(input.id, input.data)),
  
  completeWorkExecution: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => completeWorkExecution(input.id)),

  // Quality Control
  createQualityControl: publicProcedure
    .input(createQualityControlInputSchema)
    .mutation(({ input }) => createQualityControl(input, 1)), // TODO: Get inspector ID from context
  
  getQualityControlByServiceOrder: publicProcedure
    .input(z.object({ serviceOrderId: z.number() }))
    .query(({ input }) => getQualityControlByServiceOrder(input.serviceOrderId)),
  
  updateQualityControl: publicProcedure
    .input(z.object({ id: z.number(), data: createQualityControlInputSchema.partial() }))
    .mutation(({ input }) => updateQualityControl(input.id, input.data)),
  
  getQualityControlQueue: publicProcedure
    .query(() => getQualityControlQueue()),

  // Payment Processing
  createPayment: publicProcedure
    .input(createPaymentInputSchema)
    .mutation(({ input }) => createPayment(input, 1)), // TODO: Get processor ID from context
  
  getPaymentByServiceOrder: publicProcedure
    .input(z.object({ serviceOrderId: z.number() }))
    .query(({ input }) => getPaymentByServiceOrder(input.serviceOrderId)),
  
  updatePaymentStatus: publicProcedure
    .input(z.object({ id: z.number(), status: z.string(), paidAmount: z.number().optional() }))
    .mutation(({ input }) => updatePaymentStatus(input.id, input.status, input.paidAmount)),
  
  generateInvoice: publicProcedure
    .input(z.object({ serviceOrderId: z.number() }))
    .mutation(({ input }) => generateInvoice(input.serviceOrderId)),

  // Analysis Templates
  createAnalysisTemplate: publicProcedure
    .input(createAnalysisTemplateInputSchema)
    .mutation(({ input }) => createAnalysisTemplate(input, 1)), // TODO: Get creator ID from context
  
  getAnalysisTemplates: publicProcedure
    .query(() => getAnalysisTemplates()),
  
  getAnalysisTemplatesByServiceType: publicProcedure
    .input(z.object({ serviceType: z.string() }))
    .query(({ input }) => getAnalysisTemplatesByServiceType(input.serviceType)),
  
  updateAnalysisTemplate: publicProcedure
    .input(z.object({ id: z.number(), data: createAnalysisTemplateInputSchema.partial() }))
    .mutation(({ input }) => updateAnalysisTemplate(input.id, input.data)),
  
  deleteAnalysisTemplate: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => deleteAnalysisTemplate(input.id)),

  // Estimation Library
  createEstimationLibraryItem: publicProcedure
    .input(createEstimationLibraryInputSchema)
    .mutation(({ input }) => createEstimationLibraryItem(input)),
  
  getEstimationLibrary: publicProcedure
    .query(() => getEstimationLibrary()),
  
  getEstimationLibraryByCategory: publicProcedure
    .input(z.object({ category: z.string() }))
    .query(({ input }) => getEstimationLibraryByCategory(input.category)),
  
  getEstimationLibraryServices: publicProcedure
    .query(() => getEstimationLibraryServices()),
  
  getEstimationLibraryParts: publicProcedure
    .query(() => getEstimationLibraryParts()),
  
  updateEstimationLibraryItem: publicProcedure
    .input(z.object({ id: z.number(), data: createEstimationLibraryInputSchema.partial() }))
    .mutation(({ input }) => updateEstimationLibraryItem(input.id, input.data)),
  
  deleteEstimationLibraryItem: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => deleteEstimationLibraryItem(input.id)),

  // Dashboard Data
  getOwnerDashboardMetrics: publicProcedure
    .query(() => getOwnerDashboardMetrics()),
  
  getMechanicDashboardData: publicProcedure
    .input(z.object({ mechanicId: z.number() }))
    .query(({ input }) => getMechanicDashboardData(input.mechanicId)),
  
  getAdminDashboardData: publicProcedure
    .query(() => getAdminDashboardData()),
  
  getKabengDashboardData: publicProcedure
    .query(() => getKabengDashboardData()),
  
  getPlannerDashboardData: publicProcedure
    .query(() => getPlannerDashboardData()),

  // WhatsApp Integration
  sendServiceUpdate: publicProcedure
    .input(z.object({ serviceOrderId: z.number(), message: z.string() }))
    .mutation(({ input }) => sendServiceUpdate(input.serviceOrderId, input.message)),
  
  sendEstimateMessage: publicProcedure
    .input(z.object({ serviceOrderId: z.number(), estimationData: z.any() }))
    .mutation(({ input }) => sendEstimateMessage(input.serviceOrderId, input.estimationData)),
  
  sendInvoiceMessage: publicProcedure
    .input(z.object({ serviceOrderId: z.number(), invoiceUrl: z.string() }))
    .mutation(({ input }) => sendInvoiceMessage(input.serviceOrderId, input.invoiceUrl)),
  
  sendThankYouMessage: publicProcedure
    .input(z.object({ serviceOrderId: z.number(), template: z.string().optional() }))
    .mutation(({ input }) => sendThankYouMessage(input.serviceOrderId, input.template)),
  
  getWhatsAppTemplates: publicProcedure
    .query(() => getWhatsAppTemplates()),
  
  createWhatsAppTemplate: publicProcedure
    .input(z.object({ name: z.string(), content: z.string() }))
    .mutation(({ input }) => createWhatsAppTemplate(input.name, input.content)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`Workshop Management TRPC server listening at port: ${port}`);
}

start();
