import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { AppointmentService } from '../../../core/services/appointment.service';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-barber-reservations',
  templateUrl: './barber-reservations.component.html',
  styleUrls: ['./barber-reservations.component.css']
})
export class BarberReservationsComponent implements OnInit {

  loading = true;
  apiUrl = environment.apiUrl;

  appointments: any[] = [];
  filtered: any[] = [];
  selected: any = null;
  detailOpen = false;
  confirmDialog: { open: boolean; appt: any; action: string } = { open: false, appt: null, action: '' };

  activeStatus = 'pending';
  searchQuery = '';
  errorMessage = '';

  statusTabs = ['pending'];

  // Calendar timeline view state
  viewMode: 'list' | 'calendar' = 'list';
  selectedDate: string = '';
  schedule: any[] = [];

  constructor(
    private http: HttpClient,
    private appointmentService: AppointmentService,
    private router: Router,
    private authService: AuthService
  ) { }

  ngOnInit(): void {
    const today = new Date();
    this.selectedDate = this.toDateStr(today);
    this.loadSchedule();
    this.loadAppointments();
  }

  setViewMode(mode: 'list' | 'calendar'): void {
    this.viewMode = mode;
    this.loadAppointments();
  }

  loadSchedule(): void {
    this.http.get<any[]>(`${this.apiUrl}/barber-panel/schedule`).subscribe({
      next: (res) => {
        if (res && res.length > 0) {
          this.schedule = res;
        } else {
          this.initDefaultSchedule();
        }
      },
      error: () => {
        this.initDefaultSchedule();
      }
    });
  }

  loadAppointments(): void {
    this.loading = true;
    this.errorMessage = '';

    let url = `${this.apiUrl}/barber-panel/reservations`;
    if (this.viewMode === 'calendar' && this.selectedDate) {
      url += `?date=${this.selectedDate}`;
    }

    this.http.get<any>(url).subscribe({
      next: (res) => {
        this.appointments = res.data || res;
        this.applyFilters();
        this.loading = false;
      },
      error: (err) => {
        this.errorMessage = err?.error?.message || 'Failed to load reservations from the server.';
        this.appointments = [];
        this.applyFilters();
        this.loading = false;
      }
    });
  }

