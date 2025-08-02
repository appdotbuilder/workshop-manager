
import { db } from '../db';
import { technicalAnalysisTable } from '../db/schema';
import { type TechnicalAnalysis } from '../schema';

export const getTechnicalAnalyses = async (): Promise<TechnicalAnalysis[]> => {
  try {
    const results = await db.select()
      .from(technicalAnalysisTable)
      .execute();

    // Convert date fields and ensure proper types
    return results.map(analysis => ({
      ...analysis,
      visual_evidence_urls: analysis.visual_evidence_urls as string[], // Cast JSONB to string array
      analysis_date: new Date(analysis.analysis_date), // Ensure Date object
      created_at: new Date(analysis.created_at) // Ensure Date object
    }));
  } catch (error) {
    console.error('Failed to fetch technical analyses:', error);
    throw error;
  }
};
