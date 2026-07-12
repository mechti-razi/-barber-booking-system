import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AppointmentService } from '../../../core/services/appointment.service';
import { AuthService } from '../../../core/services/auth.service';
import { TranslateService } from '../../../core/services/translate.service';

@Component({
  selector: 'app-appointment-list',
  templateUrl: './appointment-list.component.html',
  styleUrls: ['./appointment-list.component.css']
})
export class AppointmentListComponent implements OnInit {
  allAppointments: any[] = [];
  loading = true;
  error = '';
  activeTab: 'upcoming' | 'past' | 'all' = 'upcoming';
  cancellingId: number | null = null;

  // ── Review modal state ──────────────────────────────────
  reviewModalOpen = false;
  reviewAppointment: any = null;
  reviewRating = 0;
  reviewHover = 0;
  reviewComment = '';
  reviewSubmitting = false;
  reviewError = '';
  reviewSuccess = false;

  constructor(
    private appointmentService: AppointmentService,
    private authService: AuthService,
    private router: Router,
    private translateService: TranslateService
  ) { }

  ngOnInit(): void {
    if (!this.authService.isLoggedIn) {
      this.router.navigate(['/auth/login']);
      return;
    }
    this.loadAppointments();
  }

  loadAppointments(): void {
    this.loading = true;
    this.appointmentService.getMyAppointments().subscribe({
      next: (data) => {
        this.allAppointments = data.sort((a: any, b: any) =>
          // Sort by full datetime descending (most recent first)
          this.getDateTimeMs(b) - this.getDateTimeMs(a)
        );
        this.loading = false;
      },
      error: () => {
        this.error = 'Failed to load appointments';
        this.loading = false;
      }
    });
  }

  /** Normalize date field — prefers appointment_date over date */
  private getDateStr(a: any): string {
    return a.appointment_date || a.date || '';
  }

  /** Normalize time field — handles '10:00 AM', '10:00', '10:00:00' formats */
  private getTimeStr(a: any): string {
    return a.appointment_time || a.time || '00:00';
  }

  /**
   * Combine date + time into a JS timestamp (ms).
   * Handles both 12-hour ('10:00 AM') and 24-hour ('14:30') time strings.
   */
  private getDateTimeMs(a: any): number {
    const dateStr = this.getDateStr(a);   // e.g. '2026-07-07'
    const timeStr = this.getTimeStr(a);   // e.g. '10:00 AM' or '14:30'

    if (!dateStr) return 0;

    // Parse 12-hour format (e.g. '10:00 AM', '02:30 PM')
    const match12 = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (match12) {
      let hours = parseInt(match12[1], 10);
      const minutes = parseInt(match12[2], 10);
      const period = match12[3].toUpperCase();
      if (period === 'AM' && hours === 12) hours = 0;
      if (period === 'PM' && hours !== 12) hours += 12;
      return new Date(`${dateStr}T${String(hours).padStart(2,'0')}:${String(minutes).padStart(2,'0')}:00`).getTime();
    }

    // Parse 24-hour or HH:MM:SS format
    const timePart = timeStr.split(':').slice(0, 2).join(':');  // take HH:MM only
    return new Date(`${dateStr}T${timePart}:00`).getTime();
  }

  /**
   * Upcoming = pending OR confirmed, AND the appointment datetime hasn't passed yet.
   * If the status is pending/confirmed but time has passed → treat as past (missed/overdue).
   */
  private isUpcoming(a: any): boolean {
    if (a.status !== 'pending' && a.status !== 'confirmed') return false;
    return this.getDateTimeMs(a) > Date.now();
  }

  /**
   * Past = resolved statuses (completed, cancelled, no_show)
   *      OR pending/confirmed but the appointment time has already passed.
   */
  private isPast(a: any): boolean {
    if (a.status === 'completed' || a.status === 'cancelled' || a.status === 'no_show') {
      return true;
    }
    // Pending/confirmed but appointment time already passed
    return this.getDateTimeMs(a) <= Date.now();
  }

  get filtered(): any[] {
    if (this.activeTab === 'upcoming') {
      return this.allAppointments.filter(a => this.isUpcoming(a));
    }
    if (this.activeTab === 'past') {
      return this.allAppointments.filter(a => this.isPast(a));
    }
    return this.allAppointments;
  }

  get upcomingCount(): number {
    return this.allAppointments.filter(a => this.isUpcoming(a)).length;
  }

  setTab(tab: 'upcoming' | 'past' | 'all'): void {
    this.activeTab = tab;
  }

