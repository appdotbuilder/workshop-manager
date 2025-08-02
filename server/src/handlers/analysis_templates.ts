
import { db } from '../db';
import { analysisTemplatesTable } from '../db/schema';
import { type CreateAnalysisTemplateInput, type AnalysisTemplate } from '../schema';
import { eq, and } from 'drizzle-orm';

export const createAnalysisTemplate = async (input: CreateAnalysisTemplateInput): Promise<AnalysisTemplate> => {
  try {
    const result = await db.insert(analysisTemplatesTable)
      .values({
        name: input.name,
        service_type: input.service_type,
        template_content: input.template_content,
        created_by_id: input.created_by_id
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Analysis template creation failed:', error);
    throw error;
  }
};

export const getAnalysisTemplates = async (): Promise<AnalysisTemplate[]> => {
  try {
    const results = await db.select()
      .from(analysisTemplatesTable)
      .where(eq(analysisTemplatesTable.is_active, true))
      .execute();

    return results;
  } catch (error) {
    console.error('Fetching analysis templates failed:', error);
    throw error;
  }
};

export const getAnalysisTemplatesByServiceType = async (serviceType: string): Promise<AnalysisTemplate[]> => {
  try {
    const results = await db.select()
      .from(analysisTemplatesTable)
      .where(
        and(
          eq(analysisTemplatesTable.service_type, serviceType as any),
          eq(analysisTemplatesTable.is_active, true)
        )
      )
      .execute();

    return results;
  } catch (error) {
    console.error('Fetching analysis templates by service type failed:', error);
    throw error;
  }
};

export const updateAnalysisTemplate = async (id: number, input: Partial<CreateAnalysisTemplateInput>): Promise<AnalysisTemplate | null> => {
  try {
    const updateData: any = {
      updated_at: new Date()
    };

    if (input.name !== undefined) {
      updateData.name = input.name;
    }
    if (input.service_type !== undefined) {
      updateData.service_type = input.service_type;
    }
    if (input.template_content !== undefined) {
      updateData.template_content = input.template_content;
    }

    const result = await db.update(analysisTemplatesTable)
      .set(updateData)
      .where(eq(analysisTemplatesTable.id, id))
      .returning()
      .execute();

    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error('Analysis template update failed:', error);
    throw error;
  }
};

export const deleteAnalysisTemplate = async (id: number): Promise<boolean> => {
  try {
    const result = await db.update(analysisTemplatesTable)
      .set({ 
        is_active: false,
        updated_at: new Date()
      })
      .where(eq(analysisTemplatesTable.id, id))
      .returning()
      .execute();

    return result.length > 0;
  } catch (error) {
    console.error('Analysis template deletion failed:', error);
    throw error;
  }
};

export const getAnalysisTemplateById = async (id: number): Promise<AnalysisTemplate | null> => {
  try {
    const results = await db.select()
      .from(analysisTemplatesTable)
      .where(eq(analysisTemplatesTable.id, id))
      .execute();

    return results.length > 0 ? results[0] : null;
  } catch (error) {
    console.error('Fetching analysis template by ID failed:', error);
    throw error;
  }
};
