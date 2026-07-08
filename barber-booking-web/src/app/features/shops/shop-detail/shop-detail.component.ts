import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ShopService } from '../../../core/services/shop.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-shop-detail',
  templateUrl: './shop-detail.component.html',
  styleUrls: ['./shop-detail.component.css']
})
export class ShopDetailComponent implements OnInit {
  shop: any;
  loading = true;
  error = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private shopService: ShopService,
    public authService: AuthService
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadShop(+id);
    }
  }

  loadShop(id: number): void {
    this.loading = true;
    this.shopService.getShop(id).subscribe({
      next: (data) => {
        this.shop = data;
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to load shop details';
        this.loading = false;
      }
    });
  }

  bookAppointment(barberId: number, serviceId: number): void {
    if (!this.authService.isLoggedIn) {
      this.router.navigate(['/auth/login'], { queryParams: { returnUrl: this.router.url } });
      return;
    }
    this.router.navigate(['/appointments/new'], {
      queryParams: {
        shop_id: this.shop.id,
        barber_id: barberId,
        service_id: serviceId
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/shops']);
  }
}
