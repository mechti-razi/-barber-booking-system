import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

interface StaffMember {
  id: number;
  user_id: number;
  name: string;
  email: string;
  phone: string;
  specialization: string;
  experience_years: number;
  rating: string | number;
  bio: string;
  is_active: boolean;
  joined_at: string;
}

@Component({
  selector: 'app-barber-staff',
  templateUrl: './barber-staff.component.html',
  styleUrls: ['./barber-staff.component.css']
})
export class BarberStaffComponent implements OnInit {

  loading = true;
  submitting = false;
  apiUrl = environment.apiUrl;

  staff: StaffMember[] = [];
  modalOpen = false;

  // Staff performance details modal
  detailsModalOpen = false;
  loadingPerformance = false;
  selectedStaffPerformance: any = null;
  activeDetailsTab: 'agenda' | 'schedule' = 'agenda';

  // New Staff form model
  newStaff = {
    name: '',
    email: '',
    phone: '',
    password: '',
    specialization: '',
    experience_years: 1,
    bio: ''
  };

  formErrors: Record<string, string[]> = {};
  errorMessage = '';
  successMessage = '';

  constructor(private http: HttpClient) { }

  ngOnInit(): void {
    this.loadStaff();
  }

  loadStaff(): void {
    this.loading = true;
    this.errorMessage = '';
    this.http.get<StaffMember[]>(`${this.apiUrl}/barber-panel/staff`).subscribe({
      next: (res) => {
        this.staff = res;
        this.loading = false;
      },
      error: (err) => {
        this.errorMessage = err?.error?.message || 'Failed to load staff list from the server.';
        this.staff = [];
        this.loading = false;
      }
    });
  }

  get totalStaffCount(): number {
    return this.staff.length;
  }

  get activeStaffCount(): number {
    return this.staff.filter(s => s.is_active).length;
  }

  get averageRating(): number {
    const activeWithRating = this.staff.filter(s => parseFloat(s.rating.toString()) > 0);
    if (activeWithRating.length === 0) return 5.0;
    const total = activeWithRating.reduce((sum, s) => sum + parseFloat(s.rating.toString()), 0);
    return Math.round((total / activeWithRating.length) * 10) / 10;
  }

  toggleActive(member: StaffMember): void {
    this.errorMessage = '';
    this.http.patch<any>(`${this.apiUrl}/barber-panel/staff/${member.id}/toggle`, {}).subscribe({
      next: (res) => {
        member.is_active = res.is_active;
      },
      error: (err) => {
        this.errorMessage = err?.error?.message || 'Failed to update staff member status.';
        setTimeout(() => this.errorMessage = '', 4000);
      }
    });
  }

  removeStaff(id: number): void {
    if (!confirm('Are you sure you want to deactivate this staff member? They will no longer be bookable.')) return;
    this.errorMessage = '';

    this.http.delete(`${this.apiUrl}/barber-panel/staff/${id}`).subscribe({
      next: () => {
        const found = this.staff.find(s => s.id === id);
        if (found) found.is_active = false;
      },
      error: (err) => {
        this.errorMessage = err?.error?.message || 'Failed to deactivate staff member.';
        setTimeout(() => this.errorMessage = '', 4000);
      }
    });
  }

  openModal(): void {
    this.modalOpen = true;
    this.formErrors = {};
    this.errorMessage = '';
    this.successMessage = '';
    this.newStaff = {
      name: '',
      email: '',
      phone: '',
      password: '',
      specialization: '',
      experience_years: 1,
      bio: ''
    };
  }

  closeModal(): void {
    this.modalOpen = false;
  }

