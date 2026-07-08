import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({ providedIn: 'root' })
export class OwnerGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(): boolean {
    if (this.authService.isOwner) return true;
    // Employees are redirected to dashboard (their revenue page)
    this.router.navigate(['/barber/dashboard']);
    return false;
  }
}
