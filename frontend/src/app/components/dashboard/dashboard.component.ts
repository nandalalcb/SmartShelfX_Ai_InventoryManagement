import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule, MatButtonModule, MatProgressSpinnerModule, RouterLink],
  template: `
    <div class="page-container fade-in">
      <div class="page-header">
        <div>
          <h1 class="page-title">Dashboard</h1>
          <p class="page-subtitle">Welcome back, {{authService.currentUser?.name}}</p>
        </div>
        <div class="header-actions">
          <button mat-raised-button color="primary" (click)="refreshData()" *ngIf="authService.hasRole('ADMIN', 'MANAGER')">
            <mat-icon>refresh</mat-icon> Refresh
          </button>
        </div>
      </div>

      <div *ngIf="loading" style="text-align: center; padding: 60px;">
        <mat-spinner diameter="40"></mat-spinner>
      </div>

      <div *ngIf="!loading">
        <!-- KPI Cards -->
        <div class="kpi-grid">
          <div class="kpi-card">
            <div class="kpi-icon primary"><mat-icon>inventory</mat-icon></div>
            <div><div class="kpi-value">{{stats.totalProducts}}</div><div class="kpi-label">Total Products</div></div>
          </div>
          <div class="kpi-card">
            <div class="kpi-icon success"><mat-icon>warehouse</mat-icon></div>
            <div><div class="kpi-value">{{stats.totalStock | number}}</div><div class="kpi-label">Total Stock Units</div></div>
          </div>
          <div class="kpi-card">
            <div class="kpi-icon warning"><mat-icon>warning</mat-icon></div>
            <div><div class="kpi-value">{{stats.lowStockCount}}</div><div class="kpi-label">Low Stock Alerts</div></div>
          </div>
          <div class="kpi-card">
            <div class="kpi-icon danger"><mat-icon>remove_shopping_cart</mat-icon></div>
            <div><div class="kpi-value">{{stats.outOfStockCount}}</div><div class="kpi-label">Out of Stock</div></div>
          </div>
          <div class="kpi-card">
            <div class="kpi-icon accent"><mat-icon>pending_actions</mat-icon></div>
            <div><div class="kpi-value">{{stats.pendingPOs}}</div><div class="kpi-label">Pending POs</div></div>
          </div>
          <div class="kpi-card">
            <div class="kpi-icon primary"><mat-icon>arrow_downward</mat-icon></div>
            <div><div class="kpi-value">{{stats.todayStockIn}}</div><div class="kpi-label">Stock In Today</div></div>
          </div>
          <div class="kpi-card">
            <div class="kpi-icon warning"><mat-icon>arrow_upward</mat-icon></div>
            <div><div class="kpi-value">{{stats.todayStockOut}}</div><div class="kpi-label">Stock Out Today</div></div>
          </div>
          <div class="kpi-card">
            <div class="kpi-icon success"><mat-icon>check_circle</mat-icon></div>
            <div><div class="kpi-value">{{stats.approvedPOs}}</div><div class="kpi-label">Approved POs</div></div>
          </div>
        </div>

        <!-- Quick Actions -->
        <div class="quick-actions" *ngIf="authService.hasRole('ADMIN', 'MANAGER')">
          <h3 class="section-title">Quick Actions</h3>
          <div class="action-grid">
            <button mat-stroked-button routerLink="/products" class="action-btn">
              <mat-icon>add_circle</mat-icon> Manage Products
            </button>
            <button mat-stroked-button routerLink="/stock" class="action-btn">
              <mat-icon>swap_vert</mat-icon> Stock Transaction
            </button>
            <button mat-stroked-button routerLink="/forecasting" class="action-btn">
              <mat-icon>insights</mat-icon> AI Forecast
            </button>
            <button mat-stroked-button routerLink="/analytics" class="action-btn">
              <mat-icon>analytics</mat-icon> View Analytics
            </button>
          </div>
        </div>

        <!-- Recent Forecasts -->
        <div class="recent-section" *ngIf="forecasts.length > 0">
          <h3 class="section-title">Latest AI Forecasts</h3>
          <div class="forecast-table-container">
            <table class="forecast-table">
              <thead>
                <tr><th>SKU</th><th>Product</th><th>Current Stock</th><th>Predicted Demand</th><th>Risk Level</th><th>Suggested Action</th></tr>
              </thead>
              <tbody>
                <tr *ngFor="let f of forecasts.slice(0, 8)">
                  <td><code>{{f.product?.sku}}</code></td>
                  <td>{{f.product?.name}}</td>
                  <td>{{f.product?.current_stock}}</td>
                  <td>{{f.predicted_demand | number:'1.0-0'}}</td>
                  <td><span class="badge" [ngClass]="'badge-' + f.risk_level.toLowerCase()">{{f.risk_level}}</span></td>
                  <td>{{f.suggested_reorder > 0 ? 'Reorder ' + f.suggested_reorder + ' units' : 'Stock OK'}}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .header-actions { display: flex; gap: 8px; }
    .section-title { font-size: 18px; font-weight: 600; margin-bottom: 16px; color: var(--text-primary); }
    .quick-actions { margin-bottom: 24px; }
    .action-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; }
    .action-btn { height: 48px; display: flex; align-items: center; gap: 8px; font-weight: 500; }
    .recent-section { margin-top: 24px; }
    .forecast-table-container { overflow-x: auto; background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius); }
    .forecast-table { width: 100%; border-collapse: collapse; }
    .forecast-table th { text-align: left; padding: 12px 16px; font-size: 12px; text-transform: uppercase; color: var(--text-secondary); border-bottom: 1px solid var(--border); font-weight: 600; letter-spacing: 0.05em; }
    .forecast-table td { padding: 12px 16px; border-bottom: 1px solid var(--border); font-size: 14px; }
    .forecast-table tr:hover { background: var(--bg-hover); }
    code { background: var(--bg-hover); padding: 2px 8px; border-radius: 4px; font-size: 13px; }
  `],
})
export class DashboardComponent implements OnInit {
  stats: any = {};
  forecasts: any[] = [];
  loading = true;

  constructor(public authService: AuthService, private api: ApiService) { }

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading = true;
    this.api.getDashboardStats().subscribe({
      next: (data) => {
        this.stats = data;
        this.loading = false;
      },
      error: () => {
        this.stats = { totalProducts: 0, totalStock: 0, lowStockCount: 0, outOfStockCount: 0, pendingPOs: 0, approvedPOs: 0, todayStockIn: 0, todayStockOut: 0 };
        this.loading = false;
      },
    });
    this.api.getAllForecasts().subscribe({
      next: (data) => this.forecasts = data || [],
      error: () => { },
    });
  }

  refreshData(): void {
    this.loadData();
  }
}
