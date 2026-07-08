import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

interface Service {
  id: number;
  name: string;
  description: string;
  price: number;
  duration_minutes: number;
  is_active: boolean;
  category: string;
}

@Component({
  selector: 'app-barber-services',
  templateUrl: './barber-services.component.html',
  styleUrls: ['./barber-services.component.css']
})
export class BarberServicesComponent implements OnInit {

  loading = true;
  submitting = false;
  apiUrl = environment.apiUrl;

  services: Service[] = [];
  modalOpen = false;
  editingService: Service | null = null;
  deleteConfirmId: number | null = null;

  categories = ['Haircut', 'Beard', 'Shave', 'Color', 'Treatment', 'Package', 'Kids', 'Other'];

  newService = {
    name: '',
    description: '',
    price: 0,
    duration_minutes: 30,
    category: 'Haircut',
    is_active: true
  };

  successMessage = '';
  errorMessage = '';

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadServices();
  }

  loadServices(): void {
    this.loading = true;
    this.errorMessage = '';
    this.http.get<any>(`${this.apiUrl}/barber-panel/services`).subscribe({
      next: (res) => {
        // Map base_price -> price so frontend interface stays consistent
        const raw = res.data || res;
        this.services = (Array.isArray(raw) ? raw : []).map((s: any) => ({
          ...s,
          price: s.base_price ?? s.price ?? 0
        }));
        this.loading = false;
      },
      error: (err) => {
        this.errorMessage = err?.error?.message || 'Failed to load services from the server.';
        this.services = [];
        this.loading = false;
      }
    });
  }

  get activeCount(): number { return this.services.filter(s => s.is_active).length; }
  get totalCount(): number { return this.services.length; }

  openAddModal(): void {
    this.editingService = null;
    this.newService = { name: '', description: '', price: 0, duration_minutes: 30, category: 'Haircut', is_active: true };
    this.successMessage = '';
    this.errorMessage = '';
    this.modalOpen = true;
  }

  openEditModal(service: Service): void {
    this.editingService = service;
    this.newService = {
      name: service.name,
      description: service.description,
      price: service.price,
      duration_minutes: service.duration_minutes,
      category: service.category,
      is_active: service.is_active
    };
    this.successMessage = '';
    this.errorMessage = '';
    this.modalOpen = true;
  }

  closeModal(): void {
    this.modalOpen = false;
    this.editingService = null;
  }

  saveService(): void {
    if (!this.newService.name.trim()) { this.errorMessage = 'Service name is required.'; return; }
    if (this.newService.price < 0) { this.errorMessage = 'Price must be a positive number.'; return; }
    if (this.newService.duration_minutes < 5) { this.errorMessage = 'Duration must be at least 5 minutes.'; return; }

    this.submitting = true;
    this.errorMessage = '';

    if (this.editingService) {
      // Update existing
      this.http.put<any>(`${this.apiUrl}/barber-panel/services/${this.editingService.id}`, {
          ...this.newService,
          base_price: this.newService.price
        }).subscribe({
        next: (res) => {
          const idx = this.services.findIndex(s => s.id === this.editingService!.id);
          if (idx !== -1) this.services[idx] = { ...this.services[idx], ...this.newService };
          this.submitting = false;
          this.successMessage = 'Service updated successfully!';
          setTimeout(() => this.closeModal(), 1200);
        },
        error: (err) => {
          this.submitting = false;
          this.errorMessage = err?.error?.message || 'Failed to update service. Please try again.';
        }
      });
    } else {
      // Create new
      this.http.post<any>(`${this.apiUrl}/barber-panel/services`, {
          ...this.newService,
          base_price: this.newService.price
        }).subscribe({
        next: (res) => {
          const svc = res.service || res;
          this.services.push({ ...svc, price: svc.base_price ?? svc.price ?? this.newService.price });
          this.submitting = false;
          this.successMessage = 'Service added successfully!';
          setTimeout(() => this.closeModal(), 1200);
        },
        error: (err) => {
          this.submitting = false;
          this.errorMessage = err?.error?.message || 'Failed to add service. Please try again.';
        }
      });
    }
  }

  toggleActive(service: Service): void {
    this.errorMessage = '';
    this.http.patch<any>(`${this.apiUrl}/barber-panel/services/${service.id}/toggle`, {}).subscribe({
      next: (res) => { service.is_active = res.is_active ?? !service.is_active; },
      error: (err) => {
        this.errorMessage = err?.error?.message || 'Failed to toggle service status.';
        setTimeout(() => this.errorMessage = '', 4000);
      }
    });
  }

  confirmDelete(id: number): void {
    this.deleteConfirmId = id;
  }

  cancelDelete(): void {
    this.deleteConfirmId = null;
  }

  deleteService(): void {
    if (this.deleteConfirmId === null) return;
    const id = this.deleteConfirmId;
    this.errorMessage = '';

    this.http.delete(`${this.apiUrl}/barber-panel/services/${id}`).subscribe({
      next: () => { this.services = this.services.filter(s => s.id !== id); },
      error: (err) => {
        this.errorMessage = err?.error?.message || 'Failed to delete service.';
        setTimeout(() => this.errorMessage = '', 4000);
      }
    });
    this.deleteConfirmId = null;
  }

  formatDuration(min: number): string {
    if (min < 60) return `${min} min`;
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m ? `${h}h ${m}min` : `${h}h`;
  }
}
