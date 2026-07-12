import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AppointmentService } from '../../../core/services/appointment.service';
import { ShopService } from '../../../core/services/shop.service';
import { AuthService } from '../../../core/services/auth.service';
import { BarberService } from '../../../core/services/barber.service';

export interface DayCell {
  date: string;       // YYYY-MM-DD
  dayNum: number;     // 1-31
  dayName: string;    // Mon, Tue…
  available: boolean; // barber works this day
  isPast: boolean;
  isToday: boolean;
}

export interface TimeSlot {
  time: string;       // "09:00"
  label: string;      // "9:00 AM"
  booked: boolean;
  past: boolean;
}

@Component({
  selector: 'app-appointment-create',
  templateUrl: './appointment-create.component.html',
  styleUrls: ['./appointment-create.component.css']
})
export class AppointmentCreateComponent implements OnInit {

  appointmentForm: FormGroup;
  loading        = true;
  loadingSlots   = false;
  error          = '';

  shops           : any[]       = [];
  selectedShop    : any         = null;
  selectedBarber  : any         = null;
  selectedService : any         = null;

  /** True when the user arrived from a shop/service page (query params contain shop_id + service_id).
   *  Hides the "choose a shop" step since it is already pre-filled. */
  comingFromShop  = false;

  // Week navigation
  calendarWeeks  : DayCell[][] = [];
  currentWeekOffset = 0;        // 0 = this week, 1 = next week…
  selectedDate   : string       = '';    // YYYY-MM-DD

  // Time slots
  allSlots       : TimeSlot[]  = [];
  selectedTime   : string       = '';    // "09:00"

  isBarber       = false;

