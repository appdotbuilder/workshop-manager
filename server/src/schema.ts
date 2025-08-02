
import { z } from 'zod';

// Enums
export const userRoleSchema = z.enum(['MECHANIC', 'ADMIN', 'KABENG', 'OWNER', 'PLANNER']);
export type UserRole = z.infer<typeof userRoleSchema>;

export const serviceTypeSchema = z.enum(['AC', 'RADIATOR', 'TUNE_UP', 'MAINTENANCE', 'CUSTOM']);
export type ServiceType = z.infer<typeof serviceTypeSchema>;

export const orderStatusSchema = z.enum([
  'INTAKE', 'INITIAL_CHECK', 'TECHNICAL_ANALYSIS', 'CUSTOMER_EDUCATION', 
  'COST_ESTIMATION', 'WORK_EXECUTION', 'QUALITY_CONTROL', 'PAYMENT', 'COMPLETED', 'CANCELLED'
]);
export type OrderStatus = z.infer<typeof orderStatusSchema>;

export const educationOutcomeSchema = z.enum(['DEAL', 'NO_DEAL', 'PENDING']);
export type EducationOutcome = z.infer<typeof educationOutcomeSchema>;

export const estimationDecisionSchema = z.enum(['DEAL', 'NO_DEAL', 'PARTIAL', 'PENDING']);
export type EstimationDecision = z.infer<typeof estimationDecisionSchema>;

export const pricingTierSchema = z.enum(['ECONOMICAL', 'STANDARD', 'PREMIUM']);
export type PricingTier = z.infer<typeof pricingTierSchema>;

export const qcStatusSchema = z.enum(['PENDING', 'PASSED', 'FAILED']);
export type QcStatus = z.infer<typeof qcStatusSchema>;

export const paymentStatusSchema = z.enum(['PENDING', 'PAID', 'PARTIAL']);
export type PaymentStatus = z.infer<typeof paymentStatusSchema>;

