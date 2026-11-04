import { type Config, createSpaceContext, validateSpace } from 'structured-context/api';
import type { ValidationInput } from 'structured-context-map-views';

/**
 * Validate a space and return the results that attach to nodes. No judge is passed, so only
 * expression rules run (AI-judged rules would cost money and are not requested here).
 */
export async function validateForOverlay(spaceName: string, config: Config): Promise<ValidationInput> {
  const result = await validateSpace(createSpaceContext(spaceName, config));
  return {
    ruleViolations: result.ruleViolations,
    hierarchyViolations: result.hierarchyViolations,
    nodeErrors: result.nodeErrors.map(({ nodeId, source, errors }) => ({ nodeId, source, errors })),
  };
}
