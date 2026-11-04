import { type Config, createSpaceContext, type ValidationResult, validateSpace } from 'structured-context/api';

/**
 * Validate a space for the overlay. No judge is passed, so only expression rules run (AI-judged rules
 * would cost money and are not requested here).
 */
export function validateForOverlay(spaceName: string, config: Config): Promise<ValidationResult> {
  return validateSpace(createSpaceContext(spaceName, config));
}
