import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { BarberService } from '../../../core/services/barber.service';
import { ShopService } from '../../../core/services/shop.service';
import { AppointmentService } from '../../../core/services/appointment.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.css']
})
export class AdminDashboardComponent implements OnInit {
  currentUser: any;
  loading = true;
  activeTab = 'overview'; // 'overview' | 'barbers' | 'settings'

  // Collections
  barbers: any[] = [];
  shops: any[] = [];
  appointments: any[] = [];

  // Barber list search & filter
  barberSearch = '';
  barberFilter: 'all' | 'active' | 'expiring' | 'expired' = 'all';

  // Statistics State
  timeRange = 'month'; // 'week' | 'month' | 'year'
  stats = {
    shopsCount: 0,
    barbersCount: 0,
    appointmentsCount: 0,
    revenue: 0
  };

  // Subscription KPI Statistics
  subStats = {
    totalActive: 0,          // barbers currently active
    newThisMonth: 0,         // subscriptions paid/created this month
    expiringThisMonth: 0,    // subscriptions expiring before end of this month
    expiredCount: 0,         // barbers with already-expired subscriptions
    revenueThisMonth: 0,     // sum of subscription fees collected this month
    monthlyCount: 0,         // how many are on monthly plan
    quarterlyCount: 0,       // quarterly plan
    yearlyCount: 0           // yearly plan
  };

  // ── Computed: filtered barber list ──────────────────────
  get filteredBarbers(): any[] {
    const now = new Date();
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    const search = this.barberSearch.toLowerCase();

    return this.barbers.filter(b => {
      // search by name / email / specialization
      const matchSearch = !search ||
        (b.name || '').toLowerCase().includes(search) ||
        (b.email || '').toLowerCase().includes(search) ||
        (b.specialization || '').toLowerCase().includes(search);

      // status filter
      const expiry = b.subscription_expiry_date ? new Date(b.subscription_expiry_date) : null;
      let matchFilter = true;
      if (this.barberFilter === 'active')   matchFilter = !!(b.active || b.is_active);
      if (this.barberFilter === 'expiring') matchFilter = !!(expiry && expiry >= now && expiry <= monthEnd);
      if (this.barberFilter === 'expired')  matchFilter = !!(expiry && expiry < now);

      return matchSearch && matchFilter;
    });
  }

