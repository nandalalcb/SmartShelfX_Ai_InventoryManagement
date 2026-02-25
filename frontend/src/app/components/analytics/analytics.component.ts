import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule, MatSnackBarModule],
  template: `
    <div class="page-container fade-in">
      <div class="page-header">
        <div><h1 class="page-title">Analytics</h1><p class="page-subtitle">Inventory trends and reports</p></div>
        <div style="display:flex;gap:8px">
          <button mat-stroked-button (click)="exportExcel()"><mat-icon>table_chart</mat-icon> Export Excel</button>
          <button mat-stroked-button (click)="exportPDF()"><mat-icon>picture_as_pdf</mat-icon> Export PDF</button>
        </div>
      </div>
      <div *ngIf="loading" style="text-align:center;padding:60px"><mat-spinner diameter="40"></mat-spinner></div>
      <div *ngIf="!loading">
        <div class="cards-grid">
          <div class="chart-card">
            <div class="chart-title">Inventory Trend (Last 30 Days)</div>
            <div class="chart-placeholder">
              <table class="mini-table">
                <thead><tr><th>Date</th><th>Stock In</th><th>Stock Out</th><th>Net</th></tr></thead>
                <tbody><tr *ngFor="let t of trend.slice(0,15)"><td>{{t.date}}</td><td style="color:var(--success)">+{{t.stock_in}}</td><td style="color:var(--danger)">-{{t.stock_out}}</td><td [style.color]="t.stock_in-t.stock_out>=0?'var(--success)':'var(--danger)'">{{t.stock_in-t.stock_out}}</td></tr></tbody>
              </table>
            </div>
          </div>
          <div class="chart-card">
            <div class="chart-title">Monthly Sales vs Purchases</div>
            <div class="chart-placeholder">
              <table class="mini-table">
                <thead><tr><th>Month</th><th>Purchases (IN)</th><th>Sales (OUT)</th></tr></thead>
                <tbody><tr *ngFor="let s of salesData"><td>{{s.month}}</td><td style="color:var(--primary)">{{s.purchases}}</td><td style="color:var(--accent)">{{s.sales}}</td></tr></tbody>
              </table>
            </div>
          </div>
          <div class="chart-card">
            <div class="chart-title">Top Restocked Items</div>
            <div class="chart-placeholder">
              <table class="mini-table">
                <thead><tr><th>Product</th><th>SKU</th><th>Total Ordered</th><th>Order Count</th></tr></thead>
                <tbody><tr *ngFor="let i of topItems"><td>{{i.product?.name}}</td><td><code>{{i.product?.sku}}</code></td><td style="font-weight:600">{{i.total_ordered}}</td><td>{{i.order_count}}</td></tr></tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .mini-table { width:100%; border-collapse:collapse; font-size:13px; }
    .mini-table th { text-align:left; padding:8px 12px; font-size:11px; text-transform:uppercase; color:var(--text-secondary); border-bottom:1px solid var(--border); }
    .mini-table td { padding:8px 12px; border-bottom:1px solid var(--border); }
    .mini-table tr:hover { background:var(--bg-hover); }
    code { background:var(--bg-hover); padding:2px 6px; border-radius:4px; font-size:12px; }
  `],
})
export class AnalyticsComponent implements OnInit {
  trend: any[] = []; salesData: any[] = []; topItems: any[] = []; loading = true;
  constructor(private api: ApiService, private snackBar: MatSnackBar) { }
  ngOnInit() { this.load(); }
  load() {
    this.loading = true;
    let done = 0;
    const check = () => { done++; if (done >= 3) this.loading = false; };
    this.api.getInventoryTrend(30).subscribe({ next: d => { this.trend = d; check(); }, error: check });
    this.api.getSalesVsPurchases(6).subscribe({ next: d => { this.salesData = d; check(); }, error: check });
    this.api.getTopRestocked(10).subscribe({ next: d => { this.topItems = d; check(); }, error: check });
  }
  exportExcel() {
    this.api.exportExcel().subscribe({
      next: blob => { const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'inventory_report.xlsx'; a.click(); URL.revokeObjectURL(url); },
      error: () => this.snackBar.open('Export failed', 'Close', { duration: 3000 })
    });
  }
  exportPDF() {
    this.api.exportPDF().subscribe({
      next: blob => { const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'inventory_report.pdf'; a.click(); URL.revokeObjectURL(url); },
      error: () => this.snackBar.open('Export failed', 'Close', { duration: 3000 })
    });
  }
}