  applyFilters(): void {
    let list = [...this.appointments];
    // Strictly filter to pending appointments only
    list = list.filter(a => a.status === 'pending');

    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      list = list.filter(a =>
        a.user?.name?.toLowerCase().includes(q) ||
        a.service?.name?.toLowerCase().includes(q) ||
        a.appointment_date?.includes(q)
      );
    }
    this.filtered = list.sort((a, b) =>
      b.appointment_date.localeCompare(a.appointment_date) ||
      b.appointment_time.localeCompare(a.appointment_time)
    );
  }

  setStatus(s: string): void {
    this.activeStatus = 'pending';
    this.applyFilters();
  }

  onSearch(): void { this.applyFilters(); }

  openDetail(appt: any): void {
    this.selected = appt;
    this.detailOpen = true;
  }
  closeDetail(): void { this.detailOpen = false; }

  requestAction(appt: any, action: string, e?: Event): void {
    e?.stopPropagation();
    this.confirmDialog = { open: true, appt, action };
  }
  cancelDialog(): void { this.confirmDialog = { open: false, appt: null, action: '' }; }

  confirmAction(): void {
    const { appt, action } = this.confirmDialog;
    const statusMap: Record<string, string> = { confirm: 'confirmed', complete: 'completed', cancel: 'cancelled' };
    const newStatus = statusMap[action];
    if (!newStatus) { this.cancelDialog(); return; }

    this.appointmentService.updateAppointment(appt.id, { status: newStatus }).subscribe({
      next: () => {
        const i = this.appointments.findIndex(a => a.id === appt.id);
        if (i !== -1) this.appointments[i].status = newStatus;
        if (this.selected?.id === appt.id) this.selected.status = newStatus;
        this.applyFilters();
        this.cancelDialog();
      },
      error: () => this.cancelDialog()
    });
  }

  // ── Helper Methods for Enhanced Drawer ────────────────────

  /** Calculate end time based on start time + duration */
  getEndTime(appt: any): string {
    if (!appt?.appointment_time || !appt?.duration_minutes) return '';
    const parts = appt.appointment_time.split(':');
    const startMin = parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
    const endMin = startMin + parseInt(appt.duration_minutes, 10);
    const h = Math.floor(endMin / 60);
    const m = endMin % 60;
    const period = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 === 0 ? 12 : h % 12;
    return `${hour}:${String(m).padStart(2, '0')} ${period}`;
  }

  /** Format a date string (e.g. created_at) into a readable format */
  formatDateStr(dateStr: string): string {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  }

  /** Placeholder for adding a staff note (can be extended later) */
  addNote(appt: any): void {
    // Future: open a small inline prompt or modal to add notes
    const note = prompt('Add a staff note for this reservation:');
    if (note && note.trim()) {
      // Update locally
      if (this.selected) this.selected.notes = note.trim();
      // Optionally call API to save note
      // this.appointmentService.updateAppointment(appt.id, { notes: note.trim() }).subscribe(...)
    }
  }

  // ── Create Reservation ─────────────────────────────────────

  openCreateModal(): void {
    // Navigate to appointment creation page with barber's shop pre-selected
    const shopId = this.authService.currentUserValue?.shop_id;
    const queryParams: any = {};
    if (shopId) {
      queryParams.shop_id = shopId;
    }
    this.router.navigate(['/appointments/new'], { queryParams });
  }


  // Generate time slots HH:MM for time dropdown (7:00 – 21:30)
  getTimeOptions(): string[] {
    const slots: string[] = [];
    for (let h = 7; h < 22; h++) {
      for (const m of [0, 30]) {
        slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
      }
    }
    return slots;
  }

  // Helpers
  statusLabel(s: string): string {
    return s.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase());
  }
  statusClass(s: string): string {
    const m: Record<string, string> = {
      confirmed: 'badge-confirmed', completed: 'badge-completed',
      pending: 'badge-pending', cancelled: 'badge-cancelled', no_show: 'badge-nshow'
    };
    return m[s] || 'badge-pending';
  }
  countByStatus(s: string): number {
    return s === 'all' ? this.appointments.length
      : this.appointments.filter(a => a.status === s).length;
  }
  formatTime(t: string): string {
    if (!t) return '';
    const parts = t.split(':');
    const h = parseInt(parts[0], 10);
    const m = parts[1] || '00';
    const period = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 === 0 ? 12 : h % 12;
    return `${hour}:${m} ${period}`;
  }

  /** Returns today's date as YYYY-MM-DD — safe to use in template bindings */
  get todayStr(): string {
    return this.toDateStr(new Date());
  }

  onDateChange(): void {
    this.loadAppointments();
  }

  changeDay(offset: number): void {
    if (!this.selectedDate) return;
    const d = new Date(this.selectedDate + 'T00:00:00');
    d.setDate(d.getDate() + offset);
    this.selectedDate = this.toDateStr(d);
    this.loadAppointments();
  }

  getSelectedDateFriendly(): string {
    if (!this.selectedDate) return '';
    const d = new Date(this.selectedDate + 'T00:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  }

  getDailySlots(): any[] {
    if (!this.selectedDate || !this.schedule.length) return [];
    const dateObj = new Date(this.selectedDate + 'T00:00:00');
    const dayOfWeek = dateObj.getDay();
    const daySched = this.schedule.find(s => s.day_of_week === dayOfWeek);

    if (!daySched || !daySched.is_available) return [];

    const slots: any[] = [];
    const startMin  = this.timeToMinutes(daySched.start_time);
    const endMin    = this.timeToMinutes(daySched.end_time);
    const breakStart = daySched.break_start_time ? this.timeToMinutes(daySched.break_start_time) : -1;
    const breakEnd   = daySched.break_end_time   ? this.timeToMinutes(daySched.break_end_time)   : -1;

    // Build a set of minutes that are "busy" due to ongoing appointments
    // so a 45-min booking starting at 09:00 also blocks 09:30
    const busyMinutes = new Map<number, any>(); // minute → appointment
    const dayAppts = this.appointments.filter(a =>
      a.appointment_date === this.selectedDate &&
      !['cancelled', 'no_show'].includes(a.status)
    );
    for (const appt of dayAppts) {
      const apptStart = this.timeToMinutes(this.normaliseTime(appt.appointment_time));
      const duration  = parseInt(appt.duration_minutes, 10) || 30;
      for (let m = apptStart; m < apptStart + duration; m++) {
        if (!busyMinutes.has(m)) busyMinutes.set(m, appt);
      }
    }

    let current = startMin;
    while (current < endMin) {
      const timeStr = this.minutesToTimeStr(current);

      // Break slot
      if (breakStart >= 0 && current >= breakStart && current < breakEnd) {
        // Only push one break block at the start of the break
        if (current === breakStart) {
          slots.push({
            time: timeStr,
            label: this.formatTime(timeStr),
            appointment: null,
            isBreak: true,
            breakDuration: breakEnd - breakStart
          });
        }
        current += 30;
        continue;
      }

      // Check if this minute is busy
      const occupyingAppt = busyMinutes.get(current) || null;
      // Only emit a slot at the appointment's actual start time, not continuation minutes
      const isApptStart = occupyingAppt &&
        this.timeToMinutes(this.normaliseTime(occupyingAppt.appointment_time)) === current;

      if (!occupyingAppt || isApptStart) {
        slots.push({
          time: timeStr,
          label: this.formatTime(timeStr),
          appointment: occupyingAppt,
          isBreak: false,
          breakDuration: 0
        });
      }
      // Advance: if this slot has an appointment, jump by its duration; otherwise 30 min
      if (isApptStart && occupyingAppt) {
        const dur = parseInt(occupyingAppt.duration_minutes, 10) || 30;
        // Round up to next 30-min boundary so the grid stays aligned
        current += dur;
      } else if (!occupyingAppt) {
        current += 30;
      } else {
        current += 30; // continuation of a busy block — skip
      }
    }
    return slots;
  }

  isDayClosed(): boolean {
    if (!this.selectedDate || !this.schedule.length) return false;
    const dateObj = new Date(this.selectedDate + 'T00:00:00');
    const dayOfWeek = dateObj.getDay();
    const daySched = this.schedule.find(s => s.day_of_week === dayOfWeek);
    return !daySched || !daySched.is_available;
  }

  getScheduleForDate(): any | null {
    if (!this.selectedDate || !this.schedule.length) return null;
    const dateObj = new Date(this.selectedDate + 'T00:00:00');
    const dayOfWeek = dateObj.getDay();
    const daySched = this.schedule.find(s => s.day_of_week === dayOfWeek);
    return (daySched && daySched.is_available) ? daySched : null;
  }

  private timeToMinutes(t: string): number {
    if (!t) return 0;
    const parts = t.split(':');
    return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
  }

  private minutesToTimeStr(m: number): string {
    const hours = Math.floor(m / 60);
    const mins = m % 60;
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  }

  private normaliseTime(t: string): string {
    if (!t) return '';
    const parts = t.split(':');
    return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
  }

  toDateStr(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  initDefaultSchedule(): void {
    const days = [1, 2, 3, 4, 5, 6, 0];
    this.schedule = days.map(d => ({
      day_of_week: d,
      start_time: '09:00',
      end_time: '18:00',
      break_start_time: '13:00',
      break_end_time: '14:00',
      is_available: d !== 0
    }));
  }
}
