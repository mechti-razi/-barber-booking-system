import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;
  loading = false;
  error = '';
  errorType: 'generic' | 'subscription_expired' | 'account_deactivated' = 'generic';
  submitted = false;
  showPassword = false;
  returnUrl: string;

  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private authService: AuthService
  ) {
    this.loginForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required]
    });
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/home';
  }

  ngOnInit(): void {}

  onSubmit(): void {
    this.submitted = true;
    if (this.loginForm.invalid) {
      return;
    }

    this.loading = true;
    this.authService.login(this.loginForm.value).subscribe({
      next: (response: any) => {
        const user = response.user || this.authService.currentUserValue;
        // Role-based redirect: barbers → /barber, admins → /admin, others → returnUrl
        if (user?.role === 'barber') {
          this.router.navigate(['/barber']);
        } else if (user?.role === 'admin') {
          this.router.navigate(['/admin']);
        } else {
          this.router.navigate([this.returnUrl]);
        }
      },
      error: (error: any) => {
        const code = error.error?.error;
        this.errorType = (code === 'subscription_expired' || code === 'account_deactivated')
          ? code
          : 'generic';
        this.error = error.error?.message || 'Login failed';
        this.loading = false;
      }
    });
  }

  get f() {
    return this.loginForm.controls;
  }
}
