import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-reset-password',
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.css']
})
export class ResetPasswordComponent implements OnInit {
  form: FormGroup;
  loading = false;
  submitted = false;
  success = false;
  error = '';
  showPassword = false;
  showConfirm = false;

  private token = '';
  private email = '';

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private auth: AuthService
  ) {
    this.form = this.fb.group({
      password:              ['', [Validators.required, Validators.minLength(8)]],
      password_confirmation: ['', Validators.required]
    }, { validators: this.passwordMatchValidator });
  }

  ngOnInit() {
    this.token = this.route.snapshot.queryParams['token'] || '';
    this.email = this.route.snapshot.queryParams['email'] || '';

    if (!this.token || !this.email) {
      this.error = 'This reset link is invalid. Please request a new one.';
    }
  }

  get f() { return this.form.controls; }

  passwordMatchValidator(group: FormGroup) {
    const pw  = group.get('password')?.value;
    const cpw = group.get('password_confirmation')?.value;
    return pw === cpw ? null : { mismatch: true };
  }

  onSubmit() {
    this.submitted = true;
    this.error = '';
    if (this.form.invalid || !this.token || !this.email) return;

    this.loading = true;
    this.auth.resetPassword({
      token:                 this.token,
      email:                 this.email,
      password:              this.form.value.password,
      password_confirmation: this.form.value.password_confirmation
    }).subscribe({
      next: () => {
        this.loading = false;
        this.success = true;
        setTimeout(() => this.router.navigate(['/auth/login']), 3500);
      },
      error: (err: any) => {
        this.loading = false;
        this.error = err.error?.message || 'Failed to reset password. Please try again.';
      }
    });
  }
}
