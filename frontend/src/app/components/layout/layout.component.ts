import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatBadgeModule } from '@angular/material/badge';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthService } from '../../services/auth.service';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [
    CommonModule, RouterOutlet, RouterLink, RouterLinkActive,
    MatSidenavModule, MatToolbarModule, MatListModule, MatIconModule,
    MatButtonModule, MatMenuModule, MatBadgeModule, MatDividerModule, MatTooltipModule,
  ],
  template: `
    <div class="layout" [class.light-theme]="isLightTheme">
      <!-- Sidebar -->
      <aside class="sidebar" [class.collapsed]="sidebarCollapsed">
        <div class="sidebar-header">
          <mat-icon class="sidebar-logo">inventory_2</mat-icon>
          <span class="sidebar-title" *ngIf="!sidebarCollapsed">SmartShelfX</span>
        </div>

        <nav class="sidebar-nav">
          <a routerLink="/dashboard" routerLinkActive="active" class="nav-item" matTooltip="Dashboard" [matTooltipDisabled]="!sidebarCollapsed">
            <mat-icon>dashboard</mat-icon>
            <span *ngIf="!sidebarCollapsed">Dashboard</span>
          </a>

          <a routerLink="/products" routerLinkActive="active" class="nav-item" *ngIf="authService.hasRole('ADMIN', 'MANAGER')" matTooltip="Products" [matTooltipDisabled]="!sidebarCollapsed">
            <mat-icon>inventory</mat-icon>
            <span *ngIf="!sidebarCollapsed">Products</span>
          </a>

          <a routerLink="/stock" routerLinkActive="active" class="nav-item" *ngIf="authService.hasRole('ADMIN', 'MANAGER')" matTooltip="Stock" [matTooltipDisabled]="!sidebarCollapsed">
            <mat-icon>swap_vert</mat-icon>
            <span *ngIf="!sidebarCollapsed">Stock Transactions</span>
          </a>

          <a routerLink="/purchase-orders" routerLinkActive="active" class="nav-item" matTooltip="Orders" [matTooltipDisabled]="!sidebarCollapsed">
            <mat-icon>shopping_cart</mat-icon>
            <span *ngIf="!sidebarCollapsed">Purchase Orders</span>
          </a>

          <a routerLink="/forecasting" routerLinkActive="active" class="nav-item" *ngIf="authService.hasRole('ADMIN', 'MANAGER')" matTooltip="Forecast" [matTooltipDisabled]="!sidebarCollapsed">
            <mat-icon>insights</mat-icon>
            <span *ngIf="!sidebarCollapsed">AI Forecasting</span>
          </a>

          <a routerLink="/analytics" routerLinkActive="active" class="nav-item" *ngIf="authService.hasRole('ADMIN', 'MANAGER')" matTooltip="Analytics" [matTooltipDisabled]="!sidebarCollapsed">
            <mat-icon>analytics</mat-icon>
            <span *ngIf="!sidebarCollapsed">Analytics</span>
          </a>
        </nav>

        <div class="sidebar-footer">
          <button mat-icon-button (click)="sidebarCollapsed = !sidebarCollapsed" class="collapse-btn">
            <mat-icon>{{sidebarCollapsed ? 'chevron_right' : 'chevron_left'}}</mat-icon>
          </button>
        </div>
      </aside>

      <!-- Main -->
      <div class="main-content">
        <!-- Navbar -->
        <header class="navbar">
          <div class="navbar-left">
            <button mat-icon-button class="mobile-menu" (click)="sidebarCollapsed = !sidebarCollapsed">
              <mat-icon>menu</mat-icon>
            </button>
          </div>

          <div class="navbar-right">
            <!-- Theme Toggle -->
            <button mat-icon-button (click)="toggleTheme()" matTooltip="Toggle Theme">
              <mat-icon>{{isLightTheme ? 'dark_mode' : 'light_mode'}}</mat-icon>
            </button>

            <!-- Notifications -->
            <button mat-icon-button [matMenuTriggerFor]="notifMenu" matTooltip="Notifications">
              <mat-icon [matBadge]="unreadAlerts" matBadgeColor="warn" [matBadgeHidden]="unreadAlerts === 0">notifications</mat-icon>
            </button>
            <mat-menu #notifMenu="matMenu" class="notif-menu">
              <div class="notif-header" (click)="$event.stopPropagation()">
                <strong>Notifications</strong>
                <button mat-button color="primary" (click)="markAllRead()" *ngIf="unreadAlerts > 0">Mark all read</button>
              </div>
              <mat-divider></mat-divider>
              <div class="notif-list" (click)="$event.stopPropagation()">
                <div *ngFor="let alert of alerts" class="notif-item" [class.unread]="!alert.is_read">
                  <mat-icon class="notif-icon" [class]="getAlertIconClass(alert.type)">{{getAlertIcon(alert.type)}}</mat-icon>
                  <div class="notif-content">
                    <p>{{alert.message}}</p>
                    <small>{{alert.created_at | date:'short'}}</small>
                  </div>
                  <button mat-icon-button (click)="dismissAlert(alert.id)" matTooltip="Dismiss">
                    <mat-icon>close</mat-icon>
                  </button>
                </div>
                <div *ngIf="alerts.length === 0" class="notif-empty">No notifications</div>
              </div>
            </mat-menu>

            <!-- Profile -->
            <button mat-icon-button [matMenuTriggerFor]="profileMenu">
              <mat-icon>account_circle</mat-icon>
            </button>
            <mat-menu #profileMenu="matMenu">
              <div class="profile-info" (click)="$event.stopPropagation()">
                <strong>{{authService.currentUser?.name}}</strong>
                <small>{{authService.currentUser?.email}}</small>
                <span class="badge badge-ok" style="margin-top: 4px;">{{authService.currentUser?.role}}</span>
              </div>
              <mat-divider></mat-divider>
              <button mat-menu-item (click)="logout()">
                <mat-icon>logout</mat-icon>
                <span>Logout</span>
              </button>
            </mat-menu>
          </div>
        </header>

        <!-- Page Content -->
        <main class="page-content">
          <router-outlet></router-outlet>
        </main>
      </div>
    </div>
  `,
  styles: [`
    .layout { display: flex; min-height: 100vh; }
    .sidebar {
      width: var(--sidebar-width); min-height: 100vh; background: var(--bg-secondary);
      border-right: 1px solid var(--border); display: flex; flex-direction: column;
      transition: width 0.3s ease; position: fixed; z-index: 100;
    }
    .sidebar.collapsed { width: 68px; }
    .sidebar-header {
      padding: 20px 16px; display: flex; align-items: center; gap: 12px;
      border-bottom: 1px solid var(--border); min-height: 64px;
    }
    .sidebar-logo { color: var(--primary); font-size: 28px; width: 28px; height: 28px; }
    .sidebar-title { font-size: 18px; font-weight: 700; background: linear-gradient(135deg, #6366f1, #06b6d4); -webkit-background-clip: text; -webkit-text-fill-color: transparent; white-space: nowrap; }
    .sidebar-nav { flex: 1; padding: 12px 8px; display: flex; flex-direction: column; gap: 4px; }
    .nav-item {
      display: flex; align-items: center; gap: 12px; padding: 10px 12px;
      border-radius: 8px; color: var(--text-secondary); text-decoration: none;
      transition: var(--transition); font-weight: 500; font-size: 14px; white-space: nowrap;
    }
    .nav-item:hover { background: var(--bg-hover); color: var(--text-primary); }
    .nav-item.active { background: rgba(99, 102, 241, 0.15); color: var(--primary); }
    .sidebar-footer { padding: 12px 8px; border-top: 1px solid var(--border); }
    .collapse-btn { color: var(--text-secondary); }
    .main-content { flex: 1; margin-left: var(--sidebar-width); transition: margin-left 0.3s ease; }
    .sidebar.collapsed ~ .main-content { margin-left: 68px; }
    .navbar {
      height: var(--navbar-height); display: flex; align-items: center; justify-content: space-between;
      padding: 0 24px; border-bottom: 1px solid var(--border); background: var(--bg-secondary); position: sticky; top: 0; z-index: 50;
    }
    .navbar-right { display: flex; align-items: center; gap: 8px; }
    .page-content { padding: 0; min-height: calc(100vh - var(--navbar-height)); }
    .mobile-menu { display: none; }
    .notif-header { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; }
    .notif-list { max-height: 400px; overflow-y: auto; max-width: 400px; }
    .notif-item { display: flex; align-items: flex-start; gap: 12px; padding: 12px 16px; border-bottom: 1px solid var(--border); }
    .notif-item.unread { background: rgba(99, 102, 241, 0.05); }
    .notif-icon { margin-top: 2px; }
    .notif-content p { font-size: 13px; margin: 0; }
    .notif-content small { color: var(--text-muted); }
    .notif-empty { padding: 24px; text-align: center; color: var(--text-muted); }
    .profile-info { padding: 12px 16px; display: flex; flex-direction: column; }
    .profile-info strong { font-size: 14px; }
    .profile-info small { color: var(--text-muted); }
    @media (max-width: 768px) {
      .sidebar { transform: translateX(-100%); position: fixed; z-index: 1000; }
      .sidebar:not(.collapsed) { transform: translateX(0); }
      .main-content { margin-left: 0 !important; }
      .mobile-menu { display: block; }
    }
  `],
})
export class LayoutComponent implements OnInit {
  sidebarCollapsed = false;
  isLightTheme = false;
  unreadAlerts = 0;
  alerts: any[] = [];

