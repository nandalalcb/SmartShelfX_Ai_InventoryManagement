import { Component, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Chart, registerables } from 'chart.js';
import { ApiService } from '../../../services/api.service';

Chart.register(...registerables);

@Component({
  selector: 'app-forecast-view',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatSnackBarModule, MatProgressSpinnerModule],
  template: `
    <div class="page-container fade-in">
      <div class="page-header">
        <div><h1 class="page-title">AI Demand Forecasting</h1><p class="page-subtitle">ML-powered predictions for inventory optimization</p></div>
        <button mat-raised-button color="primary" (click)="runBatch()" [disabled]="batchLoading">
          <mat-icon>psychology</mat-icon> Run Batch Forecast
        </button>
      </div>
      <div *ngIf="loading" style="text-align:center;padding:60px"><mat-spinner diameter="40"></mat-spinner></div>
      <div *ngIf="!loading">
        <!-- Chart Section -->
        <div class="chart-section" *ngIf="forecasts.length > 0">
          <div class="chart-card" style="margin-bottom:24px">
            <div class="chart-title">Demand Forecast vs Current Stock</div>
            <div class="chart-wrapper">
              <canvas #forecastChart></canvas>
            </div>
          </div>
        </div>

        <!-- Table Section -->
        <div class="forecast-table-container">
          <table class="forecast-table">
            <thead><tr><th>SKU</th><th>Product</th><th>Category</th><th>Current Stock</th><th>Reorder Level</th><th>Forecast Demand (7d)</th><th>Risk Level</th><th>Suggested Reorder</th><th>Action</th></tr></thead>
            <tbody>
              <tr *ngFor="let f of forecasts">
                <td><code>{{f.product?.sku}}</code></td>
                <td>{{f.product?.name}}</td>
                <td>{{f.product?.category || '-'}}</td>
                <td>{{f.product?.current_stock}}</td>
                <td>{{f.product?.reorder_level}}</td>
                <td style="font-weight:600">{{f.predicted_demand | number:'1.0-0'}}</td>
                <td><span class="badge" [ngClass]="'badge-'+f.risk_level.toLowerCase()">{{f.risk_level}}</span></td>
                <td>{{f.suggested_reorder > 0 ? f.suggested_reorder + ' units' : '-'}}</td>
                <td>{{getAction(f)}}</td>
              </tr>
              <tr *ngIf="forecasts.length===0"><td colspan="9" style="text-align:center;padding:40px;color:var(--text-muted)">No forecasts yet. Click "Run Batch Forecast" to generate predictions.</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .chart-section { margin-bottom: 24px; }
    .chart-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius); padding: 24px; box-shadow: var(--shadow); }
    .chart-title { font-size: 16px; font-weight: 600; color: var(--text-primary); margin-bottom: 16px; }
    .chart-wrapper { position: relative; height: 350px; width: 100%; }
    .forecast-table-container { overflow-x:auto; background:var(--bg-card); border:1px solid var(--border); border-radius:var(--radius); }
    .forecast-table { width:100%; border-collapse:collapse; }
    .forecast-table th { text-align:left; padding:12px 16px; font-size:12px; text-transform:uppercase; color:var(--text-secondary); border-bottom:1px solid var(--border); font-weight:600; letter-spacing:0.05em; }
    .forecast-table td { padding:12px 16px; border-bottom:1px solid var(--border); font-size:14px; }
    .forecast-table tr:hover { background:var(--bg-hover); }
    code { background:var(--bg-hover); padding:2px 8px; border-radius:4px; font-size:13px; }
  `],
})
export class ForecastViewComponent implements OnInit {
  @ViewChild('forecastChart') chartRef!: ElementRef<HTMLCanvasElement>;
  forecasts: any[] = [];
  loading = true;
  batchLoading = false;
  private chart: Chart | null = null;

  constructor(private api: ApiService, private snackBar: MatSnackBar) { }

  ngOnInit() { this.load(); }

  load() {
    this.loading = true;
    this.api.getAllForecasts().subscribe({
      next: d => {
        this.forecasts = d || [];
        this.loading = false;
        setTimeout(() => this.buildChart(), 100);
      },
      error: () => this.loading = false
    });
  }

  buildChart() {
    if (!this.chartRef || this.forecasts.length === 0) return;
    if (this.chart) this.chart.destroy();

    const labels = this.forecasts.map(f => f.product?.name || f.product?.sku || 'N/A');
    const currentStock = this.forecasts.map(f => f.product?.current_stock || 0);
    const predictedDemand = this.forecasts.map(f => f.predicted_demand || 0);
    const reorderLevel = this.forecasts.map(f => f.product?.reorder_level || 0);

    this.chart = new Chart(this.chartRef.nativeElement, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Current Stock',
            data: currentStock,
            backgroundColor: 'rgba(99, 102, 241, 0.7)',
            borderColor: '#6366f1',
            borderWidth: 1,
            borderRadius: 4,
          },
          {
            label: 'Predicted Demand (7d)',
            data: predictedDemand,
            backgroundColor: 'rgba(6, 182, 212, 0.7)',
            borderColor: '#06b6d4',
            borderWidth: 1,
            borderRadius: 4,
          },
          {
            label: 'Reorder Level',
            data: reorderLevel,
            type: 'line',
            borderColor: '#ef4444',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            borderWidth: 2,
            borderDash: [6, 3],
            pointRadius: 3,
            fill: false,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: { color: '#94a3b8', font: { family: 'Inter', size: 12 } },
          },
          tooltip: {
            backgroundColor: '#1e293b',
            titleColor: '#f1f5f9',
            bodyColor: '#94a3b8',
            borderColor: '#334155',
            borderWidth: 1,
            cornerRadius: 8,
          },
        },
        scales: {
          x: {
            ticks: { color: '#94a3b8', font: { size: 11 }, maxRotation: 45 },
            grid: { color: 'rgba(51, 65, 85, 0.3)' },
          },
          y: {
            ticks: { color: '#94a3b8', font: { size: 11 } },
            grid: { color: 'rgba(51, 65, 85, 0.3)' },
            beginAtZero: true,
          },
        },
      },
    });
  }

  runBatch() {
    this.batchLoading = true;
    this.api.runBatchForecast().subscribe({
      next: r => {
        this.snackBar.open(`Forecasted ${r.results?.length} products`, 'Close', { duration: 5000 });
        this.batchLoading = false;
        this.load();
      },
      error: e => {
        this.snackBar.open(e.error?.error || 'Forecast failed', 'Close', { duration: 3000 });
        this.batchLoading = false;
      }
    });
  }

  getAction(f: any): string {
    if (f.risk_level === 'CRITICAL') return 'Urgent reorder needed';
    if (f.risk_level === 'HIGH') return 'Reorder soon';
    if (f.risk_level === 'MEDIUM') return 'Monitor stock';
    return 'Stock adequate';
  }
}
