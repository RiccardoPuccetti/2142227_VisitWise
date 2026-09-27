import { SchemaPath, validate } from '@angular/forms/signals';

/** Like `required`, but a value made only of spaces also counts as missing (the backend trims names). */
export function requiredText(path: SchemaPath<string>, message: string): void {
  validate(path, ({ value }) => (value().trim().length > 0 ? undefined : { kind: 'required', message }));
}

/** Upper bound of the backend password policy (AUTHENTICATION.md A2). The minimum is checked by the server. */
export const PASSWORD_MAX_LENGTH = 64;
