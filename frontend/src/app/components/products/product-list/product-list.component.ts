import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { ApiService } from '../../../services/api.service';
import { ProductFormComponent } from '../product-form/product-form.component';

@Component({
    selector: 'app-product-list',
    standalone: true,
    imports: [
        CommonModule, FormsModule,
        MatTableModule, MatButtonModule, MatIconModule, MatFormFieldModule,
        MatInputModule, MatSelectModule, MatDialogModule, MatSnackBarModule,
        MatPaginatorModule, MatProgressSpinnerModule, MatTooltipModule, MatMenuModule,
    ],
    template: `
    <div class="page-container fade-in">
      <div class="page-header">
        <div>
          <h1 class="page-title">Products</h1>
          <p class="page-subtitle">Manage your inventory catalog</p>
        </div>
        <div class="header-actions">
          <button mat-stroked-button (click)="csvInput.click()">
            <mat-icon>upload_file</mat-icon> Import CSV
          </button>
          <input #csvInput type="file" accept=".csv" hidden (change)="importCSV($event)">
          <button mat-raised-button color="primary" (click)="openForm()">
            <mat-icon>add</mat-icon> Add Product
          </button>
        </div>
      </div>

      <!-- Filters -->
      <div class="filter-bar">
        <mat-form-field appearance="outline" style="width: 250px;">
          <mat-label>Search</mat-label>
          <input matInput [(ngModel)]="search" (keyup.enter)="loadProducts()" placeholder="Search by name or SKU">
          <mat-icon matPrefix>search</mat-icon>
        </mat-form-field>
        <mat-form-field appearance="outline" style="width: 160px;">
          <mat-label>Category</mat-label>
          <mat-select [(ngModel)]="category" (selectionChange)="loadProducts()">
            <mat-option value="">All</mat-option>
            <mat-option *ngFor="let c of categories" [value]="c">{{c}}</mat-option>
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline" style="width: 160px;">
          <mat-label>Stock Status</mat-label>
          <mat-select [(ngModel)]="stockStatus" (selectionChange)="loadProducts()">
            <mat-option value="">All</mat-option>
            <mat-option value="ok">In Stock</mat-option>
            <mat-option value="low">Low Stock</mat-option>
            <mat-option value="out">Out of Stock</mat-option>
          </mat-select>
        </mat-form-field>
      </div>

      <div *ngIf="loading" style="text-align: center; padding: 40px;"><mat-spinner diameter="40"></mat-spinner></div>

      <div *ngIf="!loading" class="table-container">
        <table mat-table [dataSource]="products" class="full-table">
          <ng-container matColumnDef="sku">
            <th mat-header-cell *matHeaderCellDef>SKU</th>
            <td mat-cell *matCellDef="let p"><code>{{p.sku}}</code></td>
          </ng-container>
          <ng-container matColumnDef="name">
            <th mat-header-cell *matHeaderCellDef>Product Name</th>
            <td mat-cell *matCellDef="let p">{{p.name}}</td>
          </ng-container>
          <ng-container matColumnDef="category">
            <th mat-header-cell *matHeaderCellDef>Category</th>
            <td mat-cell *matCellDef="let p">{{p.category || '—'}}</td>
          </ng-container>
          <ng-container matColumnDef="vendor">
            <th mat-header-cell *matHeaderCellDef>Vendor</th>
            <td mat-cell *matCellDef="let p">{{p.vendor?.name || '—'}}</td>
          </ng-container>
          <ng-container matColumnDef="current_stock">
            <th mat-header-cell *matHeaderCellDef>Stock</th>
            <td mat-cell *matCellDef="let p">
              <span [class]="getStockClass(p)">{{p.current_stock}}</span>
            </td>
          </ng-container>
          <ng-container matColumnDef="reorder_level">
            <th mat-header-cell *matHeaderCellDef>Reorder Level</th>
            <td mat-cell *matCellDef="let p">{{p.reorder_level}}</td>
          </ng-container>
          <ng-container matColumnDef="status">
            <th mat-header-cell *matHeaderCellDef>Status</th>
            <td mat-cell *matCellDef="let p">
              <span class="badge" [ngClass]="getStatusBadge(p)">{{getStatusText(p)}}</span>
            </td>
          </ng-container>
          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef>Actions</th>
            <td mat-cell *matCellDef="let p">
              <div class="table-actions">
                <button mat-icon-button matTooltip="Edit" (click)="openForm(p)"><mat-icon>edit</mat-icon></button>
                <button mat-icon-button matTooltip="Delete" color="warn" (click)="deleteProduct(p)"><mat-icon>delete</mat-icon></button>
              </div>
            </td>
          </ng-container>
          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
        </table>
        <mat-paginator [length]="total" [pageSize]="pageSize" [pageSizeOptions]="[10, 20, 50]" (page)="onPage($event)"></mat-paginator>
      </div>
    </div>
  `,
    styles: [`
    .header-actions { display: flex; gap: 8px; }
    .table-container { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden; }
    .full-table { width: 100%; }
    code { background: var(--bg-hover); padding: 2px 8px; border-radius: 4px; font-size: 13px; }
    .stock-ok { color: var(--success); font-weight: 600; }
    .stock-low { color: var(--warning); font-weight: 600; }
    .stock-out { color: var(--danger); font-weight: 600; }
  `],
})
export class ProductListComponent implements OnInit {
    products: any[] = [];
    categories: string[] = [];
    displayedColumns = ['sku', 'name', 'category', 'vendor', 'current_stock', 'reorder_level', 'status', 'actions'];
    total = 0;
    page = 1;
    pageSize = 20;
    search = '';
    category = '';
    stockStatus = '';
    loading = true;

