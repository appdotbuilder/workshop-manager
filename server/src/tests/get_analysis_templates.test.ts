
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { analysisTemplatesTable, usersTable } from '../db/schema';
import { type CreateAnalysisTemplateInput } from '../schema';
import { getAnalysisTemplates } from '../handlers/get_analysis_templates';

describe('getAnalysisTemplates', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no templates exist', async () => {
    const result = await getAnalysisTemplates();
    expect(result).toEqual([]);
  });

  it('should return all analysis templates', async () => {
    // Create test user first
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashed',
        full_name: 'Test User',
        role: 'MECHANIC'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create first template
    await db.insert(analysisTemplatesTable)
      .values({
        name: 'Brake Service Template',
        service_type: 'BRAKE_SERVICE',
        template_content: 'Standard brake service analysis template',
        created_by_id: userId
      })
      .execute();

    // Small delay to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));

    // Create second template
    await db.insert(analysisTemplatesTable)
      .values({
        name: 'Engine Service Template',
        service_type: 'ENGINE_SERVICE',
        template_content: 'Standard engine service analysis template',
        created_by_id: userId
      })
      .execute();

    const result = await getAnalysisTemplates();

    expect(result).toHaveLength(2);
    expect(result[0].name).toEqual('Engine Service Template'); // Most recent first
    expect(result[0].service_type).toEqual('ENGINE_SERVICE');
    expect(result[0].template_content).toEqual('Standard engine service analysis template');
    expect(result[0].is_active).toBe(true);
    expect(result[0].created_at).toBeInstanceOf(Date);

    expect(result[1].name).toEqual('Brake Service Template');
    expect(result[1].service_type).toEqual('BRAKE_SERVICE');
    expect(result[1].template_content).toEqual('Standard brake service analysis template');
    expect(result[1].is_active).toBe(true);
    expect(result[1].created_at).toBeInstanceOf(Date);
  });

  it('should return templates ordered by creation date descending', async () => {
    // Create test user first
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashed',
        full_name: 'Test User',
        role: 'MECHANIC'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create first template
    await db.insert(analysisTemplatesTable)
      .values({
        name: 'First Template',
        service_type: 'GENERAL_SERVICE',
        template_content: 'First template content',
        created_by_id: userId
      })
      .execute();

    // Small delay to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));

    // Create second template
    await db.insert(analysisTemplatesTable)
      .values({
        name: 'Second Template',
        service_type: 'BRAKE_SERVICE',
        template_content: 'Second template content',
        created_by_id: userId
      })
      .execute();

    const result = await getAnalysisTemplates();

    expect(result).toHaveLength(2);
    expect(result[0].name).toEqual('Second Template'); // Most recent first
    expect(result[1].name).toEqual('First Template');
    expect(result[0].created_at.getTime()).toBeGreaterThan(result[1].created_at.getTime());
  });

  it('should include both active and inactive templates', async () => {
    // Create test user first
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashed',
        full_name: 'Test User',
        role: 'MECHANIC'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create active and inactive templates
    await db.insert(analysisTemplatesTable)
      .values([
        {
          name: 'Active Template',
          service_type: 'GENERAL_SERVICE',
          template_content: 'Active template content',
          created_by_id: userId,
          is_active: true
        },
        {
          name: 'Inactive Template',
          service_type: 'ENGINE_SERVICE',
          template_content: 'Inactive template content',
          created_by_id: userId,
          is_active: false
        }
      ])
      .execute();

    const result = await getAnalysisTemplates();

    expect(result).toHaveLength(2);
    
    const activeTemplate = result.find(t => t.name === 'Active Template');
    const inactiveTemplate = result.find(t => t.name === 'Inactive Template');

    expect(activeTemplate).toBeDefined();
    expect(activeTemplate!.is_active).toBe(true);
    expect(inactiveTemplate).toBeDefined();
    expect(inactiveTemplate!.is_active).toBe(false);
  });
});
