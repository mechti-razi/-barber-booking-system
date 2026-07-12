import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-barber-profile',
  templateUrl: './barber-profile.component.html',
  styleUrls: ['./barber-profile.component.css']
})
export class BarberProfileComponent implements OnInit {

  loading = true;
  saving = false;
  savingShop = false;
  uploadingLogo = false;
  apiUrl = environment.apiUrl;

  currentUser: any = null;

  get isOwner(): boolean {
    return this.authService.isOwner;
  }

  profile = {
    name: '',
    email: '',
    phone: '',
    specialization: '',
    experience_years: 0,
    bio: '',
    rating: 0,
    shop_name: ''
  };

  shop = {
    name: '',
    description: '',
    logo_url: '',
    phone: '',
    email: '',
    address: '',
    status: ''
  };

  /** Local object-URL preview of a freshly selected image (before upload) */
  logoPreviewUrl: string | null = null;
  /** File staged for upload (uploaded immediately on select) */
  pendingLogoFile: File | null = null;

  passwordForm = {
    current_password: '',
    new_password: '',
    new_password_confirmation: ''
  };

  successMessage = '';
  errorMessage = '';
  shopSuccessMessage = '';
  shopErrorMessage = '';
  pwSuccessMessage = '';
  pwErrorMessage = '';

  savingPassword = false;
  activeTab: 'profile' | 'shop' | 'password' = 'profile';

