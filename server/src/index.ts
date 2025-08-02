
import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import schemas
import {
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
  createEstimationLibraryInputSchema,
  createWhatsappTemplateInputSchema,
  updateWhatsappTemplateInputSchema,
  sendThankYouMessageInputSchema,
  loginInputSchema
} from './schema';

// Import handlers
import { loginUser } from './handlers/auth_login';
import { createUser } from './handlers/create_user';
import { getUsers } from './handlers/get_users';
import { updateUser } from './handlers/update_user';
import { createCustomer } from './handlers/create_customer';
import { getCustomers } from './handlers/get_customers';
import { createVehicle } from './handlers/create_vehicle';
import { getVehicles } from './handlers/get_vehicles';
import { createServiceOrder } from './handlers/create_service_order';
import { getServiceOrders } from './handlers/get_service_orders';
import { createInitialCheck } from './handlers/create_initial_check';
import { getInitialChecks } from './handlers/get_initial_checks';
import { createTechnicalAnalysis } from './handlers/create_technical_analysis';
import { getTechnicalAnalyses } from './handlers/get_technical_analyses';
import { createCustomerEducation } from './handlers/create_customer_education';
import { getCustomerEducations } from './handlers/get_customer_educations';
import { createCostEstimation } from './handlers/create_cost_estimation';
import { getCostEstimations } from './handlers/get_cost_estimations';
import { createWorkExecution } from './handlers/create_work_execution';
import { getWorkExecutions } from './handlers/get_work_executions';
import { createQualityControl } from './handlers/create_quality_control';
import { getQualityControls } from './handlers/get_quality_controls';
import { createPayment } from './handlers/create_payment';
import { getPayments } from './handlers/get_payments';
import { createAnalysisTemplate } from './handlers/create_analysis_template';
import { getAnalysisTemplates } from './handlers/get_analysis_templates';
import { createEstimationLibrary } from './handlers/create_estimation_library';
import { getEstimationLibrary } from './handlers/get_estimation_library';
import { getDashboardStats } from './handlers/get_dashboard_stats';
import { createWhatsappTemplate } from './handlers/create_whatsapp_template';
import { getWhatsappTemplates } from './handlers/get_whatsapp_templates';
import { updateWhatsappTemplate } from './handlers/update_whatsapp_template';
import { deleteWhatsappTemplate } from './handlers/delete_whatsapp_template';
import { sendThankYouMessage } from './handlers/send_thank_you_message';

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

  // Auth
  login: publicProcedure
    .input(loginInputSchema)
    .mutation(({ input }) => loginUser(input)),

  // User Management
  createUser: publicProcedure
    .input(createUserInputSchema)
    .mutation(({ input }) => createUser(input)),
  getUsers: publicProcedure
    .query(() => getUsers()),
  updateUser: publicProcedure
    .input(updateUserInputSchema)
    .mutation(({ input }) => updateUser(input)),

  // Customer Management
  createCustomer: publicProcedure
    .input(createCustomerInputSchema)
    .mutation(({ input }) => createCustomer(input)),
  getCustomers: publicProcedure
    .query(() => getCustomers()),

  // Vehicle Management
  createVehicle: publicProcedure
    .input(createVehicleInputSchema)
    .mutation(({ input }) => createVehicle(input)),
  getVehicles: publicProcedure
    .query(() => getVehicles()),

  // Service Order Management
  createServiceOrder: publicProcedure
    .input(createServiceOrderInputSchema)
    .mutation(({ input }) => createServiceOrder(input)),
  getServiceOrders: publicProcedure
    .query(() => getServiceOrders()),

  // Initial Check
  createInitialCheck: publicProcedure
    .input(createInitialCheckInputSchema)
    .mutation(({ input }) => createInitialCheck(input)),
  getInitialChecks: publicProcedure
    .query(() => getInitialChecks()),

  // Technical Analysis
  createTechnicalAnalysis: publicProcedure
    .input(createTechnicalAnalysisInputSchema)
    .mutation(({ input }) => createTechnicalAnalysis(input)),
  getTechnicalAnalyses: publicProcedure
    .query(() => getTechnicalAnalyses()),

  // Customer Education
  createCustomerEducation: publicProcedure
    .input(createCustomerEducationInputSchema)
    .mutation(({ input }) => createCustomerEducation(input)),
  getCustomerEducations: publicProcedure
    .query(() => getCustomerEducations()),

  // Cost Estimation
  createCostEstimation: publicProcedure
    .input(createCostEstimationInputSchema)
    .mutation(({ input }) => createCostEstimation(input)),
  getCostEstimations: publicProcedure
    .query(() => getCostEstimations()),

  // Work Execution
  createWorkExecution: publicProcedure
    .input(createWorkExecutionInputSchema)
    .mutation(({ input }) => createWorkExecution(input)),
  getWorkExecutions: publicProcedure
    .query(() => getWorkExecutions()),

  // Quality Control
  createQualityControl: publicProcedure
    .input(createQualityControlInputSchema)
    .mutation(({ input }) => createQualityControl(input)),
  getQualityControls: publicProcedure
    .query(() => getQualityControls()),

  // Payment Processing
  createPayment: publicProcedure
    .input(createPaymentInputSchema)
    .mutation(({ input }) => createPayment(input)),
  getPayments: publicProcedure
    .query(() => getPayments()),

  // Analysis Templates
  createAnalysisTemplate: publicProcedure
    .input(createAnalysisTemplateInputSchema)
    .mutation(({ input }) => createAnalysisTemplate(input)),
  getAnalysisTemplates: publicProcedure
    .query(() => getAnalysisTemplates()),

  // Estimation Library
  createEstimationLibrary: publicProcedure
    .input(createEstimationLibraryInputSchema)
    .mutation(({ input }) => createEstimationLibrary(input)),
  getEstimationLibrary: publicProcedure
    .query(() => getEstimationLibrary()),

  // Dashboard
  getDashboardStats: publicProcedure
    .query(() => getDashboardStats()),

  // WhatsApp Templates
  createWhatsappTemplate: publicProcedure
    .input(createWhatsappTemplateInputSchema)
    .mutation(({ input }) => createWhatsappTemplate(input)),
  getWhatsappTemplates: publicProcedure
    .query(() => getWhatsappTemplates()),
  updateWhatsappTemplate: publicProcedure
    .input(updateWhatsappTemplateInputSchema)
    .mutation(({ input }) => updateWhatsappTemplate(input)),
  deleteWhatsappTemplate: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => deleteWhatsappTemplate(input.id)),
  sendThankYouMessage: publicProcedure
    .input(sendThankYouMessageInputSchema)
    .mutation(({ input }) => sendThankYouMessage(input)),
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
  console.log(`TRPC server listening at port: ${port}`);
}

start();
