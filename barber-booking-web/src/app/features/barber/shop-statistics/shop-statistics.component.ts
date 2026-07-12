import { Component, OnInit, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

declare const Chart: any;

interface TodayAppointment {
  time: string;
  client_name: string;
  service_name: string;
  status: string;
}

interface StaffStat {
  id: number;
  name: string;
  specialization: string;
  rating: number;
  is_active: boolean;
  is_owner: boolean;
  revenue: { today: number; week: number; month: number; all_time: number };
  appointments: {
    total: number;
    completed: number;
    pending: number;
    cancelled: number;
    today_total: number;
    today_done: number;
    today_pending: number;
  };
  today_schedule: TodayAppointment[];
}

@Component({
  selector: 'app-shop-statistics',
  templateUrl: './shop-statistics.component.html',
  styleUrls: ['./shop-statistics.component.css']
})
export class ShopStatisticsComponent implements OnInit, OnDestroy {

  loading = true;
  errorMessage = '';
  apiUrl = environment.apiUrl;

  kpis = { today: 0, week: 0, month: 0, all_time: 0, total_staff: 0, active_staff: 0, today_total_appointments: 0 };
  monthlyRevenue: { label: string; revenue: number }[] = [];
  statusSummary: { [key: string]: number } = {};
  staffStats: StaffStat[] = [];
  serviceBreakdown: { [key: string]: { count: number; revenue: number } } = {};
  topClients: { name: string; visits: number; spent: number }[] = [];

  // Which revenue period to show in the staff leaderboard
  activePeriod: 'today' | 'week' | 'month' | 'all_time' = 'month';

  // Track which staff card is expanded to show today's schedule
  expandedStaffId: number | null = null;

  serviceColors = ['#f59e0b','#ef4444','#8b5cf6','#06b6d4','#10b981','#f97316','#ec4899'];

  private charts: any[] = [];

  constructor(private http: HttpClient) {}

  private get isLight(): boolean {
    return document.documentElement.getAttribute('data-theme') === 'light';
  }

  private get theme() {
    const light = this.isLight;
    return {
      cardBg:        light ? '#ffffff'          : '#1e2130',
      titleColor:    light ? '#b8860b'          : '#f59e0b',
      bodyColor:     light ? '#4a4a6a'          : '#d1d5db',
      borderColor:   light ? 'rgba(0,0,0,0.12)' : '#374151',
      gridColor:     light ? 'rgba(0,0,0,0.07)' : 'rgba(255,255,255,0.05)',
      tickColor:     light ? '#4a4a6a'          : '#9ca3af',
      legendColor:   light ? '#1a1a2e'          : '#d1d5db',
      segmentBorder: light ? '#f4f4f8'          : '#1a1d2e',
    };
  }

  ngOnInit(): void {
    this.http.get<any>(`${this.apiUrl}/barber-panel/shop-stats`).subscribe({
      next: (data) => {
        this.kpis             = data.kpis;
        this.monthlyRevenue   = data.monthly_revenue;
        this.statusSummary    = data.status_summary;
        this.staffStats       = data.staff_stats;
        this.serviceBreakdown = data.service_breakdown;
        this.topClients       = data.top_clients;
        this.loading = false;
        setTimeout(() => this.initCharts(), 120);
      },
      error: (err) => {
        this.errorMessage = err?.error?.error || err?.error?.message || 'Failed to load shop statistics.';
        this.loading = false;
      }
    });
  }

  ngOnDestroy(): void {
    this.charts.forEach(c => c?.destroy());
  }

  private destroyCharts(): void {
    this.charts.forEach(c => c?.destroy());
    this.charts = [];
  }

  private initCharts(): void {
    this.destroyCharts();
    this.initRevenueChart();
    this.initServiceChart();
    this.initStatusChart();
  }

  private initRevenueChart(): void {
    const ctx = document.getElementById('shopRevenueChart') as HTMLCanvasElement;
    if (!ctx) return;
    const t = this.theme;
    this.charts.push(new Chart(ctx, {
      type: 'bar',
      data: {
        labels: this.monthlyRevenue.map(m => m.label),
        datasets: [{
          label: 'Revenue (DT)',
          data: this.monthlyRevenue.map(m => m.revenue),
          backgroundColor: 'rgba(245,158,11,0.25)',
          borderColor: '#f59e0b',
          borderWidth: 2,
          borderRadius: 8,
          borderSkipped: false,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: t.cardBg,
            titleColor: t.titleColor,
            bodyColor: t.bodyColor,
            borderColor: t.borderColor,
            borderWidth: 1,
            callbacks: { label: (c: any) => ` ${c.parsed.y.toLocaleString()} DT` }
          }
        },
        scales: {
          x: { grid: { color: t.gridColor }, ticks: { color: t.tickColor } },
          y: { grid: { color: t.gridColor }, ticks: { color: t.tickColor, callback: (v: any) => v + ' DT' } }
        }
      }
    }));
  }

  private initServiceChart(): void {
    const ctx = document.getElementById('shopServiceChart') as HTMLCanvasElement;
    if (!ctx) return;
    const t = this.theme;
    const labels = Object.keys(this.serviceBreakdown);
    const values = labels.map(k => this.serviceBreakdown[k].revenue);
    this.charts.push(new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data: values,
          backgroundColor: this.serviceColors.slice(0, labels.length),
          borderColor: t.segmentBorder,
          borderWidth: 2,
          hoverOffset: 8,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'right', labels: { color: t.legendColor, padding: 14, font: { size: 12 } } },
          tooltip: {
            backgroundColor: t.cardBg, titleColor: t.titleColor, bodyColor: t.bodyColor,
            borderColor: t.borderColor, borderWidth: 1,
            callbacks: { label: (c: any) => ` ${c.parsed.toLocaleString()} DT` }
          }
        }
      }
    }));
  }

  private initStatusChart(): void {
    const ctx = document.getElementById('shopStatusChart') as HTMLCanvasElement;
    if (!ctx) return;
    const t = this.theme;
    const labels = Object.keys(this.statusSummary);
    const values = labels.map(k => this.statusSummary[k]);
    const colors: Record<string, string> = {
      completed: '#10b981', confirmed: '#3b82f6', pending: '#f59e0b',
      cancelled: '#ef4444', no_show: '#6b7280'
    };
    this.charts.push(new Chart(ctx, {
      type: 'pie',
      data: {
        labels,
        datasets: [{
          data: values,
          backgroundColor: labels.map(l => colors[l] || '#6b7280'),
          borderColor: t.segmentBorder,
          borderWidth: 2,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { color: t.legendColor, padding: 12, font: { size: 12 } } },
          tooltip: {
            backgroundColor: t.cardBg, titleColor: t.titleColor, bodyColor: t.bodyColor,
            borderColor: t.borderColor, borderWidth: 1,
          }
        }
      }
    }));
  }

  setPeriod(period: 'today' | 'week' | 'month' | 'all_time'): void {
    this.activePeriod = period;
  }

  getStaffRevenue(staff: StaffStat): number {
    return staff.revenue[this.activePeriod];
  }

  getMaxRevenue(): number {
    const values = this.staffStats.map(s => s.revenue[this.activePeriod]);
    return Math.max(...values, 1);
  }

  getBarWidth(staff: StaffStat): string {
    const pct = (this.getStaffRevenue(staff) / this.getMaxRevenue()) * 100;
    return Math.max(pct, 2) + '%';
  }

  getServiceKeys(): string[] { return Object.keys(this.serviceBreakdown); }
  getStatusKeys():  string[] { return Object.keys(this.statusSummary); }

  getStatusColor(s: string): string {
    const m: Record<string, string> = {
      completed: '#10b981', confirmed: '#3b82f6', pending: '#f59e0b',
      cancelled: '#ef4444', no_show: '#6b7280'
    };
    return m[s] || '#6b7280';
  }

  totalAppointments(): number {
    return Object.values(this.statusSummary).reduce((a, b) => a + b, 0);
  }

  getInitials(name: string): string {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  }

  toggleExpand(staffId: number): void {
    this.expandedStaffId = this.expandedStaffId === staffId ? null : staffId;
  }

  getApptStatusColor(s: string): string {
    const m: Record<string, string> = {
      completed: '#10b981', confirmed: '#3b82f6', pending: '#f59e0b',
      cancelled: '#ef4444', no_show: '#6b7280'
    };
    return m[s] || '#6b7280';
  }

  todayBookingsTotal(): number {
    return this.kpis.today_total_appointments;
  }
}
