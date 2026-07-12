import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent implements OnInit {
  registerForm: FormGroup;
  loading = false;
  error = '';
  showPassword = false;
  showConfirm = false;

  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
    private authService: AuthService
  ) {
    this.registerForm = this.formBuilder.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      password_confirmation: ['', Validators.required],
      phone: [''],
      role: ['client']
    }, { validator: this.passwordMatchValidator });
  }

  ngOnInit(): void {}

  passwordMatchValidator(formGroup: FormGroup): any {
    const password = formGroup.get('password');
    const confirmPassword = formGroup.get('password_confirmation');
    
    if (password?.value !== confirmPassword?.value) {
      confirmPassword?.setErrors({ passwordMismatch: true });
    } else {
      confirmPassword?.setErrors(null);
    }
  }

  onSubmit(): void {
    if (this.registerForm.invalid) {
      return;
    }

    this.loading = true;
    this.authService.register(this.registerForm.value).subscribe({
      next: () => {
        this.router.navigate(['/home']);
      },
      error: (error: any) => {
        if (error.error?.errors) {
          const errs = error.error.errors;
          this.error = Object.keys(errs)
            .map(key => errs[key].join(', '))
            .join(' | ');
        } else {
          this.error = error.error?.message || 'Registration failed';
        }
        this.loading = false;
      }
    });
  }

  get f() {
    return this.registerForm.controls;
  }

  loginWithGoogle(): void {
    // TODO: Implement Google OAuth
    console.log('Google login clicked');
    // This will require setting up Google OAuth in the backend
    // and using Angular Social Login or similar library
  }

  loginWithFacebook(): void {
    // TODO: Implement Facebook OAuth
    console.log('Facebook login clicked');
    // This will require setting up Facebook OAuth in the backend
    // and using Angular Social Login or similar library
  }
}
