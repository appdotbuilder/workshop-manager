
import { z } from 'zod';

// User role enum schema
export const userRoleSchema = z.enum(['MECHANIC', 'ADMIN', 'KABENG', 'OWNER', 'PLANNER']);
export type UserRole = z.infer<typeof userRoleSchema>;

// Service type enum schema
export const serviceTypeSchema = z.enum(['GENERAL_SERVICE', 'BRAKE_SERVICE', 'ENGINE_SERVICE', 'TRANSMISSION_SERVICE', 'ELECTRICAL_SERVICE', 'BODY_WORK', 'TIRE_SERVICE', 'AC_SERVICE']);
export type ServiceType = z.infer<typeof serviceTypeSchema>;

// Order status enum schema
export const orderStatusSchema = z.enum(['PENDING_INITIAL_CHECK', 'TECHNICAL_ANALYSIS', 'CUSTOMER_EDUCATION', 'COST_ESTIMATION', 'AWAITING_APPROVAL', 'WORK_IN_PROGRESS', 'QUALITY_CONTROL', 'AWAITING_PAYMENT', 'COMPLETED', 'CANCELLED']);
export type OrderStatus = z.infer<typeof orderStatusSchema>;

// Education outcome enum schema
export const educationOutcomeSchema = z.enum(['UNDERSTOOD', 'NEEDS_CLARIFICATION', 'REFUSED_SERVICE', 'PARTIAL_UNDERSTANDING']);
export type EducationOutcome = z.infer<typeof educationOutcomeSchema>;

// Estimation decision enum schema
export const estimationDecisionSchema = z.enum(['APPROVED', 'REJECTED', 'PENDING', 'PARTIAL_APPROVAL']);
export type EstimationDecision = z.infer<typeof estimationDecisionSchema>;

// Pricing tier enum schema
export const pricingTierSchema = z.enum(['ECONOMIC', 'STANDARD', 'PREMIUM']);
export type PricingTier = z.infer<typeof pricingTierSchema>;

// QC status enum schema
export const qcStatusSchema = z.enum(['PASSED', 'FAILED', 'NEEDS_REWORK', 'PENDING']);
export type QcStatus = z.infer<typeof qcStatusSchema>;

// Payment status enum schema
export const paymentStatusSchema = z.enum(['PENDING', 'PAID', 'PARTIAL', 'OVERDUE', 'CANCELLED']);
export type PaymentStatus = z.infer<typeof paymentStatusSchema>;

// WhatsApp message type enum schema
export const whatsappMessageTypeSchema = z.enum(['THANK_YOU', 'REMINDER', 'FOLLOW_UP', 'PROMOTION']);
export type WhatsappMessageType = z.infer<typeof whatsappMessageTypeSchema>;

// User schemas
export const userSchema = z.object({
  id: z.number(),
  username: z.string(),
  email: z.string().email(),
  password_hash: z.string(),
  full_name: z.string(),
  role: userRoleSchema,
  is_active: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date().nullable()
});

export type User = z.infer<typeof userSchema>;

export const createUserInputSchema = z.object({
  username: z.string().min(3),
  email: z.string().email(),
  password: z.string().min(6),
  full_name: z.string().min(1),
  role: userRoleSchema
});

export type CreateUserInput = z.infer<typeof createUserInputSchema>;

export const updateUserInputSchema = z.object({
  id: z.number(),
  username: z.string().min(3).optional(),
  email: z.string().email().optional(),
  full_name: z.string().min(1).optional(),
  role: userRoleSchema.optional(),
  is_active: z.boolean().optional()
});

export type UpdateUserInput = z.infer<typeof updateUserInputSchema>;

// Customer schemas
export const customerSchema = z.object({
  id: z.number(),
  name: z.string(),
  phone: z.string(),
  email: z.string().email().nullable(),
  address: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date().nullable()
});

export type Customer = z.infer<typeof customerSchema>;

export const createCustomerInputSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(10),
  email: z.string().email().optional(),
  address: z.string().optional()
});

export type CreateCustomerInput = z.infer<typeof createCustomerInputSchema>;

