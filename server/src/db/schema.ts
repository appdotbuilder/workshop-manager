
import { serial, text, pgTable, timestamp, numeric, integer, boolean, jsonb, date, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Define enums
export const userRoleEnum = pgEnum('user_role', ['MECHANIC', 'ADMIN', 'KABENG', 'OWNER', 'PLANNER']);
export const serviceTypeEnum = pgEnum('service_type', ['GENERAL_SERVICE', 'BRAKE_SERVICE', 'ENGINE_SERVICE', 'TRANSMISSION_SERVICE', 'ELECTRICAL_SERVICE', 'BODY_WORK', 'TIRE_SERVICE', 'AC_SERVICE']);
export const orderStatusEnum = pgEnum('order_status', ['PENDING_INITIAL_CHECK', 'TECHNICAL_ANALYSIS', 'CUSTOMER_EDUCATION', 'COST_ESTIMATION', 'AWAITING_APPROVAL', 'WORK_IN_PROGRESS', 'QUALITY_CONTROL', 'AWAITING_PAYMENT', 'COMPLETED', 'CANCELLED']);
export const educationOutcomeEnum = pgEnum('education_outcome', ['UNDERSTOOD', 'NEEDS_CLARIFICATION', 'REFUSED_SERVICE', 'PARTIAL_UNDERSTANDING']);
export const estimationDecisionEnum = pgEnum('estimation_decision', ['APPROVED', 'REJECTED', 'PENDING', 'PARTIAL_APPROVAL']);
export const pricingTierEnum = pgEnum('pricing_tier', ['ECONOMIC', 'STANDARD', 'PREMIUM']);
export const qcStatusEnum = pgEnum('qc_status', ['PASSED', 'FAILED', 'NEEDS_REWORK', 'PENDING']);
export const paymentStatusEnum = pgEnum('payment_status', ['PENDING', 'PAID', 'PARTIAL', 'OVERDUE', 'CANCELLED']);
export const whatsappMessageTypeEnum = pgEnum('whatsapp_message_type', ['THANK_YOU', 'REMINDER', 'FOLLOW_UP', 'PROMOTION']);

// Users table
export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  username: text('username').notNull().unique(),
  email: text('email').notNull().unique(),
  password_hash: text('password_hash').notNull(),
  full_name: text('full_name').notNull(),
  role: userRoleEnum('role').notNull(),
  is_active: boolean('is_active').default(true).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at')
});

// Customers table
export const customersTable = pgTable('customers', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  phone: text('phone').notNull().unique(),
  email: text('email'),
  address: text('address'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at')
});

