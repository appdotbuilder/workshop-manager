
import { 
  serial, 
  text, 
  pgTable, 
  timestamp, 
  numeric, 
  integer, 
  boolean,
  pgEnum,
  jsonb
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Define enums
export const userRoleEnum = pgEnum('user_role', ['MECHANIC', 'ADMIN', 'KABENG', 'OWNER', 'PLANNER']);
export const serviceTypeEnum = pgEnum('service_type', ['AC', 'RADIATOR', 'TUNE_UP', 'MAINTENANCE', 'CUSTOM']);
export const orderStatusEnum = pgEnum('order_status', [
  'INTAKE', 'INITIAL_CHECK', 'TECHNICAL_ANALYSIS', 'CUSTOMER_EDUCATION', 
  'COST_ESTIMATION', 'WORK_EXECUTION', 'QUALITY_CONTROL', 'PAYMENT', 'COMPLETED', 'CANCELLED'
]);
export const educationOutcomeEnum = pgEnum('education_outcome', ['DEAL', 'NO_DEAL', 'PENDING']);
export const estimationDecisionEnum = pgEnum('estimation_decision', ['DEAL', 'NO_DEAL', 'PARTIAL', 'PENDING']);
export const pricingTierEnum = pgEnum('pricing_tier', ['ECONOMICAL', 'STANDARD', 'PREMIUM']);
export const qcStatusEnum = pgEnum('qc_status', ['PENDING', 'PASSED', 'FAILED']);
export const paymentStatusEnum = pgEnum('payment_status', ['PENDING', 'PAID', 'PARTIAL']);

// Users table
export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  username: text('username').notNull().unique(),
  email: text('email').notNull().unique(),
  password_hash: text('password_hash').notNull(),
  full_name: text('full_name').notNull(),
  role: userRoleEnum('role').notNull(),
  is_active: boolean('is_active').notNull().default(true),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Customers table
export const customersTable = pgTable('customers', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  phone: text('phone').notNull(),
  email: text('email'),
  address: text('address'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Vehicles table
export const vehiclesTable = pgTable('vehicles', {
  id: serial('id').primaryKey(),
  license_plate: text('license_plate').notNull(),
  make: text('make').notNull(),
  model: text('model').notNull(),
  year: integer('year').notNull(),
  color: text('color'),
  customer_id: integer('customer_id').notNull().references(() => customersTable.id),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Service Orders table
export const serviceOrdersTable = pgTable('service_orders', {
  id: serial('id').primaryKey(),
  order_number: text('order_number').notNull().unique(),
  customer_id: integer('customer_id').notNull().references(() => customersTable.id),
  vehicle_id: integer('vehicle_id').notNull().references(() => vehiclesTable.id),
  status: orderStatusEnum('status').notNull().default('INTAKE'),
  service_types: jsonb('service_types').notNull(),
  complaints: text('complaints').notNull(),
  referral_source: text('referral_source'),
  body_defects: text('body_defects'),
  other_defects: text('other_defects'),
  assigned_mechanic_id: integer('assigned_mechanic_id').references(() => usersTable.id),
  created_by_id: integer('created_by_id').notNull().references(() => usersTable.id),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Initial Checks table
export const initialChecksTable = pgTable('initial_checks', {
  id: serial('id').primaryKey(),
  service_order_id: integer('service_order_id').notNull().references(() => serviceOrdersTable.id),
  mechanic_id: integer('mechanic_id').notNull().references(() => usersTable.id),
  headlights: boolean('headlights').notNull(),
  horn: boolean('horn').notNull(),
  ac_pressure: numeric('ac_pressure', { precision: 10, scale: 2 }),
  ac_temperature: numeric('ac_temperature', { precision: 10, scale: 2 }),
  ac_refrigerant_level: text('ac_refrigerant_level'),
  ac_component_condition: text('ac_component_condition'),
  radiator_coolant_level: text('radiator_coolant_level'),
  radiator_fan_condition: text('radiator_fan_condition'),
  radiator_thermostat: text('radiator_thermostat'),
  tuneup_rpm: numeric('tuneup_rpm', { precision: 10, scale: 2 }),
  tuneup_engine_light: boolean('tuneup_engine_light'),
  tuneup_spark_plugs: text('tuneup_spark_plugs'),
  notes: text('notes'),
  completed_at: timestamp('completed_at').defaultNow().notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Technical Analysis table
export const technicalAnalysisTable = pgTable('technical_analysis', {
  id: serial('id').primaryKey(),
  service_order_id: integer('service_order_id').notNull().references(() => serviceOrdersTable.id),
  mechanic_id: integer('mechanic_id').notNull().references(() => usersTable.id),
  diagnosis: text('diagnosis').notNull(),
  visual_evidence_urls: jsonb('visual_evidence_urls').notNull(),
  analysis_narrative: text('analysis_narrative').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Customer Education table
export const customerEducationTable = pgTable('customer_education', {
  id: serial('id').primaryKey(),
  service_order_id: integer('service_order_id').notNull().references(() => serviceOrdersTable.id),
  educator_id: integer('educator_id').notNull().references(() => usersTable.id),
  outcome: educationOutcomeEnum('outcome').notNull(),
  agreed_analysis_summary: text('agreed_analysis_summary'),
  notes: text('notes'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Cost Estimations table
export const costEstimationsTable = pgTable('cost_estimations', {
  id: serial('id').primaryKey(),
  service_order_id: integer('service_order_id').notNull().references(() => serviceOrdersTable.id),
  estimator_id: integer('estimator_id').notNull().references(() => usersTable.id),
  economical_price: numeric('economical_price', { precision: 10, scale: 2 }).notNull(),
  standard_price: numeric('standard_price', { precision: 10, scale: 2 }).notNull(),
  premium_price: numeric('premium_price', { precision: 10, scale: 2 }).notNull(),
  selected_tier: pricingTierEnum('selected_tier'),
  customer_decision: estimationDecisionEnum('customer_decision').notNull(),
  notes: text('notes'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Work Execution table
export const workExecutionTable = pgTable('work_execution', {
  id: serial('id').primaryKey(),
  service_order_id: integer('service_order_id').notNull().references(() => serviceOrdersTable.id),
  mechanic_id: integer('mechanic_id').notNull().references(() => usersTable.id),
  progress_updates: text('progress_updates'),
  new_findings: text('new_findings'),
  new_findings_evidence: jsonb('new_findings_evidence').notNull(),
  completion_checklist: jsonb('completion_checklist').notNull(),
  is_completed: boolean('is_completed').notNull().default(false),
  completed_at: timestamp('completed_at'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Quality Control table
export const qualityControlTable = pgTable('quality_control', {
  id: serial('id').primaryKey(),
  service_order_id: integer('service_order_id').notNull().references(() => serviceOrdersTable.id),
  inspector_id: integer('inspector_id').notNull().references(() => usersTable.id),
  status: qcStatusEnum('status').notNull(),
  verification_notes: text('verification_notes'),
  critical_factors_check: jsonb('critical_factors_check').notNull(),
  failure_reason: text('failure_reason'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Payments table
export const paymentsTable = pgTable('payments', {
  id: serial('id').primaryKey(),
  service_order_id: integer('service_order_id').notNull().references(() => serviceOrdersTable.id),
  total_amount: numeric('total_amount', { precision: 10, scale: 2 }).notNull(),
  paid_amount: numeric('paid_amount', { precision: 10, scale: 2 }).notNull(),
  payment_status: paymentStatusEnum('payment_status').notNull(),
  payment_method: text('payment_method'),
  invoice_number: text('invoice_number').notNull().unique(),
  warranty_details: text('warranty_details'),
  processed_by_id: integer('processed_by_id').notNull().references(() => usersTable.id),
  paid_at: timestamp('paid_at'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Analysis Templates table
export const analysisTemplatesTable = pgTable('analysis_templates', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  service_type: serviceTypeEnum('service_type').notNull(),
  template_content: text('template_content').notNull(),
  created_by_id: integer('created_by_id').notNull().references(() => usersTable.id),
  is_active: boolean('is_active').notNull().default(true),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Estimation Library table
export const estimationLibraryTable = pgTable('estimation_library', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  category: text('category').notNull(),
  description: text('description'),
  economical_price: numeric('economical_price', { precision: 10, scale: 2 }).notNull(),
  standard_price: numeric('standard_price', { precision: 10, scale: 2 }).notNull(),
  premium_price: numeric('premium_price', { precision: 10, scale: 2 }).notNull(),
  is_service: boolean('is_service').notNull(),
  is_active: boolean('is_active').notNull().default(true),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Define relations
export const usersRelations = relations(usersTable, ({ many }) => ({
  createdServiceOrders: many(serviceOrdersTable, { relationName: 'creator' }),
  assignedServiceOrders: many(serviceOrdersTable, { relationName: 'assignedMechanic' }),
  initialChecks: many(initialChecksTable),
  technicalAnalysis: many(technicalAnalysisTable),
  customerEducation: many(customerEducationTable),
  costEstimations: many(costEstimationsTable),
  workExecution: many(workExecutionTable),
  qualityControl: many(qualityControlTable),
  payments: many(paymentsTable),
  analysisTemplates: many(analysisTemplatesTable),
}));

export const customersRelations = relations(customersTable, ({ many }) => ({
  vehicles: many(vehiclesTable),
  serviceOrders: many(serviceOrdersTable),
}));

export const vehiclesRelations = relations(vehiclesTable, ({ one, many }) => ({
  customer: one(customersTable, {
    fields: [vehiclesTable.customer_id],
    references: [customersTable.id],
  }),
  serviceOrders: many(serviceOrdersTable),
}));

export const serviceOrdersRelations = relations(serviceOrdersTable, ({ one, many }) => ({
  customer: one(customersTable, {
    fields: [serviceOrdersTable.customer_id],
    references: [customersTable.id],
  }),
  vehicle: one(vehiclesTable, {
    fields: [serviceOrdersTable.vehicle_id],
    references: [vehiclesTable.id],
  }),
  creator: one(usersTable, {
    fields: [serviceOrdersTable.created_by_id],
    references: [usersTable.id],
    relationName: 'creator',
  }),
  assignedMechanic: one(usersTable, {
    fields: [serviceOrdersTable.assigned_mechanic_id],
    references: [usersTable.id],
    relationName: 'assignedMechanic',
  }),
  initialCheck: one(initialChecksTable),
  technicalAnalysis: one(technicalAnalysisTable),
  customerEducation: one(customerEducationTable),
  costEstimation: one(costEstimationsTable),
  workExecution: one(workExecutionTable),
  qualityControl: one(qualityControlTable),
  payment: one(paymentsTable),
}));

// Export all tables for proper query building
export const tables = {
  users: usersTable,
  customers: customersTable,
  vehicles: vehiclesTable,
  serviceOrders: serviceOrdersTable,
  initialChecks: initialChecksTable,
  technicalAnalysis: technicalAnalysisTable,
  customerEducation: customerEducationTable,
  costEstimations: costEstimationsTable,
  workExecution: workExecutionTable,
  qualityControl: qualityControlTable,
  payments: paymentsTable,
  analysisTemplates: analysisTemplatesTable,
  estimationLibrary: estimationLibraryTable,
};
