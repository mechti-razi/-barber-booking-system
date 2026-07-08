import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { AppointmentService } from '../../core/services/appointment.service';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent implements OnInit {
  currentUser: any;
  loading = true;
  loggingOut = false;

  // Stats
  totalBookings  = 0;
  completedCount = 0;
  pendingCount   = 0;
  totalSpent     = 0;

  constructor(
    private authService: AuthService,
    private appointmentService: AppointmentService,
    private router: Router
  ) {}

  ngOnInit(): void {
    if (!this.authService.isLoggedIn) {
      this.router.navigate(['/auth/login']);
      return;
    }
    this.currentUser = this.authService.currentUserValue;
    this.loading = false;
    this.loadStats();
  }

  loadStats(): void {
    this.appointmentService.getMyAppointments().subscribe({
      next: (apps) => {
        this.totalBookings  = apps.length;
        this.completedCount = apps.filter((a: any) => a.status === 'completed').length;
        this.pendingCount   = apps.filter((a: any) =>
          a.status === 'pending' || a.status === 'confirmed').length;
        this.totalSpent     = apps
          .filter((a: any) => a.status === 'completed')
          .reduce((sum: number, a: any) => sum + Number(a.price || a.total_price || 0), 0);
      },
      error: () => {}
    });
  }

  logout(): void {
    this.loggingOut = true;
    this.authService.logout().subscribe({
      next:  () => this.router.navigate(['/auth/login']),
      error: () => { this.loggingOut = false; }
    });
  }

  get initials(): string {
    const name = this.currentUser?.name || '';
    return name.split(' ')
      .map((n: string) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || '?';
  }

  get roleColor(): string {
    const map: Record<string, string> = {
      admin:  '#8b5cf6',
      barber: '#f59e0b',
      client: '#10b981',
    };
    return map[this.currentUser?.role] || '#6b7280';
  }

  get memberSince(): string {
    if (!this.currentUser?.created_at) return '';
    return new Date(this.currentUser.created_at)
      .toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }
}