// Vehicle schemas
export const vehicleSchema = z.object({
  id: z.number(),
  customer_id: z.number(),
  make: z.string(),
  model: z.string(),
  year: z.number(),
  license_plate: z.string(),
  vin: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date().nullable()
});

export type Vehicle = z.infer<typeof vehicleSchema>;

export const createVehicleInputSchema = z.object({
  customer_id: z.number(),
  make: z.string(),
  model: z.string(),
  year: z.number().int().min(1900).max(new Date().getFullYear() + 1),
  license_plate: z.string(),
  vin: z.string().optional()
});

export type CreateVehicleInput = z.infer<typeof createVehicleInputSchema>;

// Service Order schemas
export const serviceOrderSchema = z.object({
  id: z.number(),
  order_number: z.string(),
  customer_id: z.number(),
  vehicle_id: z.number(),
  service_types: z.array(serviceTypeSchema),
  complaints: z.string(),
  referral_source: z.string().nullable(),
  body_defects: z.string().nullable(),
  other_defects: z.string().nullable(),
  assigned_mechanic_id: z.number().nullable(),
  created_by_id: z.number(),
  status: orderStatusSchema,
  created_at: z.coerce.date(),
  updated_at: z.coerce.date().nullable()
});

export type ServiceOrder = z.infer<typeof serviceOrderSchema>;

export const createServiceOrderInputSchema = z.object({
  customer_id: z.number(),
  vehicle_id: z.number(),
  service_types: z.array(serviceTypeSchema).min(1),
  complaints: z.string().min(1),
  referral_source: z.string().optional(),
  body_defects: z.string().optional(),
  other_defects: z.string().optional(),
  assigned_mechanic_id: z.number().optional(),
  created_by_id: z.number()
});

export type CreateServiceOrderInput = z.infer<typeof createServiceOrderInputSchema>;

// Initial Check schemas
export const initialCheckSchema = z.object({
  id: z.number(),
  service_order_id: z.number(),
  fluid_levels_check: z.boolean(),
  battery_condition: z.boolean(),
  tire_condition: z.boolean(),
  brake_system_check: z.boolean(),
  lights_check: z.boolean(),
  engine_visual_inspection: z.boolean(),
  additional_findings: z.string().nullable(),
  checked_by_id: z.number(),
  created_at: z.coerce.date()
});

export type InitialCheck = z.infer<typeof initialCheckSchema>;

export const createInitialCheckInputSchema = z.object({
  service_order_id: z.number(),
  fluid_levels_check: z.boolean(),
  battery_condition: z.boolean(),
  tire_condition: z.boolean(),
  brake_system_check: z.boolean(),
  lights_check: z.boolean(),
  engine_visual_inspection: z.boolean(),
  additional_findings: z.string().optional(),
  checked_by_id: z.number()
});

export type CreateInitialCheckInput = z.infer<typeof createInitialCheckInputSchema>;

// Technical Analysis schemas
export const technicalAnalysisSchema = z.object({
  id: z.number(),
  service_order_id: z.number(),
  problem_description: z.string(),
  root_cause_analysis: z.string(),
  recommended_actions: z.string(),
  visual_evidence_urls: z.array(z.string()),
  analysis_date: z.coerce.date(),
  analyzed_by_id: z.number(),
  created_at: z.coerce.date()
});

export type TechnicalAnalysis = z.infer<typeof technicalAnalysisSchema>;

export const createTechnicalAnalysisInputSchema = z.object({
  service_order_id: z.number(),
  problem_description: z.string().min(1),
  root_cause_analysis: z.string().min(1),
  recommended_actions: z.string().min(1),
  visual_evidence_urls: z.array(z.string().url()).optional(),
  analyzed_by_id: z.number()
});

export type CreateTechnicalAnalysisInput = z.infer<typeof createTechnicalAnalysisInputSchema>;

// Customer Education schemas
export const customerEducationSchema = z.object({
  id: z.number(),
  service_order_id: z.number(),
  explanation_provided: z.string(),
  customer_questions: z.string().nullable(),
  understanding_level: educationOutcomeSchema,
  additional_notes: z.string().nullable(),
  educated_by_id: z.number(),
  education_date: z.coerce.date(),
  created_at: z.coerce.date()
});

