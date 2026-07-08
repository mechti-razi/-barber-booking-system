import { Pipe, PipeTransform, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Subscription } from 'rxjs';
import { TranslateService } from '../../core/services/translate.service';

/**
 * Usage in templates:
 *   {{ 'auth.login.title' | translate }}
 *   {{ 'shopList.resultsCount' | translate:{ count: 3 } }}
 */
@Pipe({
  name: 'translate',
  pure: false   // impure so it re-evaluates when the language changes
})
export class TranslatePipe implements PipeTransform, OnDestroy {
  private langSub: Subscription;
  private lastKey = '';
  private lastResult = '';

  constructor(
    private translateService: TranslateService,
    private cdr: ChangeDetectorRef
  ) {
    // Re-trigger change detection when language switches
    this.langSub = this.translateService.lang$.subscribe(() => {
      this.lastKey = ''; // invalidate cache
      this.cdr.markForCheck();
    });
  }

  transform(key: string, params?: Record<string, string | number>): string {
    if (!key) return '';
    const cacheKey = key + JSON.stringify(params ?? {});
    if (cacheKey === this.lastKey) return this.lastResult;
    this.lastKey = cacheKey;
    this.lastResult = this.translateService.t(key, params);
    return this.lastResult;
  }

  ngOnDestroy(): void {
    this.langSub.unsubscribe();
  }
}
