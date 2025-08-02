
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { analysisTemplatesTable, usersTable } from '../db/schema';
import { type CreateAnalysisTemplateInput } from '../schema';
import { createAnalysisTemplate } from '../handlers/create_analysis_template';
import { eq } from 'drizzle-orm';

describe('createAnalysisTemplate', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Create test user first
  const createTestUser = async () => {
    const userResult = await db.insert(usersTable)
      .values({
        username: 'test_mechanic',
        email: 'mechanic@test.com',
        password_hash: 'hashed_password',
        full_name: 'Test Mechanic',
        role: 'MECHANIC'
      })
      .returning()
      .execute();
    
    return userResult[0];
  };

  it('should create an analysis template', async () => {
    const testUser = await createTestUser();
    
    const testInput: CreateAnalysisTemplateInput = {
      name: 'Brake Service Template',
      service_type: 'BRAKE_SERVICE',
      template_content: 'Standard brake inspection checklist:\n1. Check brake pads\n2. Inspect rotors\n3. Test brake fluid',
      created_by_id: testUser.id
    };

    const result = await createAnalysisTemplate(testInput);

    // Basic field validation
    expect(result.name).toEqual('Brake Service Template');
    expect(result.service_type).toEqual('BRAKE_SERVICE');
    expect(result.template_content).toEqual(testInput.template_content);
    expect(result.created_by_id).toEqual(testUser.id);
    expect(result.is_active).toEqual(true);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeNull();
  });

  it('should save analysis template to database', async () => {
    const testUser = await createTestUser();
    
    const testInput: CreateAnalysisTemplateInput = {
      name: 'Engine Service Template',
      service_type: 'ENGINE_SERVICE',
      template_content: 'Engine diagnostic template:\n1. Check engine oil\n2. Inspect air filter\n3. Test spark plugs',
      created_by_id: testUser.id
    };

    const result = await createAnalysisTemplate(testInput);

    // Query using proper drizzle syntax
    const templates = await db.select()
      .from(analysisTemplatesTable)
      .where(eq(analysisTemplatesTable.id, result.id))
      .execute();

    expect(templates).toHaveLength(1);
    expect(templates[0].name).toEqual('Engine Service Template');
    expect(templates[0].service_type).toEqual('ENGINE_SERVICE');
    expect(templates[0].template_content).toEqual(testInput.template_content);
    expect(templates[0].created_by_id).toEqual(testUser.id);
    expect(templates[0].is_active).toEqual(true);
    expect(templates[0].created_at).toBeInstanceOf(Date);
  });

  it('should create template with different service types', async () => {
    const testUser = await createTestUser();
    
    const testInputs: CreateAnalysisTemplateInput[] = [
      {
        name: 'General Service Template',
        service_type: 'GENERAL_SERVICE',
        template_content: 'General maintenance checklist',
        created_by_id: testUser.id
      },
      {
        name: 'AC Service Template',
        service_type: 'AC_SERVICE',
        template_content: 'AC system diagnosis steps',
        created_by_id: testUser.id
      },
      {
        name: 'Electrical Service Template',
        service_type: 'ELECTRICAL_SERVICE',
        template_content: 'Electrical system troubleshooting',
        created_by_id: testUser.id
      }
    ];

    for (const input of testInputs) {
      const result = await createAnalysisTemplate(input);
      expect(result.service_type).toEqual(input.service_type);
      expect(result.name).toEqual(input.name);
      expect(result.is_active).toEqual(true);
    }

    // Verify all templates are in database
    const allTemplates = await db.select()
      .from(analysisTemplatesTable)
      .where(eq(analysisTemplatesTable.created_by_id, testUser.id))
      .execute();

    expect(allTemplates).toHaveLength(3);
    const serviceTypes = allTemplates.map(t => t.service_type);
    expect(serviceTypes).toContain('GENERAL_SERVICE');
    expect(serviceTypes).toContain('AC_SERVICE');
    expect(serviceTypes).toContain('ELECTRICAL_SERVICE');
  });

  it('should throw error for non-existent user', async () => {
    const testInput: CreateAnalysisTemplateInput = {
      name: 'Invalid Template',
      service_type: 'BRAKE_SERVICE',
      template_content: 'Some content',
      created_by_id: 99999 // Non-existent user ID
    };

    await expect(createAnalysisTemplate(testInput)).rejects.toThrow(/violates foreign key constraint/i);
  });
});