  // Default schedule fallback when barber has none
  private defaultSchedule = { workDays: [1,2,3,4,5], startHour: 9, endHour: 18, slotMinutes: 30 };

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private appointmentService: AppointmentService,
    private shopService: ShopService,
    private authService: AuthService,
    private barberService: BarberService
  ) {
    this.appointmentForm = this.fb.group({
      shop_id           : ['', Validators.required],
      barber_id         : ['', Validators.required],
      service_id        : ['', Validators.required],
      appointment_date  : ['', Validators.required],
      appointment_time  : ['', Validators.required],
      notes             : [''],
      client_first_name : [''],
      client_last_name  : [''],
      client_phone      : [''],
      client_email      : ['']
    });
  }

  ngOnInit(): void {
    if (!this.authService.isLoggedIn) {
      this.router.navigate(['/auth/login'], { queryParams: { returnUrl: this.router.url } });
      return;
    }
    this.isBarber = this.authService.currentUserValue?.role === 'barber';
    if (this.isBarber) {
      this.appointmentForm.get('client_first_name')?.setValidators([Validators.required]);
      this.appointmentForm.get('client_last_name')?.setValidators([Validators.required]);
      this.appointmentForm.get('client_phone')?.setValidators([Validators.required]);
      this.appointmentForm.get('client_first_name')?.updateValueAndValidity();
      this.appointmentForm.get('client_last_name')?.updateValueAndValidity();
      this.appointmentForm.get('client_phone')?.updateValueAndValidity();
    }
    this.loadShops();
    this.buildCalendar();
  }

  // ── Data loading ─────────────────────────────────────────

  loadShops(): void {
    console.log('Loading shops...');
    this.shopService.getShops().subscribe({
      next: d => {
        console.log('Shops loaded:', d);
        this.shops = d;
        this.loading = false;

        // Prepopulate the schedule property for all barbers in all shops
        this.shops.forEach(shop => {
          shop.barbers?.forEach((barber: any) => {
            const workingSchedules = barber.working_schedules || [];
            const workDays = workingSchedules
              .filter((s: any) => s.is_available)
              .map((s: any) => +s.day_of_week);

            const firstActiveDay = workingSchedules.find((s: any) => s.is_available);
            const startHour = firstActiveDay ? this.parseTimeHour(firstActiveDay.start_time) : 9;
            const endHour = firstActiveDay ? this.parseTimeHour(firstActiveDay.end_time) : 18;

            barber.schedule = {
              workDays: workingSchedules.length > 0 ? workDays : [1, 2, 3, 4, 5],
              startHour,
              endHour,
              slotMinutes: 30
            };
          });
        });

        const shopId    = this.route.snapshot.queryParamMap.get('shop_id');
        const barberId  = this.route.snapshot.queryParamMap.get('barber_id');
        const serviceId = this.route.snapshot.queryParamMap.get('service_id');

        // Mark as "coming from shop" so the shop-selection step is hidden
        if (shopId && serviceId) {
          this.comingFromShop = true;
        }

        console.log('Query params - shopId:', shopId, 'barberId:', barberId, 'serviceId:', serviceId);
        console.log('Is barber:', this.isBarber, 'User shop_id:', this.authService.currentUserValue?.shop_id);

        let sId: number | null = null;
        if (shopId) {
          sId = +shopId;
        } else if (this.isBarber && this.authService.currentUserValue?.shop_id) {
          sId = +this.authService.currentUserValue.shop_id;
        }

        // For barbers, if no shop_id found but shops exist, default to first shop
        if (this.isBarber && !sId && this.shops.length > 0) {
          sId = this.shops[0].id;
          console.log('Defaulting to first shop:', sId);
        }

        if (sId) {
          this.appointmentForm.patchValue({ shop_id: sId });
          this.selectedShop = this.shops.find(s => s.id === sId) || null;
          console.log('Selected shop:', this.selectedShop);
          
          if (this.selectedShop) {
            if (serviceId) {
              const svId = +serviceId;
              this.appointmentForm.patchValue({ service_id: svId });
              this.selectedService = this.selectedShop.services?.find((s: any) => s.id === svId) || null;
            }
            let bId: number | null = null;
            if (barberId) {
              bId = +barberId;
            } else if (this.isBarber) {
              const matchingBarber = this.selectedShop.barbers?.find((b: any) => b.user_id === this.authService.currentUserValue?.id);
              if (matchingBarber) {
                bId = matchingBarber.id;
                console.log('Found matching barber:', matchingBarber);
              }
            }

            if (bId) {
              this.appointmentForm.patchValue({ barber_id: bId });
              this.fetchBarberSchedule(bId);
            } else {
              this.buildCalendar();
            }
          }
        } else {
          console.log('No shop ID found, showing empty state');
        }
      },
      error: (err) => {
        console.error('Failed to load shops:', err);
        this.error = 'Failed to load shops';
        this.loading = false;
      }
    });
  }

  fetchBarberSchedule(barberId: number): void {
    this.loading = true;
    this.barberService.getBarber(barberId).subscribe({
      next: (barber) => {
        const workingSchedules = barber.working_schedules || [];
        const workDays = workingSchedules
          .filter((s: any) => s.is_available)
          .map((s: any) => +s.day_of_week);

        const firstActiveDay = workingSchedules.find((s: any) => s.is_available);
        const startHour = firstActiveDay ? this.parseTimeHour(firstActiveDay.start_time) : 9;
        const endHour = firstActiveDay ? this.parseTimeHour(firstActiveDay.end_time) : 18;

        barber.schedule = {
          workDays: workingSchedules.length > 0 ? workDays : [1, 2, 3, 4, 5],
          startHour,
          endHour,
          slotMinutes: 30
        };

        this.selectedBarber = barber;
        this.buildCalendar();
        if (this.selectedDate) {
          this.loadSlots(this.selectedDate);
        }
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.buildCalendar();
        if (this.selectedDate) {
          this.loadSlots(this.selectedDate);
        }
      }
    });
  }

  // ── Shop / barber / service change handlers ──────────────

  onShopChange(shopId: number): void {
    this.selectedShop    = this.shops.find(s => s.id === shopId) || null;
    this.selectedBarber  = null;
    this.selectedService = null;
    this.selectedDate    = '';
    this.selectedTime    = '';
    this.allSlots        = [];
    this.appointmentForm.patchValue({ barber_id: '', service_id: '', appointment_date: '', appointment_time: '' });
    this.buildCalendar();
  }

  selectBarber(b: any): void {
    this.appointmentForm.patchValue({ barber_id: b.id, appointment_date: '', appointment_time: '' });
    this.selectedDate = '';
    this.selectedTime = '';
    this.allSlots     = [];
    this.fetchBarberSchedule(b.id);
  }

  selectService(svc: any): void {
    this.selectedService = svc;
    this.appointmentForm.patchValue({ service_id: svc.id });
  }

  onBarberChange(barberId: number): void {
    if (this.selectedShop) {
      const b = this.selectedShop.barbers?.find((b: any) => b.id === +barberId) || null;
      if (b) {
        this.appointmentForm.patchValue({ appointment_date: '', appointment_time: '' });
        this.selectedDate = '';
        this.selectedTime = '';
        this.allSlots     = [];
        this.fetchBarberSchedule(b.id);
      }
    }
  }

  // ── Calendar (7-day week view) ───────────────────────────

  get barberSchedule(): typeof this.defaultSchedule {
    return this.selectedBarber?.schedule ?? this.defaultSchedule;
  }

  buildCalendar(): void {
    const today = new Date();
    today.setHours(0,0,0,0);

    // Start of the displayed week (Monday-aligned)
    const monday = new Date(today);
    const dayOfWeek = today.getDay() === 0 ? 6 : today.getDay() - 1;
    monday.setDate(today.getDate() - dayOfWeek + this.currentWeekOffset * 7);

    const schedule = this.barberSchedule;
    const week: DayCell[] = [];

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dateStr = this.toDateStr(d);
      const jsDay   = d.getDay(); // 0=Sun

      // Check working_schedules if present AND has entries, otherwise fall back to schedule.workDays
      let dayAvailable = false;
      const ws = this.selectedBarber?.working_schedules;
      if (ws && ws.length > 0) {
        const daySchedule = ws.find((s: any) => +s.day_of_week === jsDay);
        dayAvailable = daySchedule ? !!daySchedule.is_available : false;
      } else {
        dayAvailable = schedule.workDays.includes(jsDay);
      }

      week.push({
        date     : dateStr,
        dayNum   : d.getDate(),
        dayName  : d.toLocaleDateString('en-US', { weekday: 'short' }),
        available: dayAvailable && !this.isPastDate(d, today),
        isPast   : this.isPastDate(d, today),
        isToday  : dateStr === this.toDateStr(today)
      });
    }

    this.calendarWeeks = [week];
  }

  private isPastDate(d: Date, today: Date): boolean {
    const copy = new Date(d); copy.setHours(0,0,0,0);
    return copy < today;
  }

  prevWeek(): void {
    if (this.currentWeekOffset > 0) {
      this.currentWeekOffset--;
      this.buildCalendar();
    }
  }

  nextWeek(): void {
    if (this.currentWeekOffset < 7) {        // cap at 8 weeks ahead
      this.currentWeekOffset++;
      this.buildCalendar();
    }
  }

  get canGoPrev(): boolean { return this.currentWeekOffset > 0; }

  get weekLabel(): string {
    const week = this.calendarWeeks[0];
    if (!week?.length) return '';
    const first = new Date(week[0].date);
    const last  = new Date(week[6].date);
    const mo = first.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const la = last.toLocaleDateString('en-US',  { month: 'short', day: 'numeric' });
    return `${mo} – ${la}`;
  }

  selectDay(cell: DayCell): void {
    if (!cell.available) return;
    this.selectedDate = cell.date;
    this.selectedTime = '';
    this.appointmentForm.patchValue({ appointment_date: cell.date, appointment_time: '' });
    this.loadSlots(cell.date);
  }

  // ── Slot generation ──────────────────────────────────────

  loadSlots(date: string): void {
    const barberId   = this.selectedBarber?.id;
    const chosenDate = new Date(date + 'T00:00:00');
    const jsDay      = chosenDate.getDay(); // 0=Sun, 1=Mon...

    // Find the specific schedule for this day from working_schedules (only if non-empty)
    const ws = this.selectedBarber?.working_schedules;
    const daySchedule = (ws && ws.length > 0)
      ? ws.find((s: any) => +s.day_of_week === jsDay)
      : null;

    let allGenerated: TimeSlot[] = [];
    if (daySchedule) {
      allGenerated = this.generateSlotsForDaySchedule(daySchedule, date);
    } else {
      const schedule = this.barberSchedule;
      allGenerated = this.generateSlots(schedule, date);
    }

    if (!barberId) {
      this.allSlots = allGenerated;
      return;
    }

    this.loadingSlots = true;
    this.appointmentService.getBarberAppointmentsForDate(barberId, date).subscribe({
      next: (booked) => {
        const bookedTimes = new Set(
          booked.map((a: any) => this.normalise24h(a.time || a.appointment_time || ''))
        );
        this.allSlots = allGenerated.map(s => ({
          ...s,
          booked: bookedTimes.has(s.time)
        }));
        this.loadingSlots = false;
      },
      error: () => {
        this.allSlots     = allGenerated;
        this.loadingSlots = false;
      }
    });
  }

  private generateSlotsForDaySchedule(daySchedule: any, date: string): TimeSlot[] {
    const slots: TimeSlot[] = [];
    if (!daySchedule || !daySchedule.is_available) {
      return [];
    }

    const now     = new Date();
    const isToday = date === this.toDateStr(now);

    const [startH, startM] = (daySchedule.start_time || '09:00').split(':').map(Number);
    const [endH, endM] = (daySchedule.end_time || '18:00').split(':').map(Number);

    let breakStartH = -1, breakStartM = -1;
    let breakEndH = -1, breakEndM = -1;
    if (daySchedule.break_start_time && daySchedule.break_end_time) {
      [breakStartH, breakStartM] = daySchedule.break_start_time.split(':').map(Number);
      [breakEndH, breakEndM] = daySchedule.break_end_time.split(':').map(Number);
    }

    const slotMinutes = 30; // default duration

    let h = startH;
    let m = startM;

    while (h < endH || (h === endH && m < endM)) {
      // Check if slot falls inside the break time
      const isBreak = (breakStartH !== -1) && (
        (h > breakStartH || (h === breakStartH && m >= breakStartM)) &&
        (h < breakEndH || (h === breakEndH && m < breakEndM))
      );

      if (!isBreak) {
        const hh    = String(h).padStart(2, '0');
        const mm    = String(m).padStart(2, '0');
        const time  = `${hh}:${mm}`;
        const label = this.to12h(h, m);
        const past  = isToday && (h < now.getHours() || (h === now.getHours() && m <= now.getMinutes()));

        slots.push({ time, label, booked: false, past });
      }

      m += slotMinutes;
      if (m >= 60) { h += Math.floor(m / 60); m = m % 60; }
    }
    return slots;
  }

  private generateSlots(schedule: typeof this.defaultSchedule, date: string): TimeSlot[] {
    const slots: TimeSlot[] = [];
    const now     = new Date();
    const isToday = date === this.toDateStr(now);

    let h = schedule.startHour;
    let m = 0;

    while (h < schedule.endHour || (h === schedule.endHour && m === 0)) {
      const hh    = String(h).padStart(2, '0');
      const mm    = String(m).padStart(2, '0');
      const time  = `${hh}:${mm}`;
      const label = this.to12h(h, m);
      const past  = isToday && (h < now.getHours() || (h === now.getHours() && m <= now.getMinutes()));

      slots.push({ time, label, booked: false, past });

      m += schedule.slotMinutes;
      if (m >= 60) { h += Math.floor(m / 60); m = m % 60; }
    }
    return slots;
  }

  selectSlot(slot: TimeSlot): void {
    if (slot.booked || slot.past) return;
    this.selectedTime = slot.time;
    this.appointmentForm.patchValue({ appointment_time: slot.time });
  }

  get availableSlotCount(): number {
    return this.allSlots.filter(s => !s.booked && !s.past).length;
  }

  // ── Submit ───────────────────────────────────────────────

  onSubmit(): void {
    if (this.appointmentForm.invalid) {
      this.appointmentForm.markAllAsTouched();
      return;
    }
    this.loading = true;
    const v = this.appointmentForm.value;

    // Resolve selectedService if not already set
    if (!this.selectedService && v.service_id && this.selectedShop) {
      this.selectedService = this.selectedShop.services?.find((s: any) => s.id === +v.service_id) || null;
    }

    const price = this.selectedService?.base_price ?? this.selectedService?.price ?? 0;

    if (this.isBarber) {
      this.appointmentService.createBarberReservation({
        client_first_name: v.client_first_name,
        client_last_name: v.client_last_name,
        client_phone: v.client_phone,
        client_email: v.client_email || null,
        service_id: +v.service_id,
        barber_id: v.barber_id ? +v.barber_id : null,
        appointment_date: v.appointment_date,
        appointment_time: v.appointment_time,
        notes: v.notes || null,
      }).subscribe({
        next: () => this.router.navigate(['/barber/reservations']),
        error: (err) => {
          const errs = err?.error?.errors;
          this.error = errs ? Object.values(errs).flat().join(' ') : (err?.error?.error || err?.error?.message || 'Failed to create reservation');
          this.loading = false;
        }
      });
    } else {
      this.appointmentService.createAppointment({
        ...v,
        user_id          : this.authService.currentUserValue?.id,
        service_name     : this.selectedService?.name || '',
        duration_minutes : this.selectedService?.duration_minutes || 30,
        total_price      : price,
        price            : price,
        date             : v.appointment_date,
        time             : v.appointment_time
      }).subscribe({
        next: () => this.router.navigate(['/appointments']),
        error: (err) => {
          this.error   = err?.error?.message || 'Failed to create appointment';
          this.loading = false;
        }
      });
    }
  }

  cancel(): void {
    if (this.isBarber) {
      this.router.navigate(['/barber/reservations']);
    } else {
      this.router.navigate(['/shops']);
    }
  }

  get f() { return this.appointmentForm.controls; }

  // ── Helpers ──────────────────────────────────────────────

  private toDateStr(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }

  private to12h(h: number, m: number): string {
    const period = h >= 12 ? 'PM' : 'AM';
    const hh     = h > 12 ? h - 12 : h === 0 ? 12 : h;
    return `${hh}:${String(m).padStart(2,'0')} ${period}`;
  }

  private normalise24h(raw: string): string {
    // Accepts "09:00", "9:00 AM", "02:00 PM" → "09:00"
    const match12 = raw.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (match12) {
      let h = parseInt(match12[1], 10);
      const mn = match12[2];
      const p  = match12[3].toUpperCase();
      if (p === 'PM' && h !== 12) h += 12;
      if (p === 'AM' && h === 12) h = 0;
      return `${String(h).padStart(2,'0')}:${mn}`;
    }
    return raw.substring(0, 5); // already HH:MM
  }

  /** Parses an hour from "09:00", "02:00 PM", or an ISO datetime string */
  private parseTimeHour(raw: string): number {
    if (!raw) return 9;
    // ISO datetime string e.g. "1970-01-01T09:00:00.000000Z"
    if (raw.includes('T')) {
      const timePart = raw.split('T')[1]; // "09:00:00.000000Z"
      return parseInt(timePart.split(':')[0], 10);
    }
    // Plain HH:MM or H:MM
    return parseInt(raw.split(':')[0], 10);
  }

  get selectedDateLabel(): string {
    if (!this.selectedDate) return '';
    const d = new Date(this.selectedDate + 'T00:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  }

  get selectedTimeLabel(): string {
    const slot = this.allSlots.find(s => s.time === this.selectedTime);
    return slot ? slot.label : this.selectedTime;
  }

  workDaysLabel(scheduleOrBarber: any): string {
    const names = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    // If compact schedule format: { workDays: [1,2,3,...] }
    if (scheduleOrBarber?.workDays) {
      return scheduleOrBarber.workDays.map((d: number) => names[d]).join(', ');
    }
    // If raw working_schedules array from API
    if (scheduleOrBarber?.working_schedules) {
      return scheduleOrBarber.working_schedules
        .filter((s: any) => s.is_available)
        .map((s: any) => names[+s.day_of_week])
        .join(', ');
    }
    return '';
  }
}