  constructor(
    public authService: AuthService,
    private apiService: ApiService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.loadAlerts();
    // Refresh alerts every 60 seconds
    setInterval(() => this.loadAlerts(), 60000);
  }

  loadAlerts(): void {
    this.apiService.getUnreadCount().subscribe({
      next: (res) => this.unreadAlerts = res.unread,
      error: () => { },
    });
    this.apiService.getAlerts({ limit: 10 }).subscribe({
      next: (res) => this.alerts = res.alerts || [],
      error: () => { },
    });
  }

  toggleTheme(): void {
    this.isLightTheme = !this.isLightTheme;
    if (this.isLightTheme) {
      document.body.classList.add('light-theme');
    } else {
      document.body.classList.remove('light-theme');
    }
  }

  getAlertIcon(type: string): string {
    const icons: any = { LOW_STOCK: 'warning', RESTOCK: 'autorenew', VENDOR_PENDING: 'schedule', EXPIRY: 'event', SYSTEM: 'info' };
    return icons[type] || 'notification_important';
  }

  getAlertIconClass(type: string): string {
    const classes: any = { LOW_STOCK: 'text-warning', RESTOCK: 'text-primary', VENDOR_PENDING: 'text-danger', SYSTEM: 'text-accent' };
    return classes[type] || '';
  }

  markAllRead(): void {
    this.apiService.markAllAlertsRead().subscribe(() => this.loadAlerts());
  }

  dismissAlert(id: number): void {
    this.apiService.dismissAlert(id).subscribe(() => this.loadAlerts());
  }

  logout(): void {
    this.authService.logout();
  }
}