export type CustomerEducation = z.infer<typeof customerEducationSchema>;

export const createCustomerEducationInputSchema = z.object({
  service_order_id: z.number(),
  explanation_provided: z.string().min(1),
  customer_questions: z.string().optional(),
  understanding_level: educationOutcomeSchema,
  additional_notes: z.string().optional(),
  educated_by_id: z.number()
});

export type CreateCustomerEducationInput = z.infer<typeof createCustomerEducationInputSchema>;

// Cost Estimation schemas
export const costEstimationSchema = z.object({
  id: z.number(),
  service_order_id: z.number(),
  economic_tier_price: z.number(),
  standard_tier_price: z.number(),
  premium_tier_price: z.number(),
  economic_description: z.string(),
  standard_description: z.string(),
  premium_description: z.string(),
  customer_decision: estimationDecisionSchema,
  chosen_tier: pricingTierSchema.nullable(),
  estimated_by_id: z.number(),
  estimation_date: z.coerce.date(),
  customer_response_date: z.coerce.date().nullable(),
  created_at: z.coerce.date()
});

export type CostEstimation = z.infer<typeof costEstimationSchema>;

export const createCostEstimationInputSchema = z.object({
  service_order_id: z.number(),
  economic_tier_price: z.number().positive(),
  standard_tier_price: z.number().positive(),
  premium_tier_price: z.number().positive(),
  economic_description: z.string().min(1),
  standard_description: z.string().min(1),
  premium_description: z.string().min(1),
  estimated_by_id: z.number()
});

export type CreateCostEstimationInput = z.infer<typeof createCostEstimationInputSchema>;

// Work Execution schemas
export const workExecutionSchema = z.object({
  id: z.number(),
  service_order_id: z.number(),
  work_description: z.string(),
  parts_used: z.string().nullable(),
  labor_hours: z.number(),
  completion_checklist: z.record(z.boolean()),
  work_photos: z.array(z.string()),
  executed_by_id: z.number(),
  start_date: z.coerce.date(),
  completion_date: z.coerce.date().nullable(),
  created_at: z.coerce.date()
});

export type WorkExecution = z.infer<typeof workExecutionSchema>;

export const createWorkExecutionInputSchema = z.object({
  service_order_id: z.number(),
  work_description: z.string().min(1),
  parts_used: z.string().optional(),
  labor_hours: z.number().positive(),
  completion_checklist: z.record(z.boolean()).optional(),
  work_photos: z.array(z.string().url()).optional(),
  executed_by_id: z.number()
});

export type CreateWorkExecutionInput = z.infer<typeof createWorkExecutionInputSchema>;

// Quality Control schemas
export const qualityControlSchema = z.object({
  id: z.number(),
  service_order_id: z.number(),
  qc_status: qcStatusSchema,
  critical_factors_check: z.record(z.boolean()),
  defects_found: z.string().nullable(),
  corrective_actions: z.string().nullable(),
  final_approval: z.boolean(),
  inspected_by_id: z.number(),
  inspection_date: z.coerce.date(),
  created_at: z.coerce.date()
});

export type QualityControl = z.infer<typeof qualityControlSchema>;

export const createQualityControlInputSchema = z.object({
  service_order_id: z.number(),
  critical_factors_check: z.record(z.boolean()),
  defects_found: z.string().optional(),
  corrective_actions: z.string().optional(),
  final_approval: z.boolean(),
  inspected_by_id: z.number()
});

export type CreateQualityControlInput = z.infer<typeof createQualityControlInputSchema>;

// Payment schemas
export const paymentSchema = z.object({
  id: z.number(),
  service_order_id: z.number(),
  amount: z.number(),
  payment_method: z.string(),
  payment_status: paymentStatusSchema,
  transaction_id: z.string().nullable(),
  payment_date: z.coerce.date().nullable(),
  created_by_id: z.number(),
  created_at: z.coerce.date()
});

