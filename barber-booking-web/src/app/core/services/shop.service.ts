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
}
