import { Component, OnInit } from '@angular/core';
import { ShopService } from '../../../core/services/shop.service';

@Component({
  selector: 'app-shop-list',
  templateUrl: './shop-list.component.html',
  styleUrls: ['./shop-list.component.css']
})
export class ShopListComponent implements OnInit {
  shops: any[] = [];
  filteredShops: any[] = [];
  searchQuery = '';
  loading = true;
  error = '';

  constructor(private shopService: ShopService) {}

  ngOnInit(): void {
    this.loadShops();
  }

  loadShops(): void {
    this.loading = true;
    this.shopService.getShops().subscribe({
      next: (data) => {
        this.shops = data;
        this.filteredShops = data;
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to load shops. Please try again.';
        this.loading = false;
      }
    });
  }

  onSearch(): void {
    const q = this.searchQuery.toLowerCase().trim();
    if (!q) {
      this.filteredShops = this.shops;
      return;
    }
    this.filteredShops = this.shops.filter(s =>
      s.name?.toLowerCase().includes(q) ||
      s.address?.toLowerCase().includes(q)
    );
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.filteredShops = this.shops;
  }
}
