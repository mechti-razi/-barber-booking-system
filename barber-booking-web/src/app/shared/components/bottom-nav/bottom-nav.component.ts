import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { ThemeService } from '../../../core/services/theme.service';
import { TranslateService } from '../../../core/services/translate.service';

@Component({
  selector: 'app-bottom-nav',
  templateUrl: './bottom-nav.component.html',
  styleUrls: ['./bottom-nav.component.css']
})
export class BottomNavComponent implements OnInit, OnDestroy {
  @Input() activeTab: string = 'home';

  navItems: { id: string; icon: string; labelKey: string; route: string }[] = [
    { id: 'home',         icon: 'home',     labelKey: 'nav.home',         route: '/home' },
    { id: 'shops',        icon: 'store',    labelKey: 'nav.shops',        route: '/shops' },
    { id: 'appointments', icon: 'calendar', labelKey: 'nav.appointments', route: '/appointments' },
    { id: 'profile',      icon: 'person',   labelKey: 'nav.profile',      route: '/profile' }
  ];

  private langSub!: Subscription;

  constructor(
    private router: Router,
    private authService: AuthService,
    private themeService: ThemeService,
    public translateService: TranslateService
  ) {}

  ngOnInit(): void {
    const user = this.authService.currentUserValue;
    if (user) {
      if (user.role === 'barber') {
        this.navItems.splice(3, 0, { id: 'barber', icon: 'scissors', labelKey: 'nav.barber', route: '/barber' });
      } else if (user.role === 'admin') {
        this.navItems.splice(3, 0, { id: 'admin', icon: 'dashboard', labelKey: 'nav.admin', route: '/admin' });
      }
    }
  }

  ngOnDestroy(): void {
    this.langSub?.unsubscribe();
  }

  navigate(route: string): void {
    this.router.navigate([route]);
  }

  toggleTheme(): void {
    this.themeService.toggle();
  }

  getIconPath(iconName: string): string {
    const icons: { [key: string]: string } = {
      home: 'M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z',
      store: 'M20 4H4v2h16V4zm1 10v-2l-1-5H4l-1 5v2h1v6h10v-6h4v6h2v-6h1zm-9 4H6v-4h6v4z',
      calendar: 'M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zM9 14H7v-2h2v2zm4 0h-2v-2h2v2zm4 0h-2v-2h2v2zm-8 4H7v-2h2v2zm4 0h-2v-2h2v2zm4 0h-2v-2h2v2z',
      person: 'M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z',
      scissors: 'M19 3c-1.1 0-2 .9-2 2 0 .28.06.54.16.78L14.9 8.3c-.68-.56-1.54-.9-2.48-.9-.94 0-1.8.34-2.48.9L7.66 5.78C7.76 5.54 7.82 5.28 7.82 5c0-1.1-.9-2-2-2S3.82 3.9 3.82 5c0 1.1.9 2 2 2 .28 0 .54-.06.78-.16L8.85 9.3c-.34.68-.53 1.43-.53 2.2 0 2.21 1.79 4 4 4s4-1.79 4-4c0-.77-.19-1.52-.53-2.2l2.25-2.46c.24.1.5.16.78.16 1.1 0 2-.9 2-2s-.9-2-2-2zM5.82 6c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm6.5 6.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm6.68-6.5c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z',
      dashboard: 'M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z'
    };
    return icons[iconName] || '';
  }
}
