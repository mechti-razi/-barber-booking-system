import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { BarberService } from '../../../core/services/barber.service';
import { ThemeService } from '../../../core/services/theme.service';
import { TranslateService } from '../../../core/services/translate.service';

@Component({
  selector: 'app-barber-dashboard',
  templateUrl: './barber-dashboard.component.html',
  styleUrls: ['./barber-dashboard.component.css']
})
export class BarberDashboardComponent implements OnInit {

  loading = true;
  currentUser: any = null;
  barberProfile: any = null;
  toast: { message: string; type: 'success' | 'error' } | null = null;

  isDarkMode = true;
  currentLang: 'en' | 'fr' = 'en';

  constructor(
    private authService: AuthService,
    private barberService: BarberService,
    private router: Router,
    private themeService: ThemeService,
    public translateService: TranslateService
  ) { }

  ngOnInit(): void {
    this.currentUser = this.authService.currentUserValue;

    if (!this.currentUser || this.currentUser.role !== 'barber') {
      this.router.navigate(['/home']);
      return;
    }

    // Sync theme & lang from services
    this.isDarkMode = this.themeService.currentIsDark;
    this.themeService.isDark$.subscribe(dark => this.isDarkMode = dark);
    this.translateService.lang$.subscribe(lang => this.currentLang = lang);

    this.barberService.getBarbers().subscribe({
      next: (barbers) => {
        this.barberProfile = barbers.find((b: any) => b.user_id === this.currentUser?.id)
          || barbers[0];
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  toggleTheme(): void {
    this.themeService.toggle();
  }

  toggleLang(): void {
    this.translateService.toggle();
  }

  getInitials(name: string): string {
    if (!name) return '?';
    return name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
  }

  get isReservationsPage(): boolean {
    return this.router.url.includes('/barber/reservations');
  }

  get isOwner(): boolean {
    return this.authService.isOwner;
  }

  showToast(message: string, type: 'success' | 'error'): void {
    this.toast = { message, type };
    setTimeout(() => { this.toast = null; }, 3500);
  }

  logout(): void {
    this.authService.logout().subscribe({
      next: () => this.router.navigate(['/auth/login']),
      error: () => this.router.navigate(['/auth/login'])
    });
  }
}