  daysUntilExpiry(dateStr: string | null): number | null {
    if (!dateStr) return null;
    const diff = new Date(dateStr).getTime() - Date.now();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  expiryUrgency(dateStr: string | null): 'ok' | 'soon' | 'critical' | 'expired' {
    const d = this.daysUntilExpiry(dateStr);
    if (d === null) return 'ok';
    if (d < 0)  return 'expired';
    if (d <= 7) return 'critical';
    if (d <= 30) return 'soon';
    return 'ok';
  }

  // Dynamic Chart Bars Array
  chartBars: any[] = [];

  // Add Barber Modal State
  barberModalOpen = false;
  barberError = '';
  newBarber = {
    name: '',
    email: '',
    phone: '',
    specialization: 'Haircut & Styling',
    experience: '5 years',
    shop_id: 1,
    subscription_type: ''
  };
  calculatedEndDate: string | null = null;

  // Activate Barber Modal State
  activationModalOpen = false;
  activationBarber: any = null;
  activationSubscriptionType = '';

  // Edit Barber Modal State
  editBarberModalOpen = false;
  editBarberError = '';
  editCalculatedEndDate: string | null = null;
  editBarber = {
    id: 0,
    name: '',
    email: '',
    phone: '',
    specialization: '',
    experience: '',
    subscription_type: '',
    subscription_expiry_date: ''
  };

  // ── Services Management State ────────────────────────────
  shopServices: any[] = [];
  serviceModalOpen = false;
  editingService: any = null;
  serviceError = '';
  newService = {
    name: '',
    description: '',
    base_price: 500,
    duration_minutes: 30
  };

  // Subscriptions Settings
  shopSettings = {
    isSubscribed: true,
    planType: 'Premium Business',
    nextBillingDate: 'July 1, 2026',
    billingAmount: '49.00 DT'
  };

  // Salary/Revenue Statistics
  totalSalary = 0;
  monthlySalary = 0;

  // Activities Log
  activities: any[] = [];

  private mockActivitiesKey = 'barber_booking_mock_activities';
  private defaultActivities = [
    { text: 'Barber Sven Larson status set to active', time: '10 minutes ago' },
    { text: 'Appointment booked by Client Liam Neeson', time: '1 hour ago' },
    { text: 'Monthly subscription successfully renewed', time: '1 day ago' }
  ];

  constructor(
    private authService: AuthService,
    private barberService: BarberService,
    private shopService: ShopService,
    private appointmentService: AppointmentService,
    private router: Router,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.currentUserValue;
    
    if (!this.currentUser || this.currentUser.role !== 'admin') {
      this.router.navigate(['/home']);
      return;
    }
    
    this.loadActivities();
    this.loadDashboardData();
  }

  private loadActivities(): void {
    const saved = localStorage.getItem(this.mockActivitiesKey);
    if (saved) {
      this.activities = JSON.parse(saved);
    } else {
      this.activities = [...this.defaultActivities];
      this.saveActivities();
    }
  }

  private saveActivities(): void {
    localStorage.setItem(this.mockActivitiesKey, JSON.stringify(this.activities));
  }

  private logActivity(text: string): void {
    this.activities.unshift({
      text: text,
      time: 'Just now'
    });
    // Keep max 10 logs
    if (this.activities.length > 10) {
      this.activities.pop();
    }
    this.saveActivities();
  }

  loadDashboardData(): void {
    this.loading = true;

    forkJoin([
      this.shopService.getShops(),
      this.appointmentService.getAppointments()
    ]).subscribe({
      next: ([shopsData, appData]) => {
        this.shops = shopsData;
        this.stats.shopsCount = this.shops.length;
        if (this.shops.length > 0) {
          this.shopSettings.isSubscribed = this.shops[0].active;
        }

        this.appointments = appData;

        // Load barbers scoped to the admin's shop
        const shopId = this.shops[0]?.id;
        this.barberService.getBarbers(shopId).subscribe({
          next: (barbersData) => {
            this.barbers = barbersData;
            this.checkSubscriptionExpiry();
            this.stats.barbersCount = this.barbers.length;
            this.updateMetrics();
            this.loading = false;
          },
          error: () => { this.loading = false; }
        });
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  checkSubscriptionExpiry(): void {
    const today = new Date();
    let hasUpdates = false;

    this.barbers.forEach(barber => {
      if (barber.subscription_expiry_date && barber.active) {
        const expiryDate = new Date(barber.subscription_expiry_date);
        if (expiryDate < today) {
          // Subscription expired, update local state
          barber.active = false;
          barber.is_active = false;
          hasUpdates = true;
        }
      }
    });

    if (hasUpdates) {
      // Sync with backend
      const updates = this.barbers
        .filter(b => !b.active && b.subscription_expiry_date && new Date(b.subscription_expiry_date) < today)
        .map(b => this.barberService.updateBarber(b.id, { is_active: false, active: false }));

      if (updates.length > 0) {
        forkJoin(updates).subscribe();
      }
    }
  }

  calculateSalaryMetrics(): void {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    // ── from barbers list ──────────────────────────────────────────────────
    let totalActive = 0, expiringThisMonth = 0, expiredCount = 0;
    let monthlyCount = 0, quarterlyCount = 0, yearlyCount = 0;

    this.barbers.forEach(b => {
      const expiry = b.subscription_expiry_date ? new Date(b.subscription_expiry_date) : null;
      if (b.active || b.is_active) totalActive++;
      if (expiry && expiry >= now && expiry <= monthEnd) expiringThisMonth++;
      if (expiry && expiry < now) expiredCount++;
      switch ((b.subscription_type || '').toLowerCase()) {
        case 'monthly':   monthlyCount++;   break;
        case 'quarterly': quarterlyCount++; break;
        case 'yearly':    yearlyCount++;    break;
      }
    });

    // ── from appointments (is_subscription=true, paid this month) ──────────
    const subAppointmentsThisMonth = this.appointments.filter(a => {
      const created = new Date(a.created_at ?? a.appointment_date);
      return created >= monthStart && created <= monthEnd;
    });

    const revenueThisMonth = subAppointmentsThisMonth
      .reduce((sum, a) => sum + Number(a.total_price ?? 0), 0);

    const newThisMonth = subAppointmentsThisMonth.length;

    // ── write all KPIs ────────────────────────────────────────────────────
    this.subStats = {
      totalActive,
      newThisMonth,
      expiringThisMonth,
      expiredCount,
      revenueThisMonth,
      monthlyCount,
      quarterlyCount,
      yearlyCount
    };

    // Also update top-level revenue / count for stats card
    this.stats.revenue = revenueThisMonth;
    this.stats.appointmentsCount = newThisMonth;
  }

  updateMetrics(): void {
    // 1. Calculate active entities
    this.stats.shopsCount = this.shops.length;
    this.stats.barbersCount = this.barbers.length;

    // Calculate subscription KPIs
    this.calculateSalaryMetrics();

    // 2. Filter appointments by selected range relative to "current local time" in 2026
    const today = new Date(); // Use actual current date
    let limitDate = new Date(today);

    if (this.timeRange === 'week') {
      limitDate.setDate(today.getDate() - 7);
    } else if (this.timeRange === 'month') {
      limitDate.setDate(today.getDate() - 30);
    } else if (this.timeRange === 'year') {
      limitDate.setDate(today.getDate() - 365);
    }

    const filteredAppointments = this.appointments.filter(a => {
      if (!a.is_subscription) return false;
      // Support both API field (appointment_date) and mock field (date)
      const appDate = new Date(a.appointment_date ?? a.date);
      return appDate >= limitDate && appDate <= today;
    });

    this.stats.appointmentsCount = filteredAppointments.length;
    
    // Calculate revenue from completed or confirmed appointments
    // Support both API field (total_price) and mock field (price)
    this.stats.revenue = filteredAppointments
      .filter(a => a.status === 'confirmed' || a.status === 'completed')
      .reduce((sum, a) => sum + Number(a.total_price ?? a.price ?? 0), 0);

    // 3. Dynamic Chart Bars: count subscription appointments day-by-day for the last 7 days
    this.chartBars = [];
    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const counts: { label: string, count: number }[] = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateString = d.toISOString().split('T')[0];
      const dayLabel = daysOfWeek[d.getDay()];

      // Support both API field (appointment_date) and mock field (date)
      const dayCount = this.appointments.filter(a => {
        if (!a.is_subscription) return false;
        const appDateString = a.appointment_date ? String(a.appointment_date).split('T')[0] : null;
        return appDateString === dateString || a.date === dateString;
      }).length;
      counts.push({ label: dayLabel, count: dayCount });
    }

    const maxCount = Math.max(...counts.map(c => c.count), 1);

    this.chartBars = counts.map(c => {
      return {
        label: c.label,
        count: c.count,
        height: c.count > 0 ? (c.count / maxCount) * 100 : 12, // minimum 12% for styling aesthetics
        isMax: c.count === maxCount && c.count > 0
      };
    });
  }

  changeTab(tab: string): void {
    this.activeTab = tab;
    if (tab === 'services') {
      this.loadShopServices();
    }
  }

  calculateEndDate(subscriptionType: string): string {
    const today = new Date();
    switch (subscriptionType) {
      case 'monthly':
        today.setMonth(today.getMonth() + 1);
        break;
      case 'quarterly':
        today.setMonth(today.getMonth() + 3);
        break;
      case 'yearly':
        today.setFullYear(today.getFullYear() + 1);
        break;
      default:
        today.setMonth(today.getMonth() + 1);
    }
    return today.toISOString().split('T')[0];
  }

  onSubscriptionTypeChange(): void {
    if (this.newBarber.subscription_type) {
      this.calculatedEndDate = this.calculateEndDate(this.newBarber.subscription_type);
    } else {
      this.calculatedEndDate = null;
    }
  }




  changeTimeRange(range: string): void {
    this.timeRange = range;
    this.updateMetrics();
    this.logActivity(`Analytics filter changed to: ${range}`);
  }

  // Barber Modal Controls
  openBarberModal(): void {
    this.barberModalOpen = true;
    this.barberError = '';
    this.newBarber = {
      name: '',
      email: '',
      phone: '',
      specialization: 'Haircut & Styling',
      experience: '5 years',
      shop_id: this.shops[0]?.id || 1,
      subscription_type: ''
    };
  }

  closeBarberModal(): void {
    this.barberModalOpen = false;
  }

  submitBarber(): void {
    if (!this.newBarber.name) {
      this.barberError = 'Full Name is required';
      return;
    }

    // Normalize empty subscription_type to null so API validation passes
    const payload = {
      ...this.newBarber,
      subscription_type: this.newBarber.subscription_type || null
    };

    this.barberService.createBarber(payload).subscribe({
      next: (barber) => {
        const displayName = barber?.name || this.newBarber.name;
        this.logActivity(`Added new barber profile: ${displayName}`);
        this.closeBarberModal();
        // Reload the full list so the UI is always in sync with the real source of truth
        this.reloadBarbers();
      },
      error: (err) => {
        console.error('Create barber error:', err);
        const message = err?.error?.errors
          ? Object.values(err.error.errors).flat().join(' ')
          : (err?.error?.message || 'Failed to create barber. Please try again.');
        this.barberError = message;
      }
    });
  }

  private reloadBarbers(): void {
    const shopId = this.shops[0]?.id;
    this.barberService.getBarbers(shopId).subscribe({
      next: (barbersData) => {
        this.barbers = barbersData;
        this.checkSubscriptionExpiry();
        this.stats.barbersCount = this.barbers.length;
        this.updateMetrics();
      }
    });
  }

  toggleBarberStatus(id: number, name: string, currentActive: boolean): void {
    if (!currentActive) {
      // Opening activation modal instead of direct toggle
      this.openActivationModal(id, name);
      return;
    }

    // Direct deactivation
    this.barberService.toggleBarberActive(id, currentActive).subscribe({
      next: (updatedBarber) => {
        const isActive = updatedBarber?.active ?? updatedBarber?.is_active ?? false;
        this.logActivity(`Barber ${name} status toggled to ${isActive ? 'Active' : 'Inactive'}`);
        this.reloadBarbers();
      }
    });
  }

  openActivationModal(id: number, name: string): void {
    const barber = this.barbers.find(b => b.id === id);
    if (!barber) return;

    this.activationBarber = barber;
    this.activationSubscriptionType = barber.subscription_type || 'monthly';
    this.activationModalOpen = true;
  }

  closeActivationModal(): void {
    this.activationModalOpen = false;
    this.activationBarber = null;
    this.activationSubscriptionType = '';
  }

  confirmActivation(): void {
    if (!this.activationBarber || !this.activationSubscriptionType) return;

    const id = this.activationBarber.id;
    const name = this.activationBarber.name;

    this.barberService.toggleBarberActive(id, false, this.activationSubscriptionType).subscribe({
      next: () => {
        this.logActivity(`Barber ${name} activated with ${this.activationSubscriptionType} subscription`);
        this.closeActivationModal();
        this.reloadBarbers();
      },
      error: () => {
        this.closeActivationModal();
      }
    });
  }

  toggleShopSubscriptionStatus(): void {
    if (this.shops.length === 0) return;
    
    const targetShop = this.shops[0];
    this.shopService.toggleShopSubscription(targetShop.id).subscribe({
      next: (updatedShop) => {
        this.shops[0] = updatedShop;
        this.shopSettings.isSubscribed = updatedShop.active;
        this.logActivity(`Shop subscription status set to: ${updatedShop.active ? 'Active' : 'Deactivated'}`);
        this.updateMetrics();
      }
    });
  }

  // Edit Barber Modal Controls
  openEditBarberModal(barber: any): void {
    this.editBarberError = '';
    this.editBarber = {
      id: barber.id,
      name: barber.name || '',
      email: barber.email || '',
      phone: barber.phone || '',
      specialization: barber.specialization || 'Haircut & Styling',
      experience: barber.experience || '5 years',
      subscription_type: barber.subscription_type || '',
      subscription_expiry_date: barber.subscription_expiry_date || ''
    };
    this.editCalculatedEndDate = barber.subscription_expiry_date || null;
    this.editBarberModalOpen = true;
  }

  closeEditBarberModal(): void {
    this.editBarberModalOpen = false;
  }

  onEditSubscriptionTypeChange(): void {
    if (this.editBarber.subscription_type) {
      this.editCalculatedEndDate = this.calculateEndDate(this.editBarber.subscription_type);
      this.editBarber.subscription_expiry_date = this.editCalculatedEndDate;
    } else {
      this.editCalculatedEndDate = null;
      this.editBarber.subscription_expiry_date = '';
    }
  }

  submitEditBarber(): void {
    if (!this.editBarber.name) {
      this.editBarberError = 'Full Name is required';
      return;
    }

    const payload = {
      name: this.editBarber.name,
      email: this.editBarber.email || null,
      phone: this.editBarber.phone || null,
      specialization: this.editBarber.specialization,
      experience: this.editBarber.experience,
      subscription_type: this.editBarber.subscription_type || null,
      subscription_expiry_date: this.editBarber.subscription_expiry_date || null
    };

    this.barberService.updateBarber(this.editBarber.id, payload).subscribe({
      next: (updated) => {
        this.logActivity(`Updated barber profile: ${updated.name}`);
        this.closeEditBarberModal();
        this.reloadBarbers();
      },
      error: (err) => {
        console.error('Update barber error:', err);
        const message = err?.error?.errors
          ? Object.values(err.error.errors).flat().join(' ')
          : (err?.error?.message || 'Failed to update barber. Please try again.');
        this.editBarberError = message;
      }
    });
  }

  deleteBarber(id: number, name: string): void {
    if (confirm(`Are you sure you want to permanently delete barber ${name}?`)) {
      this.barberService.deleteBarber(id).subscribe({
        next: () => {
          this.logActivity(`Deleted barber profile: ${name}`);
          this.reloadBarbers();
        },
        error: (err) => {
          console.error('Delete barber error:', err);
          alert('Failed to delete barber.');
        }
      });
    }
  }

  // ──────────────────────────────────────────────────────────
  //  Services Management
  // ──────────────────────────────────────────────────────────

  loadShopServices(): void {
    this.http.get<any[]>(`${environment.apiUrl}/barber-panel/services`).subscribe({
      next: (data) => { this.shopServices = data || []; },
      error: (err) => {
        console.warn('Could not load services from API:', err);
        // Try admin's own shop services from shops list
        if (this.shops?.length > 0) {
          this.shopServices = this.shops[0]?.services || [];
        }
      }
    });
  }

  openServiceModal(): void {
    this.editingService = null;
    this.newService = { name: '', description: '', base_price: 500, duration_minutes: 30 };
    this.serviceError = '';
    this.serviceModalOpen = true;
  }

  openEditServiceModal(svc: any): void {
    this.editingService = svc;
    this.newService = {
      name: svc.name,
      description: svc.description || '',
      base_price: svc.base_price,
      duration_minutes: svc.duration_minutes
    };
    this.serviceError = '';
    this.serviceModalOpen = true;
  }

  closeServiceModal(): void {
    this.serviceModalOpen = false;
    this.editingService = null;
    this.serviceError = '';
  }

  submitService(): void {
    if (!this.newService.name.trim()) { this.serviceError = 'Service name is required.'; return; }
    if (this.newService.base_price < 0) { this.serviceError = 'Price must be positive.'; return; }
    if (this.newService.duration_minutes < 5) { this.serviceError = 'Duration must be at least 5 minutes.'; return; }

    if (this.editingService) {
      this.http.put<any>(`${environment.apiUrl}/barber-panel/services/${this.editingService.id}`, this.newService).subscribe({
        next: (updated) => {
          const idx = this.shopServices.findIndex(s => s.id === this.editingService.id);
          if (idx !== -1) this.shopServices[idx] = { ...this.shopServices[idx], ...this.newService };
          this.logActivity(`Updated service: ${this.newService.name}`);
          this.closeServiceModal();
        },
        error: (err) => {
          this.serviceError = err?.error?.message || 'Failed to update service.';
        }
      });
    } else {
      this.http.post<any>(`${environment.apiUrl}/barber-panel/services`, this.newService).subscribe({
        next: (res) => {
          this.shopServices.push(res.service || { ...this.newService, id: Date.now(), is_active: true });
          this.logActivity(`Added new service: ${this.newService.name}`);
          this.closeServiceModal();
        },
        error: (err) => {
          this.serviceError = err?.error?.message || 'Failed to create service.';
        }
      });
    }
  }

  toggleService(svc: any): void {
    this.http.patch<any>(`${environment.apiUrl}/barber-panel/services/${svc.id}/toggle`, {}).subscribe({
      next: (res) => { svc.is_active = res.is_active ?? !svc.is_active; },
      error: () => { svc.is_active = !svc.is_active; }
    });
  }

  deleteService(id: number, name: string): void {
    if (!confirm(`Delete service "${name}"? This will remove it from all barbers in this shop.`)) return;
    this.http.delete(`${environment.apiUrl}/barber-panel/services/${id}`).subscribe({
      next: () => {
        this.shopServices = this.shopServices.filter(s => s.id !== id);
        this.logActivity(`Deleted service: ${name}`);
      },
      error: (err) => { alert('Failed to delete service.'); console.error(err); }
    });
  }

  logout(): void {
    this.authService.logout().subscribe(() => {
      this.router.navigate(['/auth/login']);
    });
  }
}
