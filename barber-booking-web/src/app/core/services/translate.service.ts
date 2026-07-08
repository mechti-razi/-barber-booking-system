import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';

export type Lang = 'en' | 'fr';

@Injectable({ providedIn: 'root' })
export class TranslateService {
  private readonly storageKey = 'bb_lang';
  private translations: Record<string, any> = {};
  private cache: Partial<Record<Lang, Record<string, any>>> = {};

  private _lang$ = new BehaviorSubject<Lang>('en');
  lang$ = this._lang$.asObservable();

  constructor(private http: HttpClient) {}

  get currentLang(): Lang {
    return this._lang$.value;
  }

  /** Call once at app startup */
  init(): Observable<any> {
    const saved = localStorage.getItem(this.storageKey) as Lang | null;
    const lang: Lang = saved === 'fr' ? 'fr' : 'en';
    return this.loadLang(lang);
  }

  setLang(lang: Lang): Observable<any> {
    localStorage.setItem(this.storageKey, lang);
    return this.loadLang(lang);
  }

  toggle(): void {
    const next: Lang = this._lang$.value === 'en' ? 'fr' : 'en';
    this.setLang(next).subscribe();
  }

  private loadLang(lang: Lang): Observable<any> {
    if (this.cache[lang]) {
      this.translations = this.cache[lang]!;
      this._lang$.next(lang);
      return of(this.translations);
    }

    return this.http.get<Record<string, any>>(`/assets/i18n/${lang}.json`).pipe(
      tap(data => {
        this.cache[lang] = data;
        this.translations = data;
        this._lang$.next(lang);
      }),
      catchError(() => {
        console.warn(`[TranslateService] Could not load ${lang}.json — falling back to keys`);
        this.cache[lang] = {};
        this.translations = {};
        this._lang$.next(lang);
        return of({});
      })
    );
  }

  /**
   * Resolve a dot-separated key from the loaded translations.
   * Supports simple interpolation: {{ key }} => value
   * e.g. t('auth.login.title') => "Welcome back"
   *      t('shopList.resultsCount', { count: 3 }) => "3 shops"
   */
  t(key: string, params?: Record<string, string | number>): string {
    const parts = key.split('.');
    let node: any = this.translations;

    for (const part of parts) {
      if (node == null || typeof node !== 'object') {
        return key; // key not found — return the key itself as fallback
      }
      node = node[part];
    }

    if (typeof node !== 'string') {
      return key;
    }

    if (params) {
      return node.replace(/\{\{(\w+)\}\}/g, (_: string, p: string) =>
        params[p] != null ? String(params[p]) : `{{${p}}}`
      );
    }

    return node;
  }
}
