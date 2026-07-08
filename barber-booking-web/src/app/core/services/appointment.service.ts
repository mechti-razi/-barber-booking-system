import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AppointmentService {
  private apiUrl = environment.apiUrl;
  private mockLocalStorageKey = 'barber_booking_mock_appointments';

  private defaultAppointments = [
    { id: 1, shop_id: 1, barber_id: 1, service_name: 'Classic Cut', client_name: 'Liam Neeson', date: '2026-06-23', time: '10:00 AM', price: 30, status: 'confirmed' },
    { id: 2, shop_id: 1, barber_id: 1, service_name: 'Beard Grooming', client_name: 'Emma Watson', date: '2026-06-22', time: '11:30 AM', price: 25, status: 'completed' },
    { id: 3, shop_id: 1, barber_id: 2, service_name: 'Shave & Facial', client_name: 'Ryan Gosling', date: '2026-06-24', time: '02:00 PM', price: 40, status: 'pending' },
    { id: 4, shop_id: 1, barber_id: 3, service_name: 'Classic Cut', client_name: 'Tom Hardy', date: '2026-06-20', time: '03:30 PM', price: 30, status: 'completed' },
    { id: 5, shop_id: 1, barber_id: 2, service_name: 'Beard Grooming', client_name: 'Zendaya', date: '2026-06-15', time: '01:00 PM', price: 25, status: 'completed' },
    { id: 6, shop_id: 1, barber_id: 1, service_name: 'Classic Cut', client_name: 'Robert Downey Jr.', date: '2026-06-19', time: '09:00 AM', price: 30, status: 'completed' }
  ];

  constructor(private http: HttpClient) {
    this.seedMockDatabase();
  }

  private seedMockDatabase() {
    if (!localStorage.getItem(this.mockLocalStorageKey)) {
      localStorage.setItem(this.mockLocalStorageKey, JSON.stringify(this.defaultAppointments));
    }
  }

  private getMockAppointments(): any[] {
    this.seedMockDatabase();
    return JSON.parse(localStorage.getItem(this.mockLocalStorageKey) || '[]');
  }

  private saveMockAppointments(appointments: any[]) {
    localStorage.setItem(this.mockLocalStorageKey, JSON.stringify(appointments));
  }

  getAppointments(params?: any): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/appointments`, { params }).pipe(
      map(apps => {
        if (!apps || apps.length === 0) {
          return this.getMockAppointments();
        }
        return apps;
      }),
      catchError(() => {
        return of(this.getMockAppointments());
      })
    );
  }

  getMyAppointments(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/my-appointments`).pipe(
      map(apps => {
        if (!apps || apps.length === 0) {
          return this.getMockAppointments();
        }
        return apps;
      }),
      catchError(() => {
        // Fallback for user's own appointments
        return of(this.getMockAppointments());
      })
    );
  }

  getAppointment(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/appointments/${id}`).pipe(
      catchError(() => {
        const appointment = this.getMockAppointments().find(a => a.id === id);
        return appointment ? of(appointment) : throwError(() => new Error('Appointment not found'));
      })
    );
  }

  createAppointment(data: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/appointments`, data).pipe(
      catchError(() => {
        const appointments = this.getMockAppointments();
        const newAppointment = {
          id: appointments.length ? Math.max(...appointments.map((a: any) => a.id)) + 1 : 1,
          shop_id:          data.shop_id || 1,
          barber_id:        data.barber_id || 1,
          service_name:     data.service_name || 'Haircut',
          client_name:      data.client_name || 'Guest Client',
          // Store date in BOTH field names so filters work consistently
          date:             data.appointment_date || data.date || new Date().toISOString().split('T')[0],
          appointment_date: data.appointment_date || data.date || new Date().toISOString().split('T')[0],
          time:             data.appointment_time || data.time || '12:00',
          appointment_time: data.appointment_time || data.time || '12:00',
          price:            data.price || 30,
          status:           'confirmed'
        };
        appointments.push(newAppointment);
        this.saveMockAppointments(appointments);
        return of(newAppointment);
      })
    );
  }

  createBarberReservation(data: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/barber-panel/reservations`, data);
  }

  updateAppointment(id: number, data: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/appointments/${id}`, data).pipe(
      catchError(() => {
        const appointments = this.getMockAppointments();
        const index = appointments.findIndex(a => a.id === id);
        if (index !== -1) {
          appointments[index] = { ...appointments[index], ...data };
          this.saveMockAppointments(appointments);
          return of(appointments[index]);
        }
        return throwError(() => new Error('Appointment not found'));
      })
    );
  }

  /** Return all active (non-cancelled/no-show) appointments for a specific barber on a given date (YYYY-MM-DD) */
  getBarberAppointmentsForDate(barberId: number, date: string): Observable<any[]> {
    return this.http.get<any[]>(
      `${this.apiUrl}/appointments?barber_id=${barberId}&date=${date}`
    ).pipe(
      catchError(() => {
        // Fallback to mock data: filter strictly by barber + date + active status
        const all = this.getMockAppointments();
        return of(
          all.filter(
            (a: any) =>
              a.barber_id === barberId &&
              (a.date === date || a.appointment_date === date) &&
              a.status !== 'cancelled' &&
              a.status !== 'no_show'
          )
        );
      })
    );
  }

  deleteAppointment(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/appointments/${id}`).pipe(
      catchError(() => {
        let appointments = this.getMockAppointments();
        appointments = appointments.filter(a => a.id !== id);
        this.saveMockAppointments(appointments);
        return of({ success: true });
      })
    );
  }
}