export type Payment = z.infer<typeof paymentSchema>;

export const createPaymentInputSchema = z.object({
  service_order_id: z.number(),
  amount: z.number().positive(),
  payment_method: z.string(),
  transaction_id: z.string().optional(),
  created_by_id: z.number()
});

export type CreatePaymentInput = z.infer<typeof createPaymentInputSchema>;

// Analysis Template schemas
export const analysisTemplateSchema = z.object({
  id: z.number(),
  name: z.string(),
  service_type: serviceTypeSchema,
  template_content: z.string(),
  created_by_id: z.number(),
  is_active: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date().nullable()
});

export type AnalysisTemplate = z.infer<typeof analysisTemplateSchema>;

export const createAnalysisTemplateInputSchema = z.object({
  name: z.string().min(1),
  service_type: serviceTypeSchema,
  template_content: z.string().min(1),
  created_by_id: z.number()
});

export type CreateAnalysisTemplateInput = z.infer<typeof createAnalysisTemplateInputSchema>;

// Estimation Library schemas
export const estimationLibrarySchema = z.object({
  id: z.number(),
  service_type: serviceTypeSchema,
  service_name: z.string(),
  economic_price: z.number(),
  standard_price: z.number(),
  premium_price: z.number(),
  estimated_labor_hours: z.number(),
  description: z.string().nullable(),
  created_by_id: z.number(),
  is_active: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date().nullable()
});

export type EstimationLibrary = z.infer<typeof estimationLibrarySchema>;

export const createEstimationLibraryInputSchema = z.object({
  service_type: serviceTypeSchema,
  service_name: z.string().min(1),
  economic_price: z.number().positive(),
  standard_price: z.number().positive(),
  premium_price: z.number().positive(),
  estimated_labor_hours: z.number().positive(),
  description: z.string().optional(),
  created_by_id: z.number()
});

export type CreateEstimationLibraryInput = z.infer<typeof createEstimationLibraryInputSchema>;

// WhatsApp Template schemas
export const whatsappTemplateSchema = z.object({
  id: z.number(),
  name: z.string(),
  type: whatsappMessageTypeSchema,
  content: z.string(),
  created_by_id: z.number(),
  is_active: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date().nullable()
});

export type WhatsappTemplate = z.infer<typeof whatsappTemplateSchema>;

export const createWhatsappTemplateInputSchema = z.object({
  name: z.string().min(1),
  type: whatsappMessageTypeSchema,
  content: z.string().min(1),
  created_by_id: z.number()
});

export type CreateWhatsappTemplateInput = z.infer<typeof createWhatsappTemplateInputSchema>;

export const updateWhatsappTemplateInputSchema = z.object({
  id: z.number(),
  name: z.string().min(1).optional(),
  type: whatsappMessageTypeSchema.optional(),
  content: z.string().min(1).optional(),
  is_active: z.boolean().optional()
});

export type UpdateWhatsappTemplateInput = z.infer<typeof updateWhatsappTemplateInputSchema>;

export const sendThankYouMessageInputSchema = z.object({
  customer_id: z.number(),
  service_order_id: z.number(),
  template_name: z.string()
});

export type SendThankYouMessageInput = z.infer<typeof sendThankYouMessageInputSchema>;

export const whatsappMessageResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  message_id: z.string().nullable()
});

export type WhatsappMessageResponse = z.infer<typeof whatsappMessageResponseSchema>;

// Auth schemas
export const loginInputSchema = z.object({
  username: z.string(),
  password: z.string()
});

export type LoginInput = z.infer<typeof loginInputSchema>;

export const authResponseSchema = z.object({
  user: userSchema,
  token: z.string()
});

export type AuthResponse = z.infer<typeof authResponseSchema>;

// Dashboard schemas
export const dashboardStatsSchema = z.object({
  total_orders: z.number(),
  orders_in_progress: z.number(),
  completed_orders: z.number(),
  pending_payments: z.number(),
  total_revenue: z.number(),
  avg_completion_time: z.number()
});

export type DashboardStats = z.infer<typeof dashboardStatsSchema>;
