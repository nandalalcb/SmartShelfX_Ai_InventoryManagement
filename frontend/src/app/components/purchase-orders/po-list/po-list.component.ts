import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { ApiService } from '../../../services/api.service';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-po-list',
  standalone: true,
  imports: [CommonModule, FormsModule, MatTableModule, MatButtonModule, MatIconModule, MatSelectModule, MatFormFieldModule, MatPaginatorModule, MatSnackBarModule, MatProgressSpinnerModule, MatTooltipModule, MatChipsModule],
  template: `
    <div class="page-container fade-in">
      <div class="page-header">
        <div><h1 class="page-title">Purchase Orders</h1><p class="page-subtitle">Manage vendor purchase orders</p></div>
        <div style="display:flex;gap:8px" *ngIf="authService.userRole === 'MANAGER' || authService.userRole === 'ADMIN'">
          <button mat-stroked-button (click)="checkRestock()"><mat-icon>autorenew</mat-icon> Auto-Restock</button>
        </div>
      </div>
      <div class="filter-bar">
        <mat-form-field appearance="outline" style="width:180px"><mat-label>Status</mat-label>
          <mat-select [(ngModel)]="statusFilter" (selectionChange)="loadPOs()">
            <mat-option value="">All</mat-option><mat-option value="PENDING">Pending</mat-option>
            <mat-option value="APPROVED">Approved</mat-option><mat-option value="DISPATCHED">Dispatched</mat-option>
            <mat-option value="RECEIVED">Received</mat-option>
          </mat-select>
        </mat-form-field>
      </div>
      <div *ngIf="loading" style="text-align:center;padding:40px"><mat-spinner diameter="40"></mat-spinner></div>
      <div *ngIf="!loading" class="table-container" style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden">
        <table mat-table [dataSource]="orders" style="width:100%">
          <ng-container matColumnDef="id"><th mat-header-cell *matHeaderCellDef>PO #</th><td mat-cell *matCellDef="let o">{{o.id}}</td></ng-container>
          <ng-container matColumnDef="product"><th mat-header-cell *matHeaderCellDef>Product</th><td mat-cell *matCellDef="let o">{{o.product?.name}}</td></ng-container>
          <ng-container matColumnDef="vendor"><th mat-header-cell *matHeaderCellDef>Vendor</th><td mat-cell *matCellDef="let o">{{o.vendor?.name}}</td></ng-container>
          <ng-container matColumnDef="quantity"><th mat-header-cell *matHeaderCellDef>Qty</th><td mat-cell *matCellDef="let o" style="font-weight:600">{{o.quantity}}</td></ng-container>
          <ng-container matColumnDef="stock"><th mat-header-cell *matHeaderCellDef>Current Stock</th><td mat-cell *matCellDef="let o">{{o.product?.current_stock}}</td></ng-container>
          <ng-container matColumnDef="status"><th mat-header-cell *matHeaderCellDef>Status</th><td mat-cell *matCellDef="let o"><span class="badge" [ngClass]="'badge-'+o.status.toLowerCase()">{{o.status}}</span></td></ng-container>
          <ng-container matColumnDef="created_at"><th mat-header-cell *matHeaderCellDef>Created</th><td mat-cell *matCellDef="let o">{{o.created_at|date:'mediumDate'}}</td></ng-container>
          <ng-container matColumnDef="actions"><th mat-header-cell *matHeaderCellDef>Actions</th>
            <td mat-cell *matCellDef="let o">
              <div style="display:flex;gap:4px">
                <!-- VENDOR actions: Approve (PENDING) and Dispatch (APPROVED) -->
                <ng-container *ngIf="authService.hasRole('VENDOR')">
                  <button mat-icon-button matTooltip="Approve" color="primary" (click)="approve(o)" *ngIf="o.status==='PENDING'"><mat-icon>check_circle</mat-icon></button>
                  <button mat-icon-button matTooltip="Dispatch" color="accent" (click)="dispatch(o)" *ngIf="o.status==='APPROVED'"><mat-icon>local_shipping</mat-icon></button>
                </ng-container>
                <!-- MANAGER/ADMIN actions: Receive (DISPATCHED) and Reject (PENDING) -->
                <ng-container *ngIf="authService.userRole === 'MANAGER' || authService.userRole === 'ADMIN'">
                  <button mat-icon-button matTooltip="Receive & Update Stock" color="primary" (click)="receive(o)" *ngIf="o.status === 'DISPATCHED'"><mat-icon>inventory</mat-icon></button>
                  <button mat-icon-button matTooltip="Reject" color="warn" (click)="reject(o)" *ngIf="o.status === 'PENDING'"><mat-icon>cancel</mat-icon></button>
                </ng-container>
              </div>
            </td>
          </ng-container>
          <tr mat-header-row *matHeaderRowDef="cols"></tr><tr mat-row *matRowDef="let row;columns:cols"></tr>
        </table>
        <mat-paginator [length]="total" [pageSize]="pageSize" [pageSizeOptions]="[10,20,50]" (page)="onPage($event)"></mat-paginator>
      </div>
    </div>
  `,
})
export class PoListComponent implements OnInit {
  orders: any[] = []; cols = ['id', 'product', 'vendor', 'quantity', 'stock', 'status', 'created_at', 'actions'];
  total = 0; page = 1; pageSize = 20; statusFilter = ''; loading = true;
  constructor(public authService: AuthService, private api: ApiService, private snackBar: MatSnackBar) { }
  ngOnInit() { this.loadPOs(); }
  loadPOs() {
    this.loading = true;
    this.api.getPurchaseOrders({ page: this.page, limit: this.pageSize, status: this.statusFilter }).subscribe({
      next: r => { this.orders = r.purchaseOrders; this.total = r.total; this.loading = false; }, error: () => this.loading = false
    });
  }
  onPage(e: PageEvent) { this.page = e.pageIndex + 1; this.pageSize = e.pageSize; this.loadPOs(); }
  approve(o: any) {
    this.api.approvePO(o.id).subscribe({
      next: () => { this.snackBar.open('PO Approved successfully', 'Close', { duration: 3000 }); this.loadPOs(); },
      error: e => this.snackBar.open(e.error?.error || 'Failed to approve', 'Close', { duration: 3000 })
    });
  }
  dispatch(o: any) {
    this.api.dispatchPO(o.id).subscribe({
      next: () => { this.snackBar.open('PO Dispatched successfully', 'Close', { duration: 3000 }); this.loadPOs(); },
      error: e => this.snackBar.open(e.error?.error || 'Failed to dispatch', 'Close', { duration: 3000 })
    });
  }
  receive(o: any) {
    if (confirm(`Receive PO #${o.id}? This will add ${o.quantity} units of "${o.product?.name}" to stock.`)) {
      this.api.receivePO(o.id).subscribe({
        next: (res) => { this.snackBar.open(`Stock updated! New stock: ${res.newStock}`, 'Close', { duration: 5000 }); this.loadPOs(); },
        error: e => this.snackBar.open(e.error?.error || 'Failed to receive', 'Close', { duration: 3000 })
      });
    }
  }
  reject(o: any) {
    if (confirm('Reject this purchase order?')) {
      this.api.rejectPO(o.id).subscribe({
        next: () => { this.snackBar.open('PO Rejected', 'Close', { duration: 3000 }); this.loadPOs(); },
        error: e => this.snackBar.open(e.error?.error || 'Failed to reject', 'Close', { duration: 3000 })
      });
    }
  }
  checkRestock() {
    this.api.checkRestock().subscribe({
      next: r => { this.snackBar.open(`${r.generated} POs generated`, 'Close', { duration: 5000 }); this.loadPOs(); },
      error: e => this.snackBar.open(e.error?.error || 'Failed', 'Close', { duration: 3000 })
    });
  }
}
