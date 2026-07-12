import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ThemeService } from '../../../core/services/theme.service';
import { AuthService } from '../../../core/services/auth.service';
import { TranslateService } from '../../../core/services/translate.service';

@Component({
  selector: 'app-top-nav',
  templateUrl: './top-nav.component.html',
  styleUrls: ['./top-nav.component.css']
})
export class TopNavComponent implements OnInit {

  currentUser: any = null;
  isDarkMode = true;
  currentLang: 'en' | 'fr' = 'en';

  constructor(
    public router: Router,
    private themeService: ThemeService,
    public authService: AuthService,
    public translateService: TranslateService
  ) {
    // Initialize synchronously so isBarberArea is correct on the VERY FIRST render
    // (before ngOnInit fires). authService.currentUserValue is already populated
    // from localStorage at this point.
    this.currentUser = this.authService.currentUserValue;
  }

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
    });

    this.isDarkMode = this.themeService.currentIsDark;
    this.themeService.isDark$.subscribe(isDark => {
      this.isDarkMode = isDark;
    });

    this.translateService.lang$.subscribe(lang => {
      this.currentLang = lang;
    });
  }

  get isBarberUser(): boolean {
    return this.authService.currentUserValue?.role === 'barber';
  }

  get isOwner(): boolean {
    return this.authService.isOwner;
  }

  get isBarberArea(): boolean {
    return this.router.url.startsWith('/barber')
        || this.router.url.startsWith('/home')
        || this.router.url.startsWith('/auth')
        || this.router.url === '/';
  }

  get isAdminArea(): boolean {
    return this.router.url.startsWith('/admin');
  }

  get isLoggedIn(): boolean {
    return this.authService.isLoggedIn;
  }

  getInitials(name: string): string {
    if (!name) return '?';
    return name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
  }

  toggleTheme(): void {
    this.themeService.toggle();
  }

  toggleLang(): void {
    this.translateService.toggle();
  }

  logout(): void {
    this.authService.logout().subscribe({
      next: () => this.router.navigate(['/auth/login']),
      error: () => this.router.navigate(['/auth/login'])
    });
  }
}