    constructor(private api: ApiService, private dialog: MatDialog, private snackBar: MatSnackBar) { }

    ngOnInit(): void {
        this.loadProducts();
        this.api.getCategories().subscribe({ next: (c) => this.categories = c, error: () => { } });
    }

    loadProducts(): void {
        this.loading = true;
        this.api.getProducts({ page: this.page, limit: this.pageSize, search: this.search, category: this.category, stock_status: this.stockStatus }).subscribe({
            next: (res) => { this.products = res.products; this.total = res.total; this.loading = false; },
            error: () => { this.loading = false; },
        });
    }

    onPage(event: PageEvent): void {
        this.page = event.pageIndex + 1;
        this.pageSize = event.pageSize;
        this.loadProducts();
    }

    openForm(product?: any): void {
        const ref = this.dialog.open(ProductFormComponent, { width: '500px', data: { product } });
        ref.afterClosed().subscribe((result) => { if (result) this.loadProducts(); });
    }

    deleteProduct(product: any): void {
        if (confirm(`Delete "${product.name}"?`)) {
            this.api.deleteProduct(product.id).subscribe({
                next: () => { this.snackBar.open('Product deleted', 'Close', { duration: 3000 }); this.loadProducts(); },
                error: (err) => this.snackBar.open(err.error?.error || 'Delete failed', 'Close', { duration: 3000 }),
            });
        }
    }

    importCSV(event: any): void {
        const file = event.target.files[0];
        if (!file) return;
        this.api.importCSV(file).subscribe({
            next: (res) => { this.snackBar.open(`Imported ${res.imported} products`, 'Close', { duration: 5000 }); this.loadProducts(); },
            error: (err) => this.snackBar.open(err.error?.error || 'Import failed', 'Close', { duration: 3000 }),
        });
    }

    getStockClass(p: any): string {
        if (p.current_stock <= 0) return 'stock-out';
        if (p.current_stock <= p.reorder_level) return 'stock-low';
        return 'stock-ok';
    }

    getStatusBadge(p: any): string {
        if (p.current_stock <= 0) return 'badge-critical';
        if (p.current_stock <= p.reorder_level) return 'badge-medium';
        return 'badge-ok';
    }

    getStatusText(p: any): string {
        if (p.current_stock <= 0) return 'OUT OF STOCK';
        if (p.current_stock <= p.reorder_level) return 'LOW STOCK';
        return 'IN STOCK';
    }
}
