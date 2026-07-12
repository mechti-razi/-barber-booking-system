import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ShopService {
  private apiUrl = environment.apiUrl;
  private mockLocalStorageKey = 'barber_booking_mock_shops';

  private defaultShops = [
    { id: 1, name: "Vintage Cut Barber Shop", address: "102 Luxury Boulevard, NY", phone: "+1 555-9011", logo_url: "/assets/images/barber-bg.png", active: true, status: 'active', barbers: [1, 2, 3], services: [1, 2, 3], created_at: new Date(2025, 1, 1).toISOString() }
  ];

  constructor(private http: HttpClient) {
    this.seedMockDatabase();
  }

  private seedMockDatabase() {
    if (!localStorage.getItem(this.mockLocalStorageKey)) {
      localStorage.setItem(this.mockLocalStorageKey, JSON.stringify(this.defaultShops));
    }
  }

  private getMockShops(): any[] {
    this.seedMockDatabase();
    return JSON.parse(localStorage.getItem(this.mockLocalStorageKey) || '[]');
  }

  private saveMockShops(shops: any[]) {
    localStorage.setItem(this.mockLocalStorageKey, JSON.stringify(shops));
  }

  getShops(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/shops`).pipe(
      map(shops => {
        if (!shops || shops.length === 0) {
          return this.getMockShops();
        }
        return shops;
      }),
      catchError(() => {
        return of(this.getMockShops());
      })
    );
  }

  getShop(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/shops/${id}`).pipe(
      catchError(() => {
        const shop = this.getMockShops().find(s => s.id === id);
        return shop ? of(shop) : throwError(() => new Error('Shop not found'));
      })
    );
  }

  createShop(data: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/shops`, data).pipe(
      catchError(() => {
        const shops = this.getMockShops();
        const newShop = {
          id: shops.length ? Math.max(...shops.map(s => s.id)) + 1 : 1,
          name: data.name,
          address: data.address || 'Address Not Provided',
          phone: data.phone || 'Phone Not Provided',
          logo_url: data.logo_url || '/assets/images/barber-bg.png',
          active: true,
          barbers: [],
          services: [],
          created_at: new Date().toISOString()
        };
        shops.push(newShop);
        this.saveMockShops(shops);
        return of(newShop);
      })
    );
  }

  updateShop(id: number, data: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/shops/${id}`, data).pipe(
      catchError(() => {
        const shops = this.getMockShops();
        const index = shops.findIndex(s => s.id === id);
        if (index !== -1) {
          shops[index] = { ...shops[index], ...data };
          this.saveMockShops(shops);
          return of(shops[index]);
        }
        return throwError(() => new Error('Shop not found'));
      })
    );
  }

  deleteShop(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/shops/${id}`).pipe(
      catchError(() => {
        let shops = this.getMockShops();
        shops = shops.filter(s => s.id !== id);
        this.saveMockShops(shops);
        return of({ success: true });
      })
    );
  }

  toggleShopSubscription(id: number): Observable<any> {
    const shops = this.getMockShops();
    const shop = shops.find(s => s.id === id);
    const newActiveState = shop ? !shop.active : false;
    return this.updateShop(id, { active: newActiveState });
  }

  isShopOpen(shop: any): boolean {
    if (!shop) return false;
    // Check main shop status first
    if (shop.status !== 'active' && shop.active !== true) return false;
    if (!shop.barbers || shop.barbers.length === 0) return false;

    // Get current local day of week and current hour/minute
    const now = new Date();
    const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTimeMinutes = currentHour * 60 + currentMinute;

    // Check if at least one active barber has an active working schedule for today at the current time
    return shop.barbers.some((barber: any) => {
      // Handle simple list of barber IDs/names from legacy mock seeders gracefully
      if (typeof barber === 'number' || typeof barber === 'string') {
        return true;
      }

      // Barber must be active
      if (barber.is_active === false) return false;

      // Check working_schedules relationship (snake_case from backend API)
      const schedules = barber.working_schedules;
      if (schedules && schedules.length > 0) {
        const todaySched = schedules.find((s: any) => +s.day_of_week === currentDay);
        if (!todaySched || !todaySched.is_available) return false;

        // Parse start_time and end_time
        const start = this.parseTimeToMinutes(todaySched.start_time || '09:00');
        const end = this.parseTimeToMinutes(todaySched.end_time || '18:00');

        let isWorking = currentTimeMinutes >= start && currentTimeMinutes <= end;

        // Check break times if configured
        if (todaySched.break_start_time && todaySched.break_end_time) {
          const breakStart = this.parseTimeToMinutes(todaySched.break_start_time);
          const breakEnd = this.parseTimeToMinutes(todaySched.break_end_time);
          if (currentTimeMinutes >= breakStart && currentTimeMinutes < breakEnd) {
            isWorking = false;
          }
        }
        return isWorking;
      }

      // Fallback to legacy mock schedule format
      const schedule = barber.schedule;
      if (schedule && schedule.workDays) {
        const workDays = schedule.workDays.map(Number);
        if (!workDays.includes(currentDay)) return false;

        const startHour = schedule.startHour !== undefined ? schedule.startHour : 9;
        const endHour = schedule.endHour !== undefined ? schedule.endHour : 18;

        const start = startHour * 60;
        const end = endHour * 60;

        return currentTimeMinutes >= start && currentTimeMinutes <= end;
      }

      // Default fallback if barber is active but has no schedule properties
      return true;
    });
  }

  private parseTimeToMinutes(timeStr: string): number {
    if (!timeStr) return 0;
    const parts = timeStr.split(':');
    const h = parseInt(parts[0], 10) || 0;
    const m = parseInt(parts[1], 10) || 0;
    return h * 60 + m;
  }
}
