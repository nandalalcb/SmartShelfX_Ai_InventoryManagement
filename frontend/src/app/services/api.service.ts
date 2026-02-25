import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';

@Injectable({ providedIn: 'root' })
export class ApiService {
    private apiUrl = environment.apiUrl;

    constructor(private http: HttpClient) { }

    // ─── Products ─────────────────────────────────────
    getProducts(params?: any): Observable<any> {
        let httpParams = new HttpParams();
        if (params) {
            Object.keys(params).forEach(key => {
                if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
                    httpParams = httpParams.set(key, params[key]);
                }
            });
        }
        return this.http.get(`${this.apiUrl}/products`, { params: httpParams });
    }

    getProduct(id: number): Observable<any> {
        return this.http.get(`${this.apiUrl}/products/${id}`);
    }

    createProduct(data: any): Observable<any> {
        return this.http.post(`${this.apiUrl}/products`, data);
    }

    updateProduct(id: number, data: any): Observable<any> {
        return this.http.put(`${this.apiUrl}/products/${id}`, data);
    }

    deleteProduct(id: number): Observable<any> {
        return this.http.delete(`${this.apiUrl}/products/${id}`);
    }

    importCSV(file: File): Observable<any> {
        const formData = new FormData();
        formData.append('file', file);
        return this.http.post(`${this.apiUrl}/products/import-csv`, formData);
    }

    getCategories(): Observable<string[]> {
        return this.http.get<string[]>(`${this.apiUrl}/products/categories`);
    }

    // ─── Stock Transactions ───────────────────────────
    getTransactions(params?: any): Observable<any> {
        let httpParams = new HttpParams();
        if (params) {
            Object.keys(params).forEach(key => {
                if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
                    httpParams = httpParams.set(key, params[key]);
                }
            });
        }
        return this.http.get(`${this.apiUrl}/stock`, { params: httpParams });
    }

    createTransaction(data: any): Observable<any> {
        return this.http.post(`${this.apiUrl}/stock`, data);
    }

    // ─── Purchase Orders ──────────────────────────────
    getPurchaseOrders(params?: any): Observable<any> {
        let httpParams = new HttpParams();
        if (params) {
            Object.keys(params).forEach(key => {
                if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
                    httpParams = httpParams.set(key, params[key]);
                }
            });
        }
        return this.http.get(`${this.apiUrl}/purchase-orders`, { params: httpParams });
    }

    createPurchaseOrder(data: any): Observable<any> {
        return this.http.post(`${this.apiUrl}/purchase-orders`, data);
    }

    approvePO(id: number): Observable<any> {
        return this.http.patch(`${this.apiUrl}/purchase-orders/${id}/approve`, {});
    }

    dispatchPO(id: number): Observable<any> {
        return this.http.patch(`${this.apiUrl}/purchase-orders/${id}/dispatch`, {});
    }

    rejectPO(id: number): Observable<any> {
        return this.http.delete(`${this.apiUrl}/purchase-orders/${id}`);
    }

    receivePO(id: number): Observable<any> {
        return this.http.patch(`${this.apiUrl}/purchase-orders/${id}/receive`, {});
    }

    // ─── AI Forecasting ───────────────────────────────
    getForecast(productId: number): Observable<any> {
        return this.http.get(`${this.apiUrl}/ai/forecast/${productId}`);
    }

    getAllForecasts(): Observable<any> {
        return this.http.get(`${this.apiUrl}/ai/forecasts`);
    }

    runBatchForecast(): Observable<any> {
        return this.http.post(`${this.apiUrl}/ai/forecast/batch`, {});
    }

    // ─── Auto Restock ─────────────────────────────────
    checkRestock(): Observable<any> {
        return this.http.post(`${this.apiUrl}/restock/check`, {});
    }

    // ─── Alerts ───────────────────────────────────────
    getAlerts(params?: any): Observable<any> {
        let httpParams = new HttpParams();
        if (params) {
            Object.keys(params).forEach(key => {
                if (params[key]) httpParams = httpParams.set(key, params[key]);
            });
        }
        return this.http.get(`${this.apiUrl}/alerts`, { params: httpParams });
    }

    getUnreadCount(): Observable<{ unread: number }> {
        return this.http.get<{ unread: number }>(`${this.apiUrl}/alerts/unread-count`);
    }

    markAlertRead(id: number): Observable<any> {
        return this.http.patch(`${this.apiUrl}/alerts/${id}/read`, {});
    }

    markAllAlertsRead(): Observable<any> {
        return this.http.patch(`${this.apiUrl}/alerts/read-all`, {});
    }

    dismissAlert(id: number): Observable<any> {
        return this.http.delete(`${this.apiUrl}/alerts/${id}`);
    }

    // ─── Analytics ────────────────────────────────────
    getDashboardStats(): Observable<any> {
        return this.http.get(`${this.apiUrl}/analytics/dashboard`);
    }

    getInventoryTrend(days?: number): Observable<any> {
        let httpParams = new HttpParams();
        if (days) httpParams = httpParams.set('days', days.toString());
        return this.http.get(`${this.apiUrl}/analytics/inventory-trend`, { params: httpParams });
    }

    getSalesVsPurchases(months?: number): Observable<any> {
        let httpParams = new HttpParams();
        if (months) httpParams = httpParams.set('months', months.toString());
        return this.http.get(`${this.apiUrl}/analytics/sales-purchases`, { params: httpParams });
    }

    getTopRestocked(limit?: number): Observable<any> {
        let httpParams = new HttpParams();
        if (limit) httpParams = httpParams.set('limit', limit.toString());
        return this.http.get(`${this.apiUrl}/analytics/top-restocked`, { params: httpParams });
    }

    exportExcel(): Observable<Blob> {
        return this.http.get(`${this.apiUrl}/analytics/export/excel`, { responseType: 'blob' });
    }

    exportPDF(): Observable<Blob> {
        return this.http.get(`${this.apiUrl}/analytics/export/pdf`, { responseType: 'blob' });
    }

    // ─── Users ────────────────────────────────────────
    getUsers(role?: string): Observable<any> {
        let httpParams = new HttpParams();
        if (role) {
            httpParams = httpParams.set('role', role);
        }
        return this.http.get(`${this.apiUrl}/auth/users`, { params: httpParams });
    }
}
