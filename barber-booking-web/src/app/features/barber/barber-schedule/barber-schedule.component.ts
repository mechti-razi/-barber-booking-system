import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

interface DaySchedule {
  day_of_week: number;
  day_name: string;
  start_time: string;
  end_time: string;
  break_start_time: string;
  break_end_time: string;
  is_available: boolean;
}

@Component({
  selector: 'app-barber-schedule',
  templateUrl: './barber-schedule.component.html',
  styleUrls: ['./barber-schedule.component.css']
})
export class BarberScheduleComponent implements OnInit {

  loading = true;
  saving = false;
  successMessage = '';
  errorMessage = '';
  apiUrl = environment.apiUrl;

  // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  daysOfWeek = [
    { code: 1, name: 'Monday' },
    { code: 2, name: 'Tuesday' },
    { code: 3, name: 'Wednesday' },
    { code: 4, name: 'Thursday' },
    { code: 5, name: 'Friday' },
    { code: 6, name: 'Saturday' },
    { code: 0, name: 'Sunday' }
  ];

  schedule: DaySchedule[] = [];
  selectedDayCode: number = 1; // Default to Monday

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadSchedule();
  }

  get selectedDaySchedule(): DaySchedule | undefined {
    return this.schedule.find(d => d.day_of_week === this.selectedDayCode);
  }

  loadSchedule(): void {
    this.loading = true;
    this.errorMessage = '';
    this.http.get<any[]>(`${this.apiUrl}/barber-panel/schedule`).subscribe({
      next: (res) => {
        if (res && res.length > 0) {
          this.schedule = this.daysOfWeek.map(day => {
            const found = res.find(r => r.day_of_week === day.code);
            return {
              day_of_week: day.code,
              day_name: day.name,
              start_time: found ? this.formatToHHMM(found.start_time) : '09:00',
              end_time: found ? this.formatToHHMM(found.end_time) : '18:00',
              break_start_time: found && found.break_start_time ? this.formatToHHMM(found.break_start_time) : '13:00',
              break_end_time: found && found.break_end_time ? this.formatToHHMM(found.break_end_time) : '14:00',
              is_available: found ? !!found.is_available : day.code !== 0 // Sunday off by default
            };
          });
        } else {
          this.initDefaultSchedule();
        }
        this.loading = false;
      },
      error: (err) => {
        this.errorMessage = err?.error?.message || 'Failed to load working schedule from the server.';
        this.schedule = [];
        this.loading = false;
      }
    });
  }

  initDefaultSchedule(): void {
    this.schedule = this.daysOfWeek.map(day => ({
      day_of_week: day.code,
      day_name: day.name,
      start_time: '09:00',
      end_time: '18:00',
      break_start_time: '13:00',
      break_end_time: '14:00',
      is_available: day.code !== 0 // Sunday closed by default
    }));
  }

  selectDay(code: number): void {
    this.selectedDayCode = code;
  }

  copyScheduleToAll(fromDayCode: number): void {
    const source = this.schedule.find(d => d.day_of_week === fromDayCode);
    if (!source) return;
    
    this.schedule.forEach(day => {
      if (day.day_of_week !== fromDayCode) {
        day.start_time = source.start_time;
        day.end_time = source.end_time;
        day.break_start_time = source.break_start_time;
        day.break_end_time = source.break_end_time;
        day.is_available = source.is_available;
      }
    });
    
    this.successMessage = `Successfully copied ${source.day_name}'s schedule to all days! (Be sure to Save Changes to persist)`;
    setTimeout(() => this.successMessage = '', 5000);
  }

  saveSchedule(): void {
    this.saving = true;
    this.successMessage = '';
    this.errorMessage = '';

    const payload = {
      schedule: this.schedule.map(d => ({
        day_of_week: d.day_of_week,
        start_time: d.start_time,
        end_time: d.end_time,
        break_start_time: d.break_start_time || null,
        break_end_time: d.break_end_time || null,
        is_available: d.is_available
      }))
    };

    this.http.put(`${this.apiUrl}/barber-panel/schedule`, payload).subscribe({
      next: () => {
        this.saving = false;
        this.successMessage = 'Your working schedule has been saved successfully!';
        setTimeout(() => this.successMessage = '', 4000);
      },
      error: (err) => {
        this.saving = false;
        this.errorMessage = err?.error?.message || 'Failed to save working schedule. Please try again.';
        setTimeout(() => this.errorMessage = '', 4000);
      }
    });
  }

  // Generate hourly intervals for visualization preview
  generateTimeSlots(day: DaySchedule): string[] {
    if (!day.is_available) return [];
    
    const slots: string[] = [];
    let start = this.timeToMinutes(day.start_time);
    const end = this.timeToMinutes(day.end_time);
    const breakStart = day.break_start_time ? this.timeToMinutes(day.break_start_time) : -1;
    const breakEnd = day.break_end_time ? this.timeToMinutes(day.break_end_time) : -1;

    // 30 minute increments
    while (start < end) {
      if (!(start >= breakStart && start < breakEnd)) {
        slots.push(this.minutesToTime(start));
      }
      start += 30;
    }
    return slots;
  }

  // Utility converts "09:00:00" or "09:00" to "09:00"
  private formatToHHMM(timeStr: string): string {
    if (!timeStr) return '';
    const parts = timeStr.split(':');
    if (parts.length >= 2) {
      return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
    }
    return timeStr;
  }

  private timeToMinutes(timeStr: string): number {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  }

  private minutesToTime(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    const ampm = h >= 12 ? 'PM' : 'AM';
    const displayHour = h % 12 === 0 ? 12 : h % 12;
    const displayMin = m.toString().padStart(2, '0');
    return `${displayHour}:${displayMin} ${ampm}`;
  }
}
