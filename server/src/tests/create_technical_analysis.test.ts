
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { technicalAnalysisTable, serviceOrdersTable, customersTable, vehiclesTable, usersTable } from '../db/schema';
import { type CreateTechnicalAnalysisInput } from '../schema';
import { createTechnicalAnalysis } from '../handlers/create_technical_analysis';
import { eq } from 'drizzle-orm';

describe('createTechnicalAnalysis', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let userId: number;
  let customerId: number;
  let vehicleId: number;
  let serviceOrderId: number;

  beforeEach(async () => {
    // Create user
    const userResult = await db.insert(usersTable)
      .values({
        username: 'mechanic1',
        email: 'mechanic@test.com',
        password_hash: 'hashed_password',
        full_name: 'Test Mechanic',
        role: 'MECHANIC'
      })
      .returning()
      .execute();
    userId = userResult[0].id;

    // Create customer
    const customerResult = await db.insert(customersTable)
      .values({
        name: 'Test Customer',
        phone: '1234567890',
        email: 'customer@test.com'
      })
      .returning()
      .execute();
    customerId = customerResult[0].id;

    // Create vehicle
    const vehicleResult = await db.insert(vehiclesTable)
      .values({
        customer_id: customerId,
        make: 'Toyota',
        model: 'Camry',
        year: 2020,
        license_plate: 'ABC123'
      })
      .returning()
      .execute();
    vehicleId = vehicleResult[0].id;

    // Create service order
    const serviceOrderResult = await db.insert(serviceOrdersTable)
      .values({
        order_number: 'SO-2024-001',
        customer_id: customerId,
        vehicle_id: vehicleId,
        service_types: ['BRAKE_SERVICE'],
        complaints: 'Brake noise',
        created_by_id: userId
      })
      .returning()
      .execute();
    serviceOrderId = serviceOrderResult[0].id;
  });

  const testInput: CreateTechnicalAnalysisInput = {
    service_order_id: 0, // Will be set in tests
    problem_description: 'Worn brake pads causing noise',
    root_cause_analysis: 'Brake pads have exceeded wear limit due to normal usage',
    recommended_actions: 'Replace front brake pads and resurface rotors',
    visual_evidence_urls: ['https://example.com/brake1.jpg', 'https://example.com/brake2.jpg'],
    analyzed_by_id: 0 // Will be set in tests
  };

  it('should create a technical analysis', async () => {
    const input = {
      ...testInput,
      service_order_id: serviceOrderId,
      analyzed_by_id: userId
    };

    const result = await createTechnicalAnalysis(input);

    expect(result.service_order_id).toEqual(serviceOrderId);
    expect(result.problem_description).toEqual('Worn brake pads causing noise');
    expect(result.root_cause_analysis).toEqual(input.root_cause_analysis);
    expect(result.recommended_actions).toEqual(input.recommended_actions);
    expect(result.visual_evidence_urls).toEqual(['https://example.com/brake1.jpg', 'https://example.com/brake2.jpg']);
    expect(result.analyzed_by_id).toEqual(userId);
    expect(result.id).toBeDefined();
    expect(result.analysis_date).toBeInstanceOf(Date);
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save technical analysis to database', async () => {
    const input = {
      ...testInput,
      service_order_id: serviceOrderId,
      analyzed_by_id: userId
    };

    const result = await createTechnicalAnalysis(input);

    const analyses = await db.select()
      .from(technicalAnalysisTable)
      .where(eq(technicalAnalysisTable.id, result.id))
      .execute();

    expect(analyses).toHaveLength(1);
    expect(analyses[0].problem_description).toEqual('Worn brake pads causing noise');
    expect(analyses[0].service_order_id).toEqual(serviceOrderId);
    expect(analyses[0].analyzed_by_id).toEqual(userId);
    expect(analyses[0].visual_evidence_urls).toEqual([
      'https://example.com/brake1.jpg',
      'https://example.com/brake2.jpg'
    ]);
  });

  it('should handle empty visual evidence urls', async () => {
    const input = {
      ...testInput,
      service_order_id: serviceOrderId,
      analyzed_by_id: userId,
      visual_evidence_urls: undefined
    };

    const result = await createTechnicalAnalysis(input);

    expect(result.visual_evidence_urls).toEqual([]);
    
    const analyses = await db.select()
      .from(technicalAnalysisTable)
      .where(eq(technicalAnalysisTable.id, result.id))
      .execute();

    expect(analyses[0].visual_evidence_urls).toEqual([]);
  });

  it('should throw error for non-existent service order', async () => {
    const input = {
      ...testInput,
      service_order_id: 99999,
      analyzed_by_id: userId
    };

    expect(createTechnicalAnalysis(input)).rejects.toThrow(/service order not found/i);
  });
});
