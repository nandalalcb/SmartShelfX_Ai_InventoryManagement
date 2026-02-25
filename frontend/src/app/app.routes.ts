import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { roleGuard } from './guards/role.guard';

export const routes: Routes = [
    {
        path: 'login',
        loadComponent: () => import('./components/auth/login/login.component').then(m => m.LoginComponent),
    },
    {
        path: 'register',
        loadComponent: () => import('./components/auth/register/register.component').then(m => m.RegisterComponent),
    },
    {
        path: '',
        loadComponent: () => import('./components/layout/layout.component').then(m => m.LayoutComponent),
        canActivate: [authGuard],
        children: [
            { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
            {
                path: 'dashboard',
                loadComponent: () => import('./components/dashboard/dashboard.component').then(m => m.DashboardComponent),
            },
            {
                path: 'products',
                loadComponent: () => import('./components/products/product-list/product-list.component').then(m => m.ProductListComponent),
                canActivate: [roleGuard],
                data: { roles: ['ADMIN', 'MANAGER'] },
            },
            {
                path: 'stock',
                loadComponent: () => import('./components/stock/stock-history/stock-history.component').then(m => m.StockHistoryComponent),
                canActivate: [roleGuard],
                data: { roles: ['ADMIN', 'MANAGER'] },
            },
            {
                path: 'purchase-orders',
                loadComponent: () => import('./components/purchase-orders/po-list/po-list.component').then(m => m.PoListComponent),
            },
            {
                path: 'forecasting',
                loadComponent: () => import('./components/forecasting/forecast-view/forecast-view.component').then(m => m.ForecastViewComponent),
                canActivate: [roleGuard],
                data: { roles: ['ADMIN', 'MANAGER'] },
            },
            {
                path: 'analytics',
                loadComponent: () => import('./components/analytics/analytics.component').then(m => m.AnalyticsComponent),
                canActivate: [roleGuard],
                data: { roles: ['ADMIN', 'MANAGER'] },
            },
        ],
    },
    { path: '**', redirectTo: 'login' },
];
