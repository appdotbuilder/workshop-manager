
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { analysisTemplatesTable, usersTable } from '../db/schema';
import { type CreateAnalysisTemplateInput } from '../schema';
import { 
  createAnalysisTemplate, 
  getAnalysisTemplates, 
  getAnalysisTemplatesByServiceType,
  updateAnalysisTemplate,
  deleteAnalysisTemplate,
  getAnalysisTemplateById
} from '../handlers/analysis_templates';
import { eq } from 'drizzle-orm';

describe('Analysis Templates', () => {
  let testUserId: number;

  beforeEach(async () => {
    await createDB();
    
    // Create test user
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
    
    testUserId = userResult[0].id;
  });

  afterEach(resetDB);

  describe('createAnalysisTemplate', () => {
    const testInput: CreateAnalysisTemplateInput = {
      name: 'Brake System Analysis',
      service_type: 'BRAKE_SERVICE',
      template_content: 'Check brake pads, rotors, and fluid levels. Measure thickness and look for wear patterns.',
      created_by_id: 0 // Will be set in test
    };

    it('should create an analysis template', async () => {
      const input = { ...testInput, created_by_id: testUserId };
      const result = await createAnalysisTemplate(input);

      expect(result.name).toEqual('Brake System Analysis');
      expect(result.service_type).toEqual('BRAKE_SERVICE');
      expect(result.template_content).toEqual(testInput.template_content);
      expect(result.created_by_id).toEqual(testUserId);
      expect(result.is_active).toBe(true);
      expect(result.id).toBeDefined();
      expect(result.created_at).toBeInstanceOf(Date);
    });

    it('should save template to database', async () => {
      const input = { ...testInput, created_by_id: testUserId };
      const result = await createAnalysisTemplate(input);

      const templates = await db.select()
        .from(analysisTemplatesTable)
        .where(eq(analysisTemplatesTable.id, result.id))
        .execute();

      expect(templates).toHaveLength(1);
      expect(templates[0].name).toEqual('Brake System Analysis');
      expect(templates[0].service_type).toEqual('BRAKE_SERVICE');
      expect(templates[0].is_active).toBe(true);
    });

    it('should handle foreign key constraint violation', async () => {
      const input = { ...testInput, created_by_id: 999999 }; // Non-existent user
      
      await expect(createAnalysisTemplate(input)).rejects.toThrow(/violates foreign key constraint/);
    });
  });

  describe('getAnalysisTemplates', () => {
    beforeEach(async () => {
      // Create test templates
      await db.insert(analysisTemplatesTable)
        .values([
          {
            name: 'Engine Analysis',
            service_type: 'ENGINE_SERVICE',
            template_content: 'Engine diagnostic template',
            created_by_id: testUserId,
            is_active: true
          },
          {
            name: 'Brake Analysis',
            service_type: 'BRAKE_SERVICE',
            template_content: 'Brake diagnostic template',
            created_by_id: testUserId,
            is_active: true
          },
          {
            name: 'Inactive Template',
            service_type: 'AC_SERVICE',
            template_content: 'Inactive template',
            created_by_id: testUserId,
            is_active: false
          }
        ])
        .execute();
    });

    it('should return all active templates', async () => {
      const templates = await getAnalysisTemplates();

      expect(templates).toHaveLength(2);
      templates.forEach(template => {
        expect(template.is_active).toBe(true);
        expect(template.name).toBeDefined();
        expect(template.service_type).toBeDefined();
        expect(template.template_content).toBeDefined();
      });
    });

    it('should not return inactive templates', async () => {
      const templates = await getAnalysisTemplates();
      
      const inactiveTemplate = templates.find(t => t.name === 'Inactive Template');
      expect(inactiveTemplate).toBeUndefined();
    });
  });

  describe('getAnalysisTemplatesByServiceType', () => {
    beforeEach(async () => {
      await db.insert(analysisTemplatesTable)
        .values([
          {
            name: 'Engine Analysis 1',
            service_type: 'ENGINE_SERVICE',
            template_content: 'Engine template 1',
            created_by_id: testUserId,
            is_active: true
          },
          {
            name: 'Engine Analysis 2',
            service_type: 'ENGINE_SERVICE',
            template_content: 'Engine template 2',
            created_by_id: testUserId,
            is_active: true
          },
          {
            name: 'Brake Analysis',
            service_type: 'BRAKE_SERVICE',
            template_content: 'Brake template',
            created_by_id: testUserId,
            is_active: true
          }
        ])
        .execute();
    });

    it('should return templates for specific service type', async () => {
      const templates = await getAnalysisTemplatesByServiceType('ENGINE_SERVICE');

      expect(templates).toHaveLength(2);
      templates.forEach(template => {
        expect(template.service_type).toEqual('ENGINE_SERVICE');
        expect(template.is_active).toBe(true);
      });
    });

    it('should return empty array for valid but unused service type', async () => {
      const templates = await getAnalysisTemplatesByServiceType('TIRE_SERVICE');

      expect(templates).toHaveLength(0);
    });

    it('should handle invalid service type', async () => {
      // Test with a properly typed but non-existent service type by casting
      await expect(
        getAnalysisTemplatesByServiceType('INVALID_TYPE' as any)
      ).rejects.toThrow(/invalid input value for enum/);
    });
  });

  describe('updateAnalysisTemplate', () => {
    let templateId: number;

    beforeEach(async () => {
      const result = await db.insert(analysisTemplatesTable)
        .values({
          name: 'Original Template',
          service_type: 'ENGINE_SERVICE',
          template_content: 'Original content',
          created_by_id: testUserId,
          is_active: true
        })
        .returning()
        .execute();
      
      templateId = result[0].id;
    });

    it('should update template name', async () => {
      const result = await updateAnalysisTemplate(templateId, {
        name: 'Updated Template Name'
      });

      expect(result).not.toBeNull();
      expect(result!.name).toEqual('Updated Template Name');
      expect(result!.service_type).toEqual('ENGINE_SERVICE');
      expect(result!.template_content).toEqual('Original content');
      expect(result!.updated_at).toBeInstanceOf(Date);
    });

    it('should update template content', async () => {
      const result = await updateAnalysisTemplate(templateId, {
        template_content: 'Updated content with new instructions'
      });

      expect(result).not.toBeNull();
      expect(result!.template_content).toEqual('Updated content with new instructions');
      expect(result!.name).toEqual('Original Template');
    });

    it('should update service type', async () => {
      const result = await updateAnalysisTemplate(templateId, {
        service_type: 'BRAKE_SERVICE'
      });

      expect(result).not.toBeNull();
      expect(result!.service_type).toEqual('BRAKE_SERVICE');
    });

    it('should update multiple fields', async () => {
      const result = await updateAnalysisTemplate(templateId, {
        name: 'Multi-Update Template',
        service_type: 'TRANSMISSION_SERVICE',
        template_content: 'Multi-updated content'
      });

      expect(result).not.toBeNull();
      expect(result!.name).toEqual('Multi-Update Template');
      expect(result!.service_type).toEqual('TRANSMISSION_SERVICE');
      expect(result!.template_content).toEqual('Multi-updated content');
    });

    it('should return null for non-existent template', async () => {
      const result = await updateAnalysisTemplate(999999, {
        name: 'Should not work'
      });

      expect(result).toBeNull();
    });
  });

  describe('deleteAnalysisTemplate', () => {
    let templateId: number;

    beforeEach(async () => {
      const result = await db.insert(analysisTemplatesTable)
        .values({
          name: 'Template to Delete',
          service_type: 'AC_SERVICE',
          template_content: 'Template content',
          created_by_id: testUserId,
          is_active: true
        })
        .returning()
        .execute();
      
      templateId = result[0].id;
    });

    it('should soft delete template', async () => {
      const result = await deleteAnalysisTemplate(templateId);

      expect(result).toBe(true);

      // Verify template is marked inactive
      const templates = await db.select()
        .from(analysisTemplatesTable)
        .where(eq(analysisTemplatesTable.id, templateId))
        .execute();

      expect(templates).toHaveLength(1);
      expect(templates[0].is_active).toBe(false);
      expect(templates[0].updated_at).toBeInstanceOf(Date);
    });

    it('should not appear in active templates after deletion', async () => {
      await deleteAnalysisTemplate(templateId);

      const activeTemplates = await getAnalysisTemplates();
      const deletedTemplate = activeTemplates.find(t => t.id === templateId);
      
      expect(deletedTemplate).toBeUndefined();
    });

    it('should return false for non-existent template', async () => {
      const result = await deleteAnalysisTemplate(999999);

      expect(result).toBe(false);
    });
  });

  describe('getAnalysisTemplateById', () => {
    let templateId: number;

    beforeEach(async () => {
      const result = await db.insert(analysisTemplatesTable)
        .values({
          name: 'Specific Template',
          service_type: 'ELECTRICAL_SERVICE',
          template_content: 'Electrical diagnostic content',
          created_by_id: testUserId,
          is_active: true
        })
        .returning()
        .execute();
      
      templateId = result[0].id;
    });

    it('should return template by ID', async () => {
      const template = await getAnalysisTemplateById(templateId);

      expect(template).not.toBeNull();
      expect(template!.id).toEqual(templateId);
      expect(template!.name).toEqual('Specific Template');
      expect(template!.service_type).toEqual('ELECTRICAL_SERVICE');
      expect(template!.template_content).toEqual('Electrical diagnostic content');
    });

    it('should return null for non-existent ID', async () => {
      const template = await getAnalysisTemplateById(999999);

      expect(template).toBeNull();
    });

    it('should return inactive templates', async () => {
      // Soft delete the template
      await deleteAnalysisTemplate(templateId);

      // Should still be able to retrieve by ID
      const template = await getAnalysisTemplateById(templateId);

      expect(template).not.toBeNull();
      expect(template!.is_active).toBe(false);
    });
  });
});
