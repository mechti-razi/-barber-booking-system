import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class BarberService {
  private apiUrl = environment.apiUrl;
  private mockLocalStorageKey = 'barber_booking_mock_barbers';

  // Default mock barbers to seed localStorage if empty
  // schedule: { workDays: 0=Sun…6=Sat[], startHour: 9, endHour: 18, slotMinutes: 30 }
  private defaultBarbers = [
    {
      id: 1, user_id: 1, name: 'Marco Velo', email: 'marco@barberbook.com',
      phone: '+1 555-0192', specialization: 'Haircut & Styling', experience: '8 years',
      rating: 4.9, active: true, shop_id: 1,
      subscription_type: 'monthly',
      subscription_expiry_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      schedule: { workDays: [1,2,3,4,5], startHour: 9, endHour: 18, slotMinutes: 30 },
      created_at: new Date(2025, 4, 12).toISOString()
    },
    {
      id: 2, user_id: 2, name: 'Sven Larson', email: 'sven@barberbook.com',
      phone: '+1 555-0144', specialization: 'Beard Grooming', experience: '5 years',
      rating: 4.7, active: true, shop_id: 1,
      subscription_type: 'yearly',
      subscription_expiry_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      schedule: { workDays: [2,3,4,5,6], startHour: 10, endHour: 19, slotMinutes: 30 },
      created_at: new Date(2025, 6, 22).toISOString()
    },
    {
      id: 3, user_id: 3, name: 'Jean-Luc Dubois', email: 'jean@barberbook.com',
      phone: '+1 555-0211', specialization: 'Shave & Facial', experience: '12 years',
      rating: 5.0, active: false, shop_id: 1,
      subscription_type: 'quarterly',
      subscription_expiry_date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      schedule: { workDays: [1,3,5], startHour: 11, endHour: 17, slotMinutes: 60 },
      created_at: new Date(2026, 1, 8).toISOString()
    }
  ];

  constructor(private http: HttpClient) {
    this.seedMockDatabase();
  }

  private seedMockDatabase() {
    if (!localStorage.getItem(this.mockLocalStorageKey)) {
      localStorage.setItem(this.mockLocalStorageKey, JSON.stringify(this.defaultBarbers));
    }
  }

  private getMockBarbers(): any[] {
    this.seedMockDatabase();
    return JSON.parse(localStorage.getItem(this.mockLocalStorageKey) || '[]');
  }

  private saveMockBarbers(barbers: any[]) {
    localStorage.setItem(this.mockLocalStorageKey, JSON.stringify(barbers));
  }

  /**
   * Normalize API barber shape (nested user relation, is_active, experience_years)
   * into the flat shape the frontend components expect (name, email, active, experience).
   */
  private normalizeBarber(b: any): any {
    if (!b) return b;
    // Already flat (mock data) — return as-is only if truly normalized
    // Check for both active fields to be safe
    if (b.name && b.active !== undefined && b.is_active !== undefined) return b;

    const experienceYears = b.experience_years ?? null;
    return {
      ...b,
      user_id: b.user_id ?? b.user?.id ?? null,
      name: b.user?.name ?? b.name ?? '',
      email: b.user?.email ?? b.email ?? '',
      phone: b.user?.phone ?? b.phone ?? '',
      specialization: b.specialization ?? 'General Grooming',
      experience: b.experience ?? (experienceYears != null
        ? `${experienceYears} year${experienceYears !== 1 ? 's' : ''}`
        : '1 year'),
      experience_years: experienceYears,
      rating: b.rating != null ? Number(b.rating) : 5.0,
      active: b.is_active != null ? b.is_active : (b.active ?? true),
      is_active: b.is_active != null ? b.is_active : (b.active ?? true),
      subscription_type: b.subscription_type ?? null,
    };
  }

  getBarbers(shopId?: number): Observable<any[]> {
    let url = `${this.apiUrl}/barbers`;
    if (shopId) {
      url += `?shop_id=${shopId}`;
    }
    return this.http.get<any[]>(url).pipe(
      map((barbers: any[]) => (barbers || []).map((b: any) => this.normalizeBarber(b))),
      catchError(() => {
        // API offline — fall back to mock localStorage database
        return of(this.getMockBarbers());
      })
    );
  }

  getBarber(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/barbers/${id}`).pipe(
      map(b => this.normalizeBarber(b)),
      catchError(() => {
        const barber = this.getMockBarbers().find(b => b.id === id);
        return barber ? of(barber) : throwError(() => new Error('Barber not found'));
      })
    );
  }

  createBarber(data: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/barbers`, data).pipe(
      map(b => this.normalizeBarber({ ...b, name: data.name, email: data.email, phone: data.phone }))
      // No catchError here — let real API errors bubble up so the UI can show them.
      // The mock fallback was hiding failures and creating barbers only in localStorage
      // which disappear on reload when the real API is available.
    );
  }

  updateBarber(id: number, data: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/barbers/${id}`, data).pipe(
      map(b => this.normalizeBarber(b)),
      catchError(() => {
        const barbers = this.getMockBarbers();
        const index = barbers.findIndex(b => b.id === id);
        if (index !== -1) {
          barbers[index] = { ...barbers[index], ...data };
          this.saveMockBarbers(barbers);
          return of(barbers[index]);
        }
        return throwError(() => new Error('Barber not found'));
      })
    );
  }

  deleteBarber(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/barbers/${id}`).pipe(
      catchError(() => {
        let barbers = this.getMockBarbers();
        barbers = barbers.filter(b => b.id !== id);
        this.saveMockBarbers(barbers);
        return of({ success: true });
      })
    );
  }

  private computeExpiryDate(subscriptionType: string): string {
    const d = new Date();
    switch (subscriptionType) {
      case 'monthly':   d.setMonth(d.getMonth() + 1); break;
      case 'quarterly': d.setMonth(d.getMonth() + 3); break;
      case 'yearly':    d.setFullYear(d.getFullYear() + 1); break;
      default:          d.setMonth(d.getMonth() + 1);
    }
    return d.toISOString().split('T')[0];
  }

  // Helper toggle method for Active status
  toggleBarberActive(id: number, currentActive: boolean, subscriptionType?: string): Observable<any> {
    const newActiveState = !currentActive;

    const updateData: any = { is_active: newActiveState, active: newActiveState };
    if (subscriptionType) {
      updateData.subscription_type = subscriptionType;
    }

    // Send both field names: is_active for the API, active for mock fallback
    return this.updateBarber(id, updateData);
  }
}
