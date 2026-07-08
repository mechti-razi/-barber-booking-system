import { Component, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

declare const Chart: any;

@Component({
  selector: 'app-barber-revenue',
  templateUrl: './barber-revenue.component.html',
  styleUrls: ['./barber-revenue.component.css']
})
export class BarberRevenueComponent implements OnInit, AfterViewInit, OnDestroy {

  loading = true;
  apiUrl = environment.apiUrl;

  kpis = { today: 0, week: 0, month: 0, all_time: 0, rating: 0 };
  monthlyRevenue: { label: string; revenue: number }[] = [];
  serviceBreakdown: { [key: string]: { count: number; revenue: number } } = {};
  topClients: { name: string; visits: number; spent: number }[] = [];
  statusSummary: { [key: string]: number } = {};

  errorMessage = '';

  private charts: any[] = [];

  // Service colors palette
  serviceColors = ['#f59e0b','#ef4444','#8b5cf6','#06b6d4','#10b981','#f97316','#ec4899'];

  constructor(private http: HttpClient) {}

  /** Returns true when the page is in light mode */
  private get isLight(): boolean {
    return document.documentElement.getAttribute('data-theme') === 'light';
  }

  /** Theme-aware color tokens */
  private get theme() {
    const light = this.isLight;
    return {
      cardBg:       light ? '#ffffff'           : '#1e2130',
      titleColor:   light ? '#b8860b'           : '#f59e0b',
      bodyColor:    light ? '#4a4a6a'           : '#d1d5db',
      borderColor:  light ? 'rgba(0,0,0,0.12)'  : '#374151',
      gridColor:    light ? 'rgba(0,0,0,0.07)'  : 'rgba(255,255,255,0.05)',
      tickColor:    light ? '#4a4a6a'           : '#9ca3af',
      legendColor:  light ? '#1a1a2e'           : '#d1d5db',
      segmentBorder: light ? '#f4f4f8'          : '#1a1d2e',
    };
  }

  ngOnInit(): void {
    this.http.get<any>(`${this.apiUrl}/barber-panel/revenue`).subscribe({
      next: (data) => {
        this.kpis            = data.kpis;
        this.monthlyRevenue  = data.monthly_revenue;
        this.serviceBreakdown = data.service_breakdown;
        this.topClients      = data.top_clients;
        this.statusSummary   = data.status_summary;
        this.loading = false;
        setTimeout(() => this.initCharts(), 100);
      },
      error: (err) => {
        this.errorMessage = err?.error?.message || 'Failed to load revenue data from the server.';
        this.loading = false;
      }
    });
  }

  ngAfterViewInit(): void {}

  ngOnDestroy(): void {
    this.charts.forEach(c => c?.destroy());
  }

  private initCharts(): void {
    this.initRevenueChart();
    this.initServiceChart();
    this.initStatusChart();
  }

  private initRevenueChart(): void {
    const ctx = document.getElementById('revenueChart') as HTMLCanvasElement;
    if (!ctx) return;
    const t = this.theme;
    const chart = new Chart(ctx, {
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
            callbacks: { label: (ctx: any) => ` ${ctx.parsed.y.toLocaleString()} DT` }
          }
        },
        scales: {
          x: { grid: { color: t.gridColor }, ticks: { color: t.tickColor } },
          y: { grid: { color: t.gridColor }, ticks: { color: t.tickColor, callback: (v: any) => v + ' DT' } }
        }
      }
    });
    this.charts.push(chart);
  }

  private initServiceChart(): void {
    const ctx = document.getElementById('serviceChart') as HTMLCanvasElement;
    if (!ctx) return;
    const t = this.theme;
    const labels  = Object.keys(this.serviceBreakdown);
    const values  = labels.map(k => this.serviceBreakdown[k].revenue);
    const chart = new Chart(ctx, {
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
          legend: {
            position: 'right',
            labels: { color: t.legendColor, padding: 16, font: { size: 12 } }
          },
          tooltip: {
            backgroundColor: t.cardBg,
            titleColor: t.titleColor,
            bodyColor: t.bodyColor,
            borderColor: t.borderColor,
            borderWidth: 1,
            callbacks: { label: (ctx: any) => ` ${ctx.parsed.toLocaleString()} DT` }
          }
        }
      }
    });
    this.charts.push(chart);
  }

  private initStatusChart(): void {
    const ctx = document.getElementById('statusChart') as HTMLCanvasElement;
    if (!ctx) return;
    const t = this.theme;
    const labels = Object.keys(this.statusSummary);
    const values = labels.map(k => this.statusSummary[k]);
    const colors: Record<string,string> = {
      completed: '#10b981', confirmed: '#3b82f6', pending: '#f59e0b',
      cancelled: '#ef4444', no_show: '#6b7280'
    };
    const chart = new Chart(ctx, {
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
          legend: {
            position: 'bottom',
            labels: { color: t.legendColor, padding: 12, font: { size: 12 } }
          },
          tooltip: {
            backgroundColor: t.cardBg,
            titleColor: t.titleColor,
            bodyColor: t.bodyColor,
            borderColor: t.borderColor,
            borderWidth: 1,
          }
        }
      }
    });
    this.charts.push(chart);
  }

  getServiceKeys(): string[] { return Object.keys(this.serviceBreakdown); }
  getStatusKeys(): string[]  { return Object.keys(this.statusSummary); }

  getStatusColor(s: string): string {
    const m: Record<string,string> = {
      completed:'#10b981', confirmed:'#3b82f6', pending:'#f59e0b', cancelled:'#ef4444', no_show:'#6b7280'
    };
    return m[s] || '#6b7280';
  }

  totalAppointments(): number {
    return Object.values(this.statusSummary).reduce((a, b) => a + b, 0);
  }
}