// Vehicles table
export const vehiclesTable = pgTable('vehicles', {
  id: serial('id').primaryKey(),
  customer_id: integer('customer_id').references(() => customersTable.id).notNull(),
  make: text('make').notNull(),
  model: text('model').notNull(),
  year: integer('year').notNull(),
  license_plate: text('license_plate').notNull().unique(),
  vin: text('vin'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at')
});

// Service Orders table
export const serviceOrdersTable = pgTable('service_orders', {
  id: serial('id').primaryKey(),
  order_number: text('order_number').notNull().unique(),
  customer_id: integer('customer_id').references(() => customersTable.id).notNull(),
  vehicle_id: integer('vehicle_id').references(() => vehiclesTable.id).notNull(),
  service_types: jsonb('service_types').notNull(), // Array of service types
  complaints: text('complaints').notNull(),
  referral_source: text('referral_source'),
  body_defects: text('body_defects'),
  other_defects: text('other_defects'),
  assigned_mechanic_id: integer('assigned_mechanic_id').references(() => usersTable.id),
  created_by_id: integer('created_by_id').references(() => usersTable.id).notNull(),
  status: orderStatusEnum('status').default('PENDING_INITIAL_CHECK').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at')
});

// Initial Checks table
export const initialChecksTable = pgTable('initial_checks', {
  id: serial('id').primaryKey(),
  service_order_id: integer('service_order_id').references(() => serviceOrdersTable.id).notNull(),
  fluid_levels_check: boolean('fluid_levels_check').notNull(),
  battery_condition: boolean('battery_condition').notNull(),
  tire_condition: boolean('tire_condition').notNull(),
  brake_system_check: boolean('brake_system_check').notNull(),
  lights_check: boolean('lights_check').notNull(),
  engine_visual_inspection: boolean('engine_visual_inspection').notNull(),
  additional_findings: text('additional_findings'),
  checked_by_id: integer('checked_by_id').references(() => usersTable.id).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull()
});

// Technical Analysis table
export const technicalAnalysisTable = pgTable('technical_analysis', {
  id: serial('id').primaryKey(),
  service_order_id: integer('service_order_id').references(() => serviceOrdersTable.id).notNull(),
  problem_description: text('problem_description').notNull(),
  root_cause_analysis: text('root_cause_analysis').notNull(),
  recommended_actions: text('recommended_actions').notNull(),
  visual_evidence_urls: jsonb('visual_evidence_urls').default('[]'), // Array of URLs
  analysis_date: date('analysis_date').defaultNow().notNull(),
  analyzed_by_id: integer('analyzed_by_id').references(() => usersTable.id).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull()
});

// Customer Education table
export const customerEducationTable = pgTable('customer_education', {
  id: serial('id').primaryKey(),
  service_order_id: integer('service_order_id').references(() => serviceOrdersTable.id).notNull(),
  explanation_provided: text('explanation_provided').notNull(),
  customer_questions: text('customer_questions'),
  understanding_level: educationOutcomeEnum('understanding_level').notNull(),
  additional_notes: text('additional_notes'),
  educated_by_id: integer('educated_by_id').references(() => usersTable.id).notNull(),
  education_date: date('education_date').defaultNow().notNull(),
  created_at: timestamp('created_at').defaultNow().notNull()
});

// Cost Estimations table
export const costEstimationsTable = pgTable('cost_estimations', {
  id: serial('id').primaryKey(),
  service_order_id: integer('service_order_id').references(() => serviceOrdersTable.id).notNull(),
  economic_tier_price: numeric('economic_tier_price', { precision: 10, scale: 2 }).notNull(),
  standard_tier_price: numeric('standard_tier_price', { precision: 10, scale: 2 }).notNull(),
  premium_tier_price: numeric('premium_tier_price', { precision: 10, scale: 2 }).notNull(),
  economic_description: text('economic_description').notNull(),
  standard_description: text('standard_description').notNull(),
  premium_description: text('premium_description').notNull(),
  customer_decision: estimationDecisionEnum('customer_decision').default('PENDING').notNull(),
  chosen_tier: pricingTierEnum('chosen_tier'),
  estimated_by_id: integer('estimated_by_id').references(() => usersTable.id).notNull(),
  estimation_date: date('estimation_date').defaultNow().notNull(),
  customer_response_date: date('customer_response_date'),
  created_at: timestamp('created_at').defaultNow().notNull()
});

// Work Execution table
export const workExecutionTable = pgTable('work_execution', {
  id: serial('id').primaryKey(),
  service_order_id: integer('service_order_id').references(() => serviceOrdersTable.id).notNull(),
  work_description: text('work_description').notNull(),
  parts_used: text('parts_used'),
  labor_hours: numeric('labor_hours', { precision: 5, scale: 2 }).notNull(),
  completion_checklist: jsonb('completion_checklist').default('{}'), // Object with checklist items
  work_photos: jsonb('work_photos').default('[]'), // Array of photo URLs
  executed_by_id: integer('executed_by_id').references(() => usersTable.id).notNull(),
  start_date: date('start_date').defaultNow().notNull(),
  completion_date: date('completion_date'),
  created_at: timestamp('created_at').defaultNow().notNull()
});

// Quality Control table
export const qualityControlTable = pgTable('quality_control', {
  id: serial('id').primaryKey(),
  service_order_id: integer('service_order_id').references(() => serviceOrdersTable.id).notNull(),
  qc_status: qcStatusEnum('qc_status').default('PENDING').notNull(),
  critical_factors_check: jsonb('critical_factors_check').default('{}'), // Object with factor checks
  defects_found: text('defects_found'),
  corrective_actions: text('corrective_actions'),
  final_approval: boolean('final_approval').default(false).notNull(),
  inspected_by_id: integer('inspected_by_id').references(() => usersTable.id).notNull(),
  inspection_date: date('inspection_date').defaultNow().notNull(),
  created_at: timestamp('created_at').defaultNow().notNull()
});

// Payments table
export const paymentsTable = pgTable('payments', {
  id: serial('id').primaryKey(),
  service_order_id: integer('service_order_id').references(() => serviceOrdersTable.id).notNull(),
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  payment_method: text('payment_method').notNull(),
  payment_status: paymentStatusEnum('payment_status').default('PENDING').notNull(),
  transaction_id: text('transaction_id'),
  payment_date: timestamp('payment_date'),
  created_by_id: integer('created_by_id').references(() => usersTable.id).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull()
});

// Analysis Templates table
export const analysisTemplatesTable = pgTable('analysis_templates', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  service_type: serviceTypeEnum('service_type').notNull(),
  template_content: text('template_content').notNull(),
  created_by_id: integer('created_by_id').references(() => usersTable.id).notNull(),
  is_active: boolean('is_active').default(true).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at')
});

