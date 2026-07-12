import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

interface AuthResponse {
  message: string;
  user: any;
  token: string;
}

interface LoginData {
  email: string;
  password: string;
}

interface RegisterData {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
  phone?: string;
  role: 'client' | 'barber' | 'admin';
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = environment.apiUrl;
  private currentUserSubject = new BehaviorSubject<any>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient) {
    // Clear stale sessions — bump version when Passport client or token format changes
    const sessionVersion = localStorage.getItem('bb_session_v');
    if (sessionVersion !== '3') {
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      localStorage.removeItem('barber_profile');
      localStorage.setItem('bb_session_v', '3');
    }

    const token = localStorage.getItem('access_token');
    const user = localStorage.getItem('user');
    if (token && user) {
      this.currentUserSubject.next(JSON.parse(user));
    }
  }

  login(data: LoginData): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/login`, data)
      .pipe(
        map(response => {
          localStorage.setItem('access_token', response.token);
          localStorage.setItem('user', JSON.stringify(response.user));
          if ((response as any).barber_profile) {
            localStorage.setItem('barber_profile', JSON.stringify((response as any).barber_profile));
          }
          this.currentUserSubject.next(response.user);
          return response;
        })
      );
  }

  register(data: RegisterData): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/register`, data)
      .pipe(
        map(response => {
          localStorage.setItem('access_token', response.token);
          localStorage.setItem('user', JSON.stringify(response.user));
          this.currentUserSubject.next(response.user);
          return response;
        })
      );
  }

  logout(): Observable<any> {
    // Always clear local auth state first so navigation always works,
    // even if the API is unreachable or the token is already expired.
    const clearLocalState = () => {
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      localStorage.removeItem('barber_profile');
      this.currentUserSubject.next(null);
    };

    return this.http.post(`${this.apiUrl}/auth/logout`, {}).pipe(
      map(() => { clearLocalState(); }),
      catchError(() => {
        // API may be offline or token already revoked — still log out locally.
        clearLocalState();
        return of(null);
      })
    );
  }

  getCurrentUser(): Observable<any> {
    return this.http.get(`${this.apiUrl}/auth/me`);
  }

  get isLoggedIn(): boolean {
    return !!localStorage.getItem('access_token');
  }

  get currentUserValue(): any {
    return this.currentUserSubject.value;
  }

  get token(): string | null {
    return localStorage.getItem('access_token');
  }

  get isOwner(): boolean {
    const profile = localStorage.getItem('barber_profile');
    if (!profile) return false;
    try { return JSON.parse(profile).is_owner === true; } catch { return false; }
  }

  get barberProfile(): any {
    const profile = localStorage.getItem('barber_profile');
    if (!profile) return null;
    try { return JSON.parse(profile); } catch { return null; }
  }
}
