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
      error: (err: any) => {
        const body = err.error;
        const code = body?.error;

        // Classify the error type for styled alert display
        this.errorType = (code === 'subscription_expired' || code === 'account_deactivated')
          ? code
          : 'generic';

        // Extract the most specific message available
        if (body?.message) {
          this.error = body.message;
        } else if (body?.errors) {
          // Laravel validation errors — flatten first field's message
          const firstKey = Object.keys(body.errors)[0];
          this.error = body.errors[firstKey]?.[0] || 'Validation error. Please check your inputs.';
        } else if (err.status === 0) {
          this.error = 'Cannot reach the server. Please check your internet connection.';
        } else if (err.status === 429) {
          this.error = 'Too many attempts. Please wait a moment before trying again.';
        } else if (err.status === 500) {
          this.error = 'A server error occurred. Please try again later.';
        } else {
          this.error = 'Login failed. Please check your email and password.';
        }

        this.loading = false;
      }
    });
  }

  get f() {
    return this.loginForm.controls;
  }
}
