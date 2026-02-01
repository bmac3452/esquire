import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export interface AnalysisResult {
  inconsistencies: Array<{
    text: string;
    issue: string;
    severity: 'high' | 'medium' | 'low';
    explanation: string;
  }>;
  constitutionalIssues: Array<{
    amendment: string;
    violation: string;
    severity: 'high' | 'medium' | 'low';
    explanation: string;
  }>;
  suggestedKeywords: string[];
  legalArguments: Array<{
    argument: string;
    strength: 'strong' | 'moderate' | 'weak';
    explanation: string;
  }>;
  summary: string;
}

export async function analyzeDocument(
  documentText: string,
  documentType: string
): Promise<AnalysisResult> {
  const systemPrompt = `You are an expert criminal defense attorney specializing in constitutional law and police procedure analysis. 
Analyze the provided ${documentType} for:
1. Internal inconsistencies or contradictions
2. Constitutional violations (4th, 5th, 6th, 14th Amendment issues)
3. Police procedure violations
4. Credibility issues
5. Potential legal arguments for the defense

Be thorough and specific. Flag anything that could be used to challenge the document's reliability or admissibility.`;

  const userPrompt = `Analyze this ${documentType}:

${documentText}

Provide a detailed JSON response with:
1. "inconsistencies": Array of specific contradictions or questionable statements
2. "constitutionalIssues": Array of potential constitutional violations
3. "suggestedKeywords": Array of legal keywords for case law research
4. "legalArguments": Array of potential defense arguments
5. "summary": Overall assessment and strategy recommendations

Format each finding with: text (quoted from document), issue, severity (high/medium/low), and detailed explanation.`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
      max_tokens: 4000
    });

    const content = completion.choices[0].message.content;
    const result = JSON.parse(content || '{}');
    return result as AnalysisResult;
  } catch (error) {
    console.error('OpenAI API error:', error);
    throw new Error('Failed to analyze document with AI');
  }
}

export async function findRelevantCaseLaws(
  keywords: string[],
  caseLaws: any[]
): Promise<any[]> {
  // Score each case law based on keyword matches
  const scoredCases = caseLaws.map(caseLaw => {
    let score = 0;
    const caseKeywords = caseLaw.keywords || [];
    
    keywords.forEach(keyword => {
      const keywordLower = keyword.toLowerCase();
      
      // Check if keyword appears in case keywords
      if (caseKeywords.some((ck: string) => ck.toLowerCase().includes(keywordLower))) {
        score += 10;
      }
      
      // Check if keyword appears in case name
      if (caseLaw.caseName.toLowerCase().includes(keywordLower)) {
        score += 8;
      }
      
      // Check if keyword appears in summary
      if (caseLaw.summary.toLowerCase().includes(keywordLower)) {
        score += 5;
      }
      
      // Check if keyword appears in relevant text
      if (caseLaw.relevantText.toLowerCase().includes(keywordLower)) {
        score += 3;
      }
    });
    
    return { ...caseLaw, relevanceScore: score };
  });
  
  // Return top 5 most relevant cases
  return scoredCases
    .filter(c => c.relevanceScore > 0)
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, 5);
}
