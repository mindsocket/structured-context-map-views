import { type Config, createSpaceContext, nodeIssues, validateSpace } from 'structured-context/api';
import type { ValidationInput } from 'structured-context-map-views';

/**
 * Validate a space for the overlay. No judge is passed, so only expression rules run (AI-judged rules
 * would cost money and are not requested here).
 */
export async function validateForOverlay(spaceName: string, config: Config): Promise<ValidationInput> {
  const result = await validateSpace(createSpaceContext(spaceName, config));
  return { issues: nodeIssues(result), ruleViolations: result.ruleViolations };
}