  specializations = [
    'Haircut & Styling', 'Beard Grooming', 'Shave & Facial',
    'Hair Coloring', 'Kids Haircut', 'Full Service', 'General Grooming'
  ];

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.currentUserValue;
    this.loadProfile();
    if (this.isOwner) {
      this.loadShop();
    }
  }

  // ─── Profile ───────────────────────────────────────────────────────────────

  loadProfile(): void {
    this.loading = true;
    this.errorMessage = '';
    this.http.get<any>(`${this.apiUrl}/barber-panel/profile`).subscribe({
      next: (res) => {
        this.profile = {
          name:             res.name              || this.currentUser?.name || '',
          email:            res.email             || this.currentUser?.email || '',
          phone:            res.phone             || '',
          specialization:   res.specialization    || '',
          experience_years: res.experience_years  || 0,
          bio:              res.bio               || '',
          rating:           res.rating            || 0,
          shop_name:        res.shop?.name        || ''
        };
        this.loading = false;
      },
      error: (err) => {
        this.errorMessage = err?.error?.message || 'Failed to load profile from the server.';
        this.loading = false;
      }
    });
  }

  saveProfile(): void {
    if (!this.profile.name.trim()) {
      this.errorMessage = 'Name is required.';
      return;
    }
    this.saving = true;
    this.successMessage = '';
    this.errorMessage = '';

    this.http.put<any>(`${this.apiUrl}/barber-panel/profile`, this.profile).subscribe({
      next: () => {
        const updated = { ...this.currentUser, ...this.profile };
        localStorage.setItem('user', JSON.stringify(updated));
        this.saving = false;
        this.successMessage = 'Profile updated successfully!';
        setTimeout(() => this.successMessage = '', 4000);
      },
      error: (err) => {
        this.saving = false;
        this.errorMessage = err?.error?.message || 'Failed to update profile. Please try again.';
        setTimeout(() => this.errorMessage = '', 4000);
      }
    });
  }

  // ─── Shop ──────────────────────────────────────────────────────────────────

  loadShop(): void {
    this.http.get<any>(`${this.apiUrl}/barber-panel/shop`).subscribe({
      next: (res) => {
        this.shop = {
          name:        res.name        || '',
          description: res.description || '',
          logo_url:    res.logo_url    || '',
          phone:       res.phone       || '',
          email:       res.email       || '',
          address:     res.address     || '',
          status:      res.status      || ''
        };
      },
      error: () => { /* non-critical */ }
    });
  }

  /** Called when barber taps the photo area */
  triggerLogoUpload(): void {
    const input = document.getElementById('shop-logo-input') as HTMLInputElement;
    if (input) {
      input.value = ''; // reset so same file can be re-selected
      input.click();
    }
  }

  /** File selected from gallery / camera */
  onLogoFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file  = input.files?.[0];
    if (!file) return;

    // Validate size (max 5 MB)
    if (file.size > 5 * 1024 * 1024) {
      this.shopErrorMessage = 'Image must be smaller than 5 MB.';
      setTimeout(() => this.shopErrorMessage = '', 4000);
      return;
    }

    // Show local preview immediately
    if (this.logoPreviewUrl) URL.revokeObjectURL(this.logoPreviewUrl);
    this.logoPreviewUrl = URL.createObjectURL(file);
    this.pendingLogoFile = file;

    // Upload immediately
    this.uploadLogo(file);
  }

  /** Upload image to server right after selection */
  private uploadLogo(file: File): void {
    this.uploadingLogo = true;
    this.shopErrorMessage = '';

    const fd = new FormData();
    fd.append('logo', file);

    this.http.post<any>(`${this.apiUrl}/barber-panel/shop/logo`, fd).subscribe({
      next: (res) => {
        this.uploadingLogo = false;
        this.shop.logo_url = res.logo_url;
        this.shopSuccessMessage = 'Photo updated!';
        setTimeout(() => this.shopSuccessMessage = '', 3000);
      },
      error: (err) => {
        this.uploadingLogo = false;
        this.logoPreviewUrl = null;
        this.pendingLogoFile = null;
        this.shopErrorMessage = err?.error?.message || 'Upload failed. Please try again.';
        setTimeout(() => this.shopErrorMessage = '', 4000);
      }
    });
  }

  removeShopPhoto(): void {
    if (this.logoPreviewUrl) URL.revokeObjectURL(this.logoPreviewUrl);
    this.logoPreviewUrl = null;
    this.pendingLogoFile = null;
    this.shop.logo_url = '';

    // Persist removal
    this.http.put<any>(`${this.apiUrl}/barber-panel/shop`, { logo_url: '' }).subscribe();
  }

  saveShop(): void {
    this.savingShop = true;
    this.shopSuccessMessage = '';
    this.shopErrorMessage = '';

    this.http.put<any>(`${this.apiUrl}/barber-panel/shop`, {
      name:        this.shop.name,
      description: this.shop.description,
      phone:       this.shop.phone,
      email:       this.shop.email,
      address:     this.shop.address
    }).subscribe({
      next: () => {
        this.savingShop = false;
        this.shopSuccessMessage = 'Shop info saved!';
        setTimeout(() => this.shopSuccessMessage = '', 4000);
      },
      error: (err) => {
        this.savingShop = false;
        this.shopErrorMessage = err?.error?.message || 'Failed to save. Please try again.';
        setTimeout(() => this.shopErrorMessage = '', 4000);
      }
    });
  }

  // ─── Password ──────────────────────────────────────────────────────────────

  changePassword(): void {
    if (!this.passwordForm.current_password || !this.passwordForm.new_password) {
      this.pwErrorMessage = 'Please fill in all password fields.';
      return;
    }
    if (this.passwordForm.new_password !== this.passwordForm.new_password_confirmation) {
      this.pwErrorMessage = 'New passwords do not match.';
      return;
    }
    if (this.passwordForm.new_password.length < 8) {
      this.pwErrorMessage = 'New password must be at least 8 characters.';
      return;
    }

    this.savingPassword = true;
    this.pwErrorMessage = '';
    this.pwSuccessMessage = '';

    this.http.put<any>(`${this.apiUrl}/auth/change-password`, this.passwordForm).subscribe({
      next: () => {
        this.savingPassword = false;
        this.pwSuccessMessage = 'Password changed successfully!';
        this.passwordForm = { current_password: '', new_password: '', new_password_confirmation: '' };
        setTimeout(() => this.pwSuccessMessage = '', 4000);
      },
      error: (err) => {
        this.savingPassword = false;
        this.pwErrorMessage = err?.error?.message || 'Failed to change password. Please try again.';
      }
    });
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  getInitials(name: string): string {
    if (!name) return '?';
    return name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
  }
}