  hireStaff(): void {
    this.submitting = true;
    this.formErrors = {};
    this.errorMessage = '';
    this.successMessage = '';

    this.http.post<any>(`${this.apiUrl}/barber-panel/staff`, this.newStaff).subscribe({
      next: (res) => {
        this.submitting = false;
        this.successMessage = 'Staff member hired successfully!';
        if (res.barber) {
          this.staff.push({
            id: res.barber.id,
            user_id: res.barber.user_id,
            name: res.barber.name,
            email: res.barber.email,
            phone: res.barber.phone || '',
            specialization: res.barber.specialization || '',
            experience_years: res.barber.experience_years || 0,
            rating: res.barber.rating || 5.0,
            bio: this.newStaff.bio,
            is_active: res.barber.is_active,
            joined_at: new Date().toISOString().split('T')[0]
          });
        } else {
          this.loadStaff();
        }
        setTimeout(() => this.closeModal(), 1500);
      },
      error: (err) => {
        this.submitting = false;
        if (err.status === 422 && err.error?.errors) {
          this.formErrors = err.error.errors;
        } else {
          this.errorMessage = err?.error?.message || 'Failed to hire staff member. Please try again.';
        }
      }
    });
  }

  // Calendar variables
  currentMonth: Date = new Date();
  calendarDays: any[] = [];
  selectedDateAppointments: any[] = [];
  selectedCalendarDateStr: string = '';

  viewStaffDetails(member: StaffMember): void {
    this.detailsModalOpen = true;
    this.loadingPerformance = true;
    this.selectedStaffPerformance = null;
    this.activeDetailsTab = 'agenda';
    this.currentMonth = new Date();

    this.http.get<any>(`${this.apiUrl}/barber-panel/staff/${member.id}/performance`).subscribe({
      next: (res) => {
        this.selectedStaffPerformance = res;
        this.loadingPerformance = false;
        this.generateCalendar();
      },
      error: (err) => {
        this.errorMessage = err?.error?.message || 'Failed to load staff performance data.';
        this.loadingPerformance = false;
        setTimeout(() => this.errorMessage = '', 4000);
      }
    });
  }

  closeDetailsModal(): void {
    this.detailsModalOpen = false;
  }

  getDayName(dayNum: number): string {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[dayNum] || 'Unknown';
  }

  generateCalendar(): void {
    const year = this.currentMonth.getFullYear();
    const month = this.currentMonth.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const startDayOfWeek = firstDay.getDay();
    const daysInMonth = lastDay.getDate();
    const prevMonthLastDay = new Date(year, month, 0).getDate();

    const days: any[] = [];

    // Pad previous month days
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, prevMonthLastDay - i);
      days.push(this.createCalendarDayObj(d, false));
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(year, month, i);
      days.push(this.createCalendarDayObj(d, true));
    }

    // Pad next month days to 42 grid cells
    const totalDays = 42;
    const remainingDays = totalDays - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      const d = new Date(year, month + 1, i);
      days.push(this.createCalendarDayObj(d, false));
    }

    this.calendarDays = days;

    // Default selection
    const todayStr = this.formatDateLocal(new Date());
    const todayInCal = this.calendarDays.find(d => d.dateStr === todayStr && d.isCurrentMonth);
    if (todayInCal) {
      this.selectCalendarDay(todayInCal);
    } else {
      const firstActive = this.calendarDays.find(d => d.isCurrentMonth);
      if (firstActive) this.selectCalendarDay(firstActive);
    }
  }

  private createCalendarDayObj(date: Date, isCurrentMonth: boolean): any {
    const today = new Date();
    const isToday = date.getDate() === today.getDate() && 
                    date.getMonth() === today.getMonth() && 
                    date.getFullYear() === today.getFullYear();
    
    const dateStr = this.formatDateLocal(date);
    const appts = this.selectedStaffPerformance?.appointments?.filter((a: any) => a.date === dateStr) || [];

    return {
      date,
      dayNum: date.getDate(),
      isCurrentMonth,
      isToday,
      dateStr,
      appointments: appts
    };
  }

  private formatDateLocal(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  selectCalendarDay(day: any): void {
    this.selectedCalendarDateStr = day.dateStr;
    this.selectedDateAppointments = day.appointments;
  }

  prevMonth(): void {
    this.currentMonth = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth() - 1, 1);
    this.generateCalendar();
  }

  nextMonth(): void {
    this.currentMonth = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth() + 1, 1);
    this.generateCalendar();
  }

  getMonthName(): string {
    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    return `${monthNames[this.currentMonth.getMonth()]} ${this.currentMonth.getFullYear()}`;
  }
}