  statusLabel(s: string): string {
    const key = `appointments.status.${s}`;
    const t = this.translateService.t(key);
    return t !== key ? t : s;
  }

  statusClass(s: string): string {
    const m: Record<string, string> = {
      pending: 'st-pending', confirmed: 'st-confirmed',
      completed: 'st-completed', cancelled: 'st-cancelled', no_show: 'st-noshow'
    };
    return m[s] || '';
  }

  canCancel(a: any): boolean {
    return a.status === 'pending';
  }

  cancelAppointment(id: number): void {
    if (!confirm('Cancel this appointment?')) return;
    this.cancellingId = id;
    this.appointmentService.updateAppointment(id, {
      status: 'cancelled',
      cancellation_reason: 'Cancelled by user'
    }).subscribe({
      next: () => {
        this.cancellingId = null;
        this.loadAppointments();
      },
      error: () => {
        this.error = 'Failed to cancel appointment';
        this.cancellingId = null;
      }
    });
  }

  bookNew(): void {
    this.router.navigate(['/shops']);
  }

  getDate(a: any): string {
    return this.getDateStr(a);
  }

  getTime(a: any): string {
    return a.appointment_time || a.time || '';
  }

  getServiceName(a: any): string {
    return a.service_name || a.service?.name || '—';
  }

  getBarberName(a: any): string {
    return a.barber?.user?.name || a.barber?.name || '—';
  }

  getShopName(a: any): string {
    return a.shop?.name || 'Coupena Shop';
  }

  getPrice(a: any): string | number {
    const val = parseFloat(a.price || a.total_price || '0');
    if (val > 0) return val;
    return a.service?.base_price || a.service?.price || '—';
  }

  dateLabel(dateStr: string): string {
    if (this.isToday(dateStr)) return this.translateService.t('appointments.dateLabels.today');
    if (this.isTomorrow(dateStr)) return this.translateService.t('appointments.dateLabels.tomorrow');
    return this.formatDate(dateStr);
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '—';
    const locale = this.translateService.currentLang === 'fr' ? 'fr-FR' : 'en-US';
    const d = new Date(dateStr);
    return d.toLocaleDateString(locale, { weekday: 'short', month: 'short', day: 'numeric' });
  }

  isToday(dateStr: string): boolean {
    if (!dateStr) return false;
    return dateStr === new Date().toISOString().split('T')[0];
  }

  isTomorrow(dateStr: string): boolean {
    if (!dateStr) return false;
    const tom = new Date();
    tom.setDate(tom.getDate() + 1);
    return dateStr === tom.toISOString().split('T')[0];
  }

  // ── Review helpers ────────────────────────────────────────

  canReview(a: any): boolean {
    return a.status === 'completed' && !a.review;
  }

  hasReview(a: any): boolean {
    return !!a.review;
  }

  openReviewModal(a: any): void {
    this.reviewAppointment = a;
    this.reviewRating = 0;
    this.reviewHover = 0;
    this.reviewComment = '';
    this.reviewError = '';
    this.reviewSuccess = false;
    this.reviewSubmitting = false;
    this.reviewModalOpen = true;
  }

  closeReviewModal(): void {
    this.reviewModalOpen = false;
    this.reviewAppointment = null;
  }

  setRating(star: number): void {
    this.reviewRating = star;
  }

  setHover(star: number): void {
    this.reviewHover = star;
  }

  clearHover(): void {
    this.reviewHover = 0;
  }

  starActive(star: number): boolean {
    return star <= (this.reviewHover || this.reviewRating);
  }

  submitReview(): void {
    if (this.reviewRating === 0) {
      this.reviewError = this.translateService.t('appointments.review.errorNoRating');
      return;
    }
    this.reviewSubmitting = true;
    this.reviewError = '';

    this.appointmentService.submitReview({
      appointment_id: this.reviewAppointment.id,
      rating: this.reviewRating,
      comment: this.reviewComment.trim(),
    }).subscribe({
      next: (review) => {
        this.reviewSubmitting = false;
        this.reviewSuccess = true;
        // Patch the appointment in-memory so the card updates instantly
        const appt = this.allAppointments.find(a => a.id === this.reviewAppointment.id);
        if (appt) { appt.review = review; }
        setTimeout(() => this.closeReviewModal(), 1400);
      },
      error: (err) => {
        this.reviewSubmitting = false;
        this.reviewError = err?.error?.error || err?.error?.message || this.translateService.t('appointments.review.errorFailed');
      }
    });
  }
}