// Estimation Library table
export const estimationLibraryTable = pgTable('estimation_library', {
  id: serial('id').primaryKey(),
  service_type: serviceTypeEnum('service_type').notNull(),
  service_name: text('service_name').notNull(),
  economic_price: numeric('economic_price', { precision: 10, scale: 2 }).notNull(),
  standard_price: numeric('standard_price', { precision: 10, scale: 2 }).notNull(),
  premium_price: numeric('premium_price', { precision: 10, scale: 2 }).notNull(),
  estimated_labor_hours: numeric('estimated_labor_hours', { precision: 5, scale: 2 }).notNull(),
  description: text('description'),
  created_by_id: integer('created_by_id').references(() => usersTable.id).notNull(),
  is_active: boolean('is_active').default(true).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at')
});

// WhatsApp Templates table
export const whatsappTemplatesTable = pgTable('whatsapp_templates', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(),
  type: whatsappMessageTypeEnum('type').notNull(),
  content: text('content').notNull(),
  created_by_id: integer('created_by_id').references(() => usersTable.id).notNull(),
  is_active: boolean('is_active').default(true).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at')
});

// Define relations
export const usersRelations = relations(usersTable, ({ many }) => ({
  serviceOrders: many(serviceOrdersTable),
  createdServiceOrders: many(serviceOrdersTable),
  initialChecks: many(initialChecksTable),
  technicalAnalyses: many(technicalAnalysisTable),
  customerEducations: many(customerEducationTable),
  costEstimations: many(costEstimationsTable),
  workExecutions: many(workExecutionTable),
  qualityControls: many(qualityControlTable),
  payments: many(paymentsTable),
  analysisTemplates: many(analysisTemplatesTable),
  estimationLibraries: many(estimationLibraryTable),
  whatsappTemplates: many(whatsappTemplatesTable)
}));

export const customersRelations = relations(customersTable, ({ many }) => ({
  vehicles: many(vehiclesTable),
  serviceOrders: many(serviceOrdersTable)
}));

export const vehiclesRelations = relations(vehiclesTable, ({ one, many }) => ({
  customer: one(customersTable, {
    fields: [vehiclesTable.customer_id],
    references: [customersTable.id]
  }),
  serviceOrders: many(serviceOrdersTable)
}));

