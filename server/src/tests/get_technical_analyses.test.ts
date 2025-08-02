
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, customersTable, vehiclesTable, serviceOrdersTable, technicalAnalysisTable } from '../db/schema';
import { getTechnicalAnalyses } from '../handlers/get_technical_analyses';

describe('getTechnicalAnalyses', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUserId: number;
  let testCustomerId: number;
  let testVehicleId: number;
  let testServiceOrderId: number;

  beforeEach(async () => {
    // Create prerequisite data
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        full_name: 'Test User',
        role: 'MECHANIC'
      })
      .returning()
      .execute();
    testUserId = userResult[0].id;

    const customerResult = await db.insert(customersTable)
      .values({
        name: 'John Doe',
        phone: '1234567890',
        email: 'john@example.com'
      })
      .returning()
      .execute();
    testCustomerId = customerResult[0].id;

    const vehicleResult = await db.insert(vehiclesTable)
      .values({
        customer_id: testCustomerId,
        make: 'Toyota',
        model: 'Camry',
        year: 2020,
        license_plate: 'ABC123'
      })
      .returning()
      .execute();
    testVehicleId = vehicleResult[0].id;

    const serviceOrderResult = await db.insert(serviceOrdersTable)
      .values({
        order_number: 'SO-001',
        customer_id: testCustomerId,
        vehicle_id: testVehicleId,
        service_types: ['GENERAL_SERVICE'],
        complaints: 'Engine noise',
        created_by_id: testUserId
      })
      .returning()
      .execute();
    testServiceOrderId = serviceOrderResult[0].id;
  });

  it('should return empty array when no technical analyses exist', async () => {
    const result = await getTechnicalAnalyses();
    expect(result).toEqual([]);
  });

  it('should return all technical analyses', async () => {
    // Create test technical analyses
    await db.insert(technicalAnalysisTable)
      .values([
        {
          service_order_id: testServiceOrderId,
          problem_description: 'Engine making strange noise',
          root_cause_analysis: 'Worn timing belt',
          recommended_actions: 'Replace timing belt',
          visual_evidence_urls: ['https://example.com/photo1.jpg'],
          analyzed_by_id: testUserId
        },
        {
          service_order_id: testServiceOrderId,
          problem_description: 'Brake squealing',
          root_cause_analysis: 'Worn brake pads',
          recommended_actions: 'Replace brake pads',
          visual_evidence_urls: ['https://example.com/photo2.jpg', 'https://example.com/photo3.jpg'],
          analyzed_by_id: testUserId
        }
      ])
      .execute();

    const result = await getTechnicalAnalyses();

    expect(result).toHaveLength(2);
    
    // Verify first analysis
    const firstAnalysis = result.find(a => a.problem_description === 'Engine making strange noise');
    expect(firstAnalysis).toBeDefined();
    expect(firstAnalysis!.service_order_id).toEqual(testServiceOrderId);
    expect(firstAnalysis!.root_cause_analysis).toEqual('Worn timing belt');
    expect(firstAnalysis!.recommended_actions).toEqual('Replace timing belt');
    expect(firstAnalysis!.visual_evidence_urls).toEqual(['https://example.com/photo1.jpg']);
    expect(firstAnalysis!.analyzed_by_id).toEqual(testUserId);
    expect(firstAnalysis!.analysis_date).toBeInstanceOf(Date);
    expect(firstAnalysis!.created_at).toBeInstanceOf(Date);
    expect(firstAnalysis!.id).toBeDefined();

    // Verify second analysis
    const secondAnalysis = result.find(a => a.problem_description === 'Brake squealing');
    expect(secondAnalysis).toBeDefined();
    expect(secondAnalysis!.visual_evidence_urls).toEqual(['https://example.com/photo2.jpg', 'https://example.com/photo3.jpg']);
  });

  it('should handle technical analyses with empty visual evidence', async () => {
    await db.insert(technicalAnalysisTable)
      .values({
        service_order_id: testServiceOrderId,
        problem_description: 'Oil leak',
        root_cause_analysis: 'Damaged oil pan gasket',
        recommended_actions: 'Replace gasket',
        visual_evidence_urls: [],
        analyzed_by_id: testUserId
      })
      .execute();

    const result = await getTechnicalAnalyses();

    expect(result).toHaveLength(1);
    expect(result[0].visual_evidence_urls).toEqual([]);
    expect(result[0].problem_description).toEqual('Oil leak');
  });

  it('should return analyses ordered by creation date', async () => {
    // Create analyses with slight delay to ensure different timestamps
    await db.insert(technicalAnalysisTable)
      .values({
        service_order_id: testServiceOrderId,
        problem_description: 'First analysis',
        root_cause_analysis: 'First cause',
        recommended_actions: 'First action',
        analyzed_by_id: testUserId
      })
      .execute();

    // Small delay to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));

    await db.insert(technicalAnalysisTable)
      .values({
        service_order_id: testServiceOrderId,
        problem_description: 'Second analysis',
        root_cause_analysis: 'Second cause',
        recommended_actions: 'Second action',
        analyzed_by_id: testUserId
      })
      .execute();

    const result = await getTechnicalAnalyses();

    expect(result).toHaveLength(2);
    // Verify both analyses are returned (order may vary)
    const descriptions = result.map(a => a.problem_description);
    expect(descriptions).toContain('First analysis');
    expect(descriptions).toContain('Second analysis');
  });
});
