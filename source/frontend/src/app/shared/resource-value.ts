import type { Resource } from '@angular/core';

/** A resource's value, or undefined while it loads or when it failed (value() throws in the error state). */
export function valueOf<T>(resource: Resource<T | undefined>): T | undefined {
  return resource.hasValue() ? resource.value() : undefined;
}
