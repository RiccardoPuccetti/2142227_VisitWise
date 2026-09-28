import { ComponentFixture } from '@angular/core/testing';

/** Small DOM helpers shared by the login, register and profile page tests. */
export function field(fixture: ComponentFixture<unknown>, id: string): HTMLInputElement {
  const input = (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>(`#${id}`);
  if (!input) throw new Error(`No input #${id}`);
  return input;
}

export function type(input: HTMLInputElement, value: string): void {
  input.value = value;
  input.dispatchEvent(new Event('input'));
}

export async function submit(fixture: ComponentFixture<unknown>, formSelector = 'form'): Promise<void> {
  const form = (fixture.nativeElement as HTMLElement).querySelector<HTMLFormElement>(formSelector);
  form?.querySelector<HTMLButtonElement>('button[type="submit"]')?.click();
  await fixture.whenStable();
}

/** Visible text of the element, whitespace collapsed. */
export function text(element: Element | null | undefined): string {
  return (element?.textContent ?? '').replace(/\s+/g, ' ').trim();
}

/** Lets pending promise continuations (e.g. after an HTTP answer) run, then re-renders. */
export async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve));
  await fixture.whenStable();
}