// User schema
export const userSchema = z.object({
  id: z.number(),
  username: z.string(),
  email: z.string().email(),
  password_hash: z.string(),
  full_name: z.string(),
  role: userRoleSchema,
  is_active: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type User = z.infer<typeof userSchema>;

export const createUserInputSchema = z.object({
  username: z.string().min(3),
  email: z.string().email(),
  password: z.string().min(6),
  full_name: z.string(),
  role: userRoleSchema,
  is_active: z.boolean().default(true)
});

export type CreateUserInput = z.infer<typeof createUserInputSchema>;

export const updateUserInputSchema = z.object({
  id: z.number(),
  username: z.string().min(3).optional(),
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  full_name: z.string().optional(),
  role: userRoleSchema.optional(),
  is_active: z.boolean().optional()
});

export type UpdateUserInput = z.infer<typeof updateUserInputSchema>;

// Customer schema
export const customerSchema = z.object({
  id: z.number(),
  name: z.string(),
  phone: z.string(),
  email: z.string().email().nullable(),
  address: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Customer = z.infer<typeof customerSchema>;

export const createCustomerInputSchema = z.object({
  name: z.string(),
  phone: z.string(),
  email: z.string().email().nullable(),
  address: z.string().nullable()
});

export type CreateCustomerInput = z.infer<typeof createCustomerInputSchema>;

// Vehicle schema
export const vehicleSchema = z.object({
  id: z.number(),
  license_plate: z.string(),
  make: z.string(),
  model: z.string(),
  year: z.number().int(),
  color: z.string().nullable(),
  customer_id: z.number(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Vehicle = z.infer<typeof vehicleSchema>;

export const createVehicleInputSchema = z.object({
  license_plate: z.string(),
  make: z.string(),
  model: z.string(),
  year: z.number().int(),
  color: z.string().nullable(),
  customer_id: z.number()
});

export type CreateVehicleInput = z.infer<typeof createVehicleInputSchema>;

// Service Order schema
export const serviceOrderSchema = z.object({
  id: z.number(),
  order_number: z.string(),
  customer_id: z.number(),
  vehicle_id: z.number(),
  status: orderStatusSchema,
  service_types: z.array(serviceTypeSchema),
  complaints: z.string(),
  referral_source: z.string().nullable(),
  body_defects: z.string().nullable(),
  other_defects: z.string().nullable(),
  assigned_mechanic_id: z.number().nullable(),
  created_by_id: z.number(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type ServiceOrder = z.infer<typeof serviceOrderSchema>;

export const createServiceOrderInputSchema = z.object({
  customer_id: z.number(),
  vehicle_id: z.number(),
  service_types: z.array(serviceTypeSchema),
  complaints: z.string(),
  referral_source: z.string().nullable(),
  body_defects: z.string().nullable(),
  other_defects: z.string().nullable(),
  assigned_mechanic_id: z.number().nullable()
});

export type CreateServiceOrderInput = z.infer<typeof createServiceOrderInputSchema>;

// Initial Check schema
export const initialCheckSchema = z.object({
  id: z.number(),
  service_order_id: z.number(),
  mechanic_id: z.number(),
  headlights: z.boolean(),
  horn: z.boolean(),
  ac_pressure: z.number().nullable(),
  ac_temperature: z.number().nullable(),
  ac_refrigerant_level: z.string().nullable(),
  ac_component_condition: z.string().nullable(),
  radiator_coolant_level: z.string().nullable(),
  radiator_fan_condition: z.string().nullable(),
  radiator_thermostat: z.string().nullable(),
  tuneup_rpm: z.number().nullable(),
  tuneup_engine_light: z.boolean().nullable(),
  tuneup_spark_plugs: z.string().nullable(),
  notes: z.string().nullable(),
  completed_at: z.coerce.date(),
  created_at: z.coerce.date()
});

export type InitialCheck = z.infer<typeof initialCheckSchema>;

export const createInitialCheckInputSchema = z.object({
  service_order_id: z.number(),
  headlights: z.boolean(),
  horn: z.boolean(),
  ac_pressure: z.number().nullable(),
  ac_temperature: z.number().nullable(),
  ac_refrigerant_level: z.string().nullable(),
  ac_component_condition: z.string().nullable(),
  radiator_coolant_level: z.string().nullable(),
  radiator_fan_condition: z.string().nullable(),
  radiator_thermostat: z.string().nullable(),
  tuneup_rpm: z.number().nullable(),
  tuneup_engine_light: z.boolean().nullable(),
  tuneup_spark_plugs: z.string().nullable(),
  notes: z.string().nullable()
});

export type CreateInitialCheckInput = z.infer<typeof createInitialCheckInputSchema>;

// Technical Analysis schema
export const technicalAnalysisSchema = z.object({
  id: z.number(),
  service_order_id: z.number(),
  mechanic_id: z.number(),
  diagnosis: z.string(),
  visual_evidence_urls: z.array(z.string()),
  analysis_narrative: z.string(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type TechnicalAnalysis = z.infer<typeof technicalAnalysisSchema>;

export const createTechnicalAnalysisInputSchema = z.object({
  service_order_id: z.number(),
  diagnosis: z.string(),
  visual_evidence_urls: z.array(z.string()),
  analysis_narrative: z.string()
});

export type CreateTechnicalAnalysisInput = z.infer<typeof createTechnicalAnalysisInputSchema>;

// Customer Education schema
export const customerEducationSchema = z.object({
  id: z.number(),
  service_order_id: z.number(),
  educator_id: z.number(),
  outcome: educationOutcomeSchema,
  agreed_analysis_summary: z.string().nullable(),
  notes: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type CustomerEducation = z.infer<typeof customerEducationSchema>;

export const createCustomerEducationInputSchema = z.object({
  service_order_id: z.number(),
  outcome: educationOutcomeSchema,
  agreed_analysis_summary: z.string().nullable(),
  notes: z.string().nullable()
});

export type CreateCustomerEducationInput = z.infer<typeof createCustomerEducationInputSchema>;

// Cost Estimation schema
export const costEstimationSchema = z.object({
  id: z.number(),
  service_order_id: z.number(),
  estimator_id: z.number(),
  economical_price: z.number(),
  standard_price: z.number(),
  premium_price: z.number(),
  selected_tier: pricingTierSchema.nullable(),
  customer_decision: estimationDecisionSchema,
  notes: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type CostEstimation = z.infer<typeof costEstimationSchema>;

export const createCostEstimationInputSchema = z.object({
  service_order_id: z.number(),
  economical_price: z.number().positive(),
  standard_price: z.number().positive(),
  premium_price: z.number().positive(),
  selected_tier: pricingTierSchema.nullable(),
  customer_decision: estimationDecisionSchema,
  notes: z.string().nullable()
});

export type CreateCostEstimationInput = z.infer<typeof createCostEstimationInputSchema>;

// Work Execution schema
export const workExecutionSchema = z.object({
  id: z.number(),
  service_order_id: z.number(),
  mechanic_id: z.number(),
  progress_updates: z.string().nullable(),
  new_findings: z.string().nullable(),
  new_findings_evidence: z.array(z.string()),
  completion_checklist: z.record(z.boolean()),
  is_completed: z.boolean(),
  completed_at: z.coerce.date().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type WorkExecution = z.infer<typeof workExecutionSchema>;

export const createWorkExecutionInputSchema = z.object({
  service_order_id: z.number(),
  progress_updates: z.string().nullable(),
  new_findings: z.string().nullable(),
  new_findings_evidence: z.array(z.string()),
  completion_checklist: z.record(z.boolean())
});

export type CreateWorkExecutionInput = z.infer<typeof createWorkExecutionInputSchema>;

// Quality Control schema
export const qualityControlSchema = z.object({
  id: z.number(),
  service_order_id: z.number(),
  inspector_id: z.number(),
  status: qcStatusSchema,
  verification_notes: z.string().nullable(),
  critical_factors_check: z.record(z.boolean()),
  failure_reason: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type QualityControl = z.infer<typeof qualityControlSchema>;

export const createQualityControlInputSchema = z.object({
  service_order_id: z.number(),
  status: qcStatusSchema,
  verification_notes: z.string().nullable(),
  critical_factors_check: z.record(z.boolean()),
  failure_reason: z.string().nullable()
});

export type CreateQualityControlInput = z.infer<typeof createQualityControlInputSchema>;

// Payment schema
export const paymentSchema = z.object({
  id: z.number(),
  service_order_id: z.number(),
  total_amount: z.number(),
  paid_amount: z.number(),
  payment_status: paymentStatusSchema,
  payment_method: z.string().nullable(),
  invoice_number: z.string(),
  warranty_details: z.string().nullable(),
  processed_by_id: z.number(),
  paid_at: z.coerce.date().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Payment = z.infer<typeof paymentSchema>;

export const createPaymentInputSchema = z.object({
  service_order_id: z.number(),
  total_amount: z.number().positive(),
  paid_amount: z.number().nonnegative(),
  payment_status: paymentStatusSchema,
  payment_method: z.string().nullable(),
  warranty_details: z.string().nullable()
});

export type CreatePaymentInput = z.infer<typeof createPaymentInputSchema>;

// Analysis Template schema
export const analysisTemplateSchema = z.object({
  id: z.number(),
  name: z.string(),
  service_type: serviceTypeSchema,
  template_content: z.string(),
  created_by_id: z.number(),
  is_active: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type AnalysisTemplate = z.infer<typeof analysisTemplateSchema>;

export const createAnalysisTemplateInputSchema = z.object({
  name: z.string(),
  service_type: serviceTypeSchema,
  template_content: z.string(),
  is_active: z.boolean().default(true)
});

export type CreateAnalysisTemplateInput = z.infer<typeof createAnalysisTemplateInputSchema>;

// Estimation Library schema
export const estimationLibrarySchema = z.object({
  id: z.number(),
  name: z.string(),
  category: z.string(),
  description: z.string().nullable(),
  economical_price: z.number(),
  standard_price: z.number(),
  premium_price: z.number(),
  is_service: z.boolean(),
  is_active: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type EstimationLibrary = z.infer<typeof estimationLibrarySchema>;

export const createEstimationLibraryInputSchema = z.object({
  name: z.string(),
  category: z.string(),
  description: z.string().nullable(),
  economical_price: z.number().positive(),
  standard_price: z.number().positive(),
  premium_price: z.number().positive(),
  is_service: z.boolean(),
  is_active: z.boolean().default(true)
});

export type CreateEstimationLibraryInput = z.infer<typeof createEstimationLibraryInputSchema>;

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
