import { Directive } from '@angular/core';
import { classes } from '@spartan-ng/helm/utils';

@Directive({
  selector: '[hlmSkeleton],hlm-skeleton',
  host: {
    'data-slot': 'skeleton',
  },
})
export class HlmSkeleton {
  constructor() {
    // A tint of the text colour: bg-muted is almost the card colour in both themes, so placeholders vanished on cards.
    classes(() => 'bg-foreground/9 rounded-2xl block motion-safe:animate-pulse');
  }
}
