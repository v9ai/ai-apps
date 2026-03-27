/**
 * Validate Job Posting Analysis
 * 
 * Script to validate that a job analysis contains all required fields
 * and follows the proper format.
 */

interface JobAnalysis {
  title: string;
  company: string;
  industry?: string;
  remoteEU: 'yes' | 'maybe' | 'no';
  salary?: string;
  requirements: string[];
  technicalStack: Array<{ skill: string; priority: 'required' | 'preferred'; note?: string }>;
  companyContext?: {
    size?: string;
    stage?: string;
    industry?: string;
  };
  notes?: string;
  matchScore?: number;
  redFlags?: string[];
}

/**
 * Validate a job analysis object
 */
export function validateAnalysis(analysis: Partial<JobAnalysis>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Required fields
  if (!analysis.title) errors.push('Missing: job title');
  if (!analysis.company) errors.push('Missing: company name');
  if (!analysis.remoteEU) {
    errors.push('Missing: remote EU classification');
  } else if (!['yes', 'maybe', 'no'].includes(analysis.remoteEU)) {
    errors.push('Invalid remote EU value: must be yes, maybe, or no');
  }

  // Arrays must be present
  if (!analysis.requirements || analysis.requirements.length === 0) {
    errors.push('Missing: key requirements');
  }
  if (!analysis.technicalStack || analysis.technicalStack.length === 0) {
    errors.push('Missing: technical stack');
  }

  // Technical stack validation
  if (analysis.technicalStack) {
    analysis.technicalStack.forEach((item, idx) => {
      if (!item.skill) errors.push(`Technical stack item ${idx}: missing skill name`);
      if (!item.priority || !['required', 'preferred'].includes(item.priority)) {
        errors.push(`Technical stack item ${idx}: priority must be 'required' or 'preferred'`);
      }
    });
  }

  // Match score validation
  if (analysis.matchScore !== undefined) {
    if (analysis.matchScore < 0 || analysis.matchScore > 10) {
      errors.push('Match score must be between 0 and 10');
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Format analysis for display
 */
export function formatAnalysis(analysis: JobAnalysis): string {
  let output = `**Job Title:** ${analysis.title}\n`;
  output += `**Company:** ${analysis.company}`;
  if (analysis.industry) output += ` (${analysis.industry})`;
  output += '\n';
  
  const remoteIcon = analysis.remoteEU === 'yes' ? '✅' : analysis.remoteEU === 'maybe' ? '⚠️' : '❌';
  output += `**Remote EU:** ${remoteIcon} ${analysis.remoteEU.charAt(0).toUpperCase() + analysis.remoteEU.slice(1)}\n`;
  
  if (analysis.salary) {
    output += `**Salary:** ${analysis.salary}\n`;
  }
  
  output += '\n**Key Requirements:**\n';
  analysis.requirements.forEach(req => {
    output += `- ${req}\n`;
  });
  
  output += '\n**Technical Stack:**\n';
  analysis.technicalStack.forEach(tech => {
    output += `- ${tech.skill} (${tech.priority})`;
    if (tech.note) output += ` - ${tech.note}`;
    output += '\n';
  });
  
  if (analysis.companyContext) {
    output += '\n**Company Context:**\n';
    if (analysis.companyContext.size) output += `- Size: ${analysis.companyContext.size}\n`;
    if (analysis.companyContext.stage) output += `- Stage: ${analysis.companyContext.stage}\n`;
    if (analysis.companyContext.industry) output += `- Industry: ${analysis.companyContext.industry}\n`;
  }
  
  if (analysis.notes) {
    output += `\n**Notes:**\n${analysis.notes}\n`;
  }
  
  if (analysis.redFlags && analysis.redFlags.length > 0) {
    output += '\n**Red Flags:**\n';
    analysis.redFlags.forEach(flag => {
      output += `🚩 ${flag}\n`;
    });
  }
  
  if (analysis.matchScore !== undefined) {
    output += `\n**Match Score:** ${analysis.matchScore}/10\n`;
  }
  
  return output;
}

/**
 * Extract remote EU classification from job text
 */
export function classifyRemoteEU(jobText: string): 'yes' | 'maybe' | 'no' {
  const text = jobText.toLowerCase();
  
  // Positive indicators
  const remoteKeywords = ['remote', 'work from home', 'wfh', 'distributed', 'remote-first'];
  const euKeywords = ['europe', 'european union', 'eu ', 'cet', 'cest', 'gmt', 'bst'];
  const euCountries = ['germany', 'france', 'spain', 'italy', 'netherlands', 'belgium', 'austria', 
                      'portugal', 'sweden', 'denmark', 'finland', 'poland', 'ireland'];
  
  // Negative indicators
  const officeKeywords = ['in-office', 'on-site', 'hybrid', 'relocation required'];
  const nonEuOnly = ['us only', 'uk only', 'local candidates only'];
  
  const hasRemote = remoteKeywords.some(kw => text.includes(kw));
  const hasEU = euKeywords.some(kw => text.includes(kw)) || 
                euCountries.some(country => text.includes(country));
  const hasOfficeReq = officeKeywords.some(kw => text.includes(kw));
  const hasNonEuOnly = nonEuOnly.some(kw => text.includes(kw));
  
  if (hasNonEuOnly || (hasOfficeReq && !hasEU)) {
    return 'no';
  }
  
  if (hasRemote && hasEU) {
    return 'yes';
  }
  
  if (hasRemote || hasEU) {
    return 'maybe';
  }
  
  return 'no';
}

// Example usage
if (import.meta.main) {
  const exampleAnalysis: JobAnalysis = {
    title: 'Senior Full-Stack Engineer',
    company: 'Acme Corp',
    industry: 'SaaS',
    remoteEU: 'yes',
    salary: '€80k - €120k',
    requirements: [
      '5+ years full-stack development',
      'Strong TypeScript/React experience',
      'Backend API development',
    ],
    technicalStack: [
      { skill: 'TypeScript', priority: 'required', note: 'Advanced level' },
      { skill: 'React', priority: 'required' },
      { skill: 'Node.js', priority: 'required' },
      { skill: 'GraphQL', priority: 'preferred' },
    ],
    companyContext: {
      size: 'Scale-up',
      stage: 'Series B',
      industry: 'SaaS'
    },
    notes: 'Great culture, strong remote practices, async-first communication',
    matchScore: 8.5
  };

  const validation = validateAnalysis(exampleAnalysis);
  console.log('Validation:', validation);
  
  if (validation.valid) {
    console.log('\n' + formatAnalysis(exampleAnalysis));
  }
}