export const serviceOrdersRelations = relations(serviceOrdersTable, ({ one, many }) => ({
  customer: one(customersTable, {
    fields: [serviceOrdersTable.customer_id],
    references: [customersTable.id]
  }),
  vehicle: one(vehiclesTable, {
    fields: [serviceOrdersTable.vehicle_id],
    references: [vehiclesTable.id]
  }),
  assignedMechanic: one(usersTable, {
    fields: [serviceOrdersTable.assigned_mechanic_id],
    references: [usersTable.id]
  }),
  createdBy: one(usersTable, {
    fields: [serviceOrdersTable.created_by_id],
    references: [usersTable.id]
  }),
  initialCheck: one(initialChecksTable),
  technicalAnalysis: one(technicalAnalysisTable),
  customerEducation: one(customerEducationTable),
  costEstimation: one(costEstimationsTable),
  workExecution: one(workExecutionTable),
  qualityControl: one(qualityControlTable),
  payments: many(paymentsTable)
}));

export const initialChecksRelations = relations(initialChecksTable, ({ one }) => ({
  serviceOrder: one(serviceOrdersTable, {
    fields: [initialChecksTable.service_order_id],
    references: [serviceOrdersTable.id]
  }),
  checkedBy: one(usersTable, {
    fields: [initialChecksTable.checked_by_id],
    references: [usersTable.id]
  })
}));

export const technicalAnalysisRelations = relations(technicalAnalysisTable, ({ one }) => ({
  serviceOrder: one(serviceOrdersTable, {
    fields: [technicalAnalysisTable.service_order_id],
    references: [serviceOrdersTable.id]
  }),
  analyzedBy: one(usersTable, {
    fields: [technicalAnalysisTable.analyzed_by_id],
    references: [usersTable.id]
  })
}));

export const customerEducationRelations = relations(customerEducationTable, ({ one }) => ({
  serviceOrder: one(serviceOrdersTable, {
    fields: [customerEducationTable.service_order_id],
    references: [serviceOrdersTable.id]
  }),
  educatedBy: one(usersTable, {
    fields: [customerEducationTable.educated_by_id],
    references: [usersTable.id]
  })
}));

export const costEstimationsRelations = relations(costEstimationsTable, ({ one }) => ({
  serviceOrder: one(serviceOrdersTable, {
    fields: [costEstimationsTable.service_order_id],
    references: [serviceOrdersTable.id]
  }),
  estimatedBy: one(usersTable, {
    fields: [costEstimationsTable.estimated_by_id],
    references: [usersTable.id]
  })
}));

export const workExecutionRelations = relations(workExecutionTable, ({ one }) => ({
  serviceOrder: one(serviceOrdersTable, {
    fields: [workExecutionTable.service_order_id],
    references: [serviceOrdersTable.id]
  }),
  executedBy: one(usersTable, {
    fields: [workExecutionTable.executed_by_id],
    references: [usersTable.id]
  })
}));

export const qualityControlRelations = relations(qualityControlTable, ({ one }) => ({
  serviceOrder: one(serviceOrdersTable, {
    fields: [qualityControlTable.service_order_id],
    references: [serviceOrdersTable.id]
  }),
  inspectedBy: one(usersTable, {
    fields: [qualityControlTable.inspected_by_id],
    references: [usersTable.id]
  })
}));

export const paymentsRelations = relations(paymentsTable, ({ one }) => ({
  serviceOrder: one(serviceOrdersTable, {
    fields: [paymentsTable.service_order_id],
    references: [serviceOrdersTable.id]
  }),
  createdBy: one(usersTable, {
    fields: [paymentsTable.created_by_id],
    references: [usersTable.id]
  })
}));

export const analysisTemplatesRelations = relations(analysisTemplatesTable, ({ one }) => ({
  createdBy: one(usersTable, {
    fields: [analysisTemplatesTable.created_by_id],
    references: [usersTable.id]
  })
}));

export const estimationLibraryRelations = relations(estimationLibraryTable, ({ one }) => ({
  createdBy: one(usersTable, {
    fields: [estimationLibraryTable.created_by_id],
    references: [usersTable.id]
  })
}));

export const whatsappTemplatesRelations = relations(whatsappTemplatesTable, ({ one }) => ({
  createdBy: one(usersTable, {
    fields: [whatsappTemplatesTable.created_by_id],
    references: [usersTable.id]
  })
}));

// Export all tables for relation queries
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
  whatsappTemplates: whatsappTemplatesTable
};
