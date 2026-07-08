import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type Theme = 'dark' | 'light';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private themeKey = 'bb_theme';
  private _isDark$ = new BehaviorSubject<boolean>(true);

  isDark$ = this._isDark$.asObservable();

  init(): void {
    const saved = localStorage.getItem(this.themeKey);
    const isDark = saved !== 'light';
    this._isDark$.next(isDark);
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  }

  toggle(): void {
    const next = !this._isDark$.value;
    this.set(next ? 'dark' : 'light');
  }

  set(theme: Theme): void {
    const isDark = theme !== 'light';
    this._isDark$.next(isDark);
    localStorage.setItem(this.themeKey, theme);
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  }

  get currentIsDark(): boolean {
    return this._isDark$.value;
  }
}
