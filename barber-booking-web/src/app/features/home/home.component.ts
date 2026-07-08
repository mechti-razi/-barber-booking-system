import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { ShopService } from '../../core/services/shop.service';
import { AppointmentService } from '../../core/services/appointment.service';
import { TranslateService } from '../../core/services/translate.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit, OnDestroy {
  currentUser: any;
  featuredShops: any[] = [];
  nextAppointment: any = null;
  loadingShops = true;

  steps: { n: string; title: string; desc: string }[] = [];
  reviews = [
    { name: 'James W.',  avatar: 'J', text: 'Booked in under a minute. Best haircut experience I\'ve had.', stars: 5 },
    { name: 'Sara M.',   avatar: 'S', text: 'Love being able to see barber ratings before I book.',        stars: 5 },
    { name: 'Karim B.',  avatar: 'K', text: 'The hot towel shave was incredible. Will be back every week.',stars: 5 },
  ];

  private langSub!: Subscription;

  constructor(
    private authService: AuthService,
    private router: Router,
    private shopService: ShopService,
    private appointmentService: AppointmentService,
    public translateService: TranslateService
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.currentUserValue;
    this.buildSteps();
    this.langSub = this.translateService.lang$.subscribe(() => this.buildSteps());
    this.loadFeaturedShops();
    if (this.isLoggedIn) {
      this.loadNextAppointment();
    }
  }

  ngOnDestroy(): void {
    this.langSub?.unsubscribe();
  }

  private buildSteps(): void {
    const t = (k: string) => this.translateService.t(k);
    this.steps = [
      { n: '01', title: t('home.steps.1.title'), desc: t('home.steps.1.desc') },
      { n: '02', title: t('home.steps.2.title'), desc: t('home.steps.2.desc') },
      { n: '03', title: t('home.steps.3.title'), desc: t('home.steps.3.desc') },
      { n: '04', title: t('home.steps.4.title'), desc: t('home.steps.4.desc') },
    ];
  }

  loadFeaturedShops(): void {
    this.shopService.getShops().subscribe({
      next: (shops) => {
        this.featuredShops = shops.filter(s => s.active === true || s.status === 'active').slice(0, 4);
        this.loadingShops = false;
      },
      error: () => { this.loadingShops = false; }
    });
  }

  loadNextAppointment(): void {
    this.appointmentService.getMyAppointments().subscribe({
      next: (apps) => {
        const today = new Date().toISOString().split('T')[0];
        const upcoming = apps
          .filter(a => a.date >= today && a.status !== 'cancelled')
          .sort((a, b) => a.date.localeCompare(b.date));
        this.nextAppointment = upcoming[0] || null;
      },
      error: () => {}
    });
  }

  logout(): void {
    this.authService.logout().subscribe({
      next:  () => this.router.navigate(['/auth/login']),
      error: () => this.router.navigate(['/auth/login'])
    });
  }

  get isLoggedIn(): boolean {
    return this.authService.isLoggedIn;
  }

  get greeting(): string {
    const h = new Date().getHours();
    if (h < 12) return this.translateService.t('home.greeting');
    if (h < 18) return this.translateService.t('home.greeting');
    return this.translateService.t('home.greeting');
  }

  formatDate(dateStr: string): string {
    const locale = this.translateService.currentLang === 'fr' ? 'fr-FR' : 'en-US';
    const d = new Date(dateStr);
    return d.toLocaleDateString(locale, { weekday: 'short', month: 'short', day: 'numeric' });
  }
}
