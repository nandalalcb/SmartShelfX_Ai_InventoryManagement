import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { ApiService } from '../../../services/api.service';
import { StockFormComponent } from '../stock-form/stock-form.component';

@Component({
    selector: 'app-stock-history',
    standalone: true,
    imports: [
        CommonModule, FormsModule,
        MatTableModule, MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule,
        MatSelectModule, MatDatepickerModule, MatNativeDateModule, MatPaginatorModule,
        MatSnackBarModule, MatProgressSpinnerModule, MatDialogModule,
    ],
    template: `
    <div class="page-container fade-in">
      <div class="page-header">
        <div>
          <h1 class="page-title">Stock Transactions</h1>
          <p class="page-subtitle">Record and track all stock movements</p>
        </div>
        <button mat-raised-button color="primary" (click)="openForm()">
          <mat-icon>add</mat-icon> New Transaction
        </button>
      </div>

      <div class="filter-bar">
        <mat-form-field appearance="outline" style="width: 160px;">
          <mat-label>Type</mat-label>
          <mat-select [(ngModel)]="typeFilter" (selectionChange)="loadTransactions()">
            <mat-option value="">All</mat-option>
            <mat-option value="IN">Stock IN</mat-option>
            <mat-option value="OUT">Stock OUT</mat-option>
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline" style="width: 180px;">
          <mat-label>Start Date</mat-label>
          <input matInput [matDatepicker]="startPicker" [(ngModel)]="startDate" (dateChange)="loadTransactions()">
          <mat-datepicker-toggle matSuffix [for]="startPicker"></mat-datepicker-toggle>
          <mat-datepicker #startPicker></mat-datepicker>
        </mat-form-field>
        <mat-form-field appearance="outline" style="width: 180px;">
          <mat-label>End Date</mat-label>
          <input matInput [matDatepicker]="endPicker" [(ngModel)]="endDate" (dateChange)="loadTransactions()">
          <mat-datepicker-toggle matSuffix [for]="endPicker"></mat-datepicker-toggle>
          <mat-datepicker #endPicker></mat-datepicker>
        </mat-form-field>
      </div>

      <div *ngIf="loading" style="text-align: center; padding: 40px;"><mat-spinner diameter="40"></mat-spinner></div>

      <div *ngIf="!loading" class="table-container">
        <table mat-table [dataSource]="transactions" class="full-table">
          <ng-container matColumnDef="id"><th mat-header-cell *matHeaderCellDef>#</th><td mat-cell *matCellDef="let t">{{t.id}}</td></ng-container>
          <ng-container matColumnDef="product"><th mat-header-cell *matHeaderCellDef>Product</th><td mat-cell *matCellDef="let t">{{t.product?.name}} ({{t.product?.sku}})</td></ng-container>
          <ng-container matColumnDef="type"><th mat-header-cell *matHeaderCellDef>Type</th><td mat-cell *matCellDef="let t"><span class="badge" [ngClass]="t.type === 'IN' ? 'badge-ok' : 'badge-high'">{{t.type}}</span></td></ng-container>
          <ng-container matColumnDef="quantity"><th mat-header-cell *matHeaderCellDef>Quantity</th><td mat-cell *matCellDef="let t" style="font-weight: 600;">{{t.quantity}}</td></ng-container>
          <ng-container matColumnDef="handler"><th mat-header-cell *matHeaderCellDef>Handled By</th><td mat-cell *matCellDef="let t">{{t.handler?.name}}</td></ng-container>
          <ng-container matColumnDef="timestamp"><th mat-header-cell *matHeaderCellDef>Timestamp</th><td mat-cell *matCellDef="let t">{{t.timestamp | date:'medium'}}</td></ng-container>
          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
        </table>
        <mat-paginator [length]="total" [pageSize]="pageSize" [pageSizeOptions]="[10, 20, 50]" (page)="onPage($event)"></mat-paginator>
      </div>
    </div>
  `,
    styles: [`.table-container { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden; } .full-table { width: 100%; }`],
})
export class StockHistoryComponent implements OnInit {
    transactions: any[] = [];
    displayedColumns = ['id', 'product', 'type', 'quantity', 'handler', 'timestamp'];
    total = 0; page = 1; pageSize = 20;
    typeFilter = ''; startDate: Date | null = null; endDate: Date | null = null;
    loading = true;

    constructor(private api: ApiService, private dialog: MatDialog, private snackBar: MatSnackBar) { }

    ngOnInit(): void { this.loadTransactions(); }

    loadTransactions(): void {
        this.loading = true;
        const params: any = { page: this.page, limit: this.pageSize };
        if (this.typeFilter) params.type = this.typeFilter;
        if (this.startDate) params.start_date = this.startDate.toISOString();
        if (this.endDate) params.end_date = this.endDate.toISOString();
        this.api.getTransactions(params).subscribe({
            next: (res) => { this.transactions = res.transactions; this.total = res.total; this.loading = false; },
            error: () => this.loading = false,
        });
    }

    onPage(event: PageEvent): void { this.page = event.pageIndex + 1; this.pageSize = event.pageSize; this.loadTransactions(); }

    openForm(): void {
        const ref = this.dialog.open(StockFormComponent, { width: '450px' });
        ref.afterClosed().subscribe((result) => { if (result) this.loadTransactions(); });
    }
}
