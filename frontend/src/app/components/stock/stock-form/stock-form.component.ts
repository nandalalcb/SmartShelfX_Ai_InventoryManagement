import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';
import { ApiService } from '../../../services/api.service';

@Component({
    selector: 'app-stock-form',
    standalone: true,
    imports: [CommonModule, FormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatSelectModule, MatSnackBarModule, MatIconModule],
    template: `
    <h2 mat-dialog-title>Record Stock Transaction</h2>
    <mat-dialog-content>
      <mat-form-field appearance="outline">
        <mat-label>Product</mat-label>
        <mat-select [(ngModel)]="productId" required>
          <mat-option *ngFor="let p of products" [value]="p.id">{{p.name}} ({{p.sku}}) - Stock: {{p.current_stock}}</mat-option>
        </mat-select>
      </mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>Type</mat-label>
        <mat-select [(ngModel)]="type" required>
          <mat-option value="IN">Stock IN (Receiving)</mat-option>
          <mat-option value="OUT">Stock OUT (Shipping)</mat-option>
        </mat-select>
      </mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>Quantity</mat-label>
        <input matInput type="number" [(ngModel)]="quantity" min="1" required>
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-raised-button color="primary" (click)="save()">
        <mat-icon>{{type === 'IN' ? 'arrow_downward' : 'arrow_upward'}}</mat-icon>
        Record {{type}}
      </button>
    </mat-dialog-actions>
  `,
    styles: [`mat-form-field { width: 100%; }`],
})
export class StockFormComponent implements OnInit {
    products: any[] = [];
    productId: number | null = null;
    type = 'IN';
    quantity = 1;

    constructor(private dialogRef: MatDialogRef<StockFormComponent>, private api: ApiService, private snackBar: MatSnackBar) { }

    ngOnInit(): void {
        this.api.getProducts({ limit: 1000 }).subscribe({ next: (res) => this.products = res.products, error: () => { } });
    }

    save(): void {
        if (!this.productId || !this.quantity) {
            this.snackBar.open('Please fill all fields', 'Close', { duration: 3000 });
            return;
        }
        this.api.createTransaction({ product_id: this.productId, type: this.type, quantity: this.quantity }).subscribe({
            next: (res) => {
                this.snackBar.open(res.message, 'Close', { duration: 3000 });
                this.dialogRef.close(true);
            },
            error: (err) => this.snackBar.open(err.error?.error || 'Transaction failed', 'Close', { duration: 3000 }),
        });
    }
}
