
import { db } from '../db';
import { analysisTemplatesTable } from '../db/schema';
import { type CreateAnalysisTemplateInput, type AnalysisTemplate } from '../schema';

export const createAnalysisTemplate = async (input: CreateAnalysisTemplateInput): Promise<AnalysisTemplate> => {
  try {
    // Insert analysis template record
    const result = await db.insert(analysisTemplatesTable)
      .values({
        name: input.name,
        service_type: input.service_type,
        template_content: input.template_content,
        created_by_id: input.created_by_id
      })
      .returning()
      .execute();

    const template = result[0];
    return template;
  } catch (error) {
    console.error('Analysis template creation failed:', error);
    throw error;
  }
};
