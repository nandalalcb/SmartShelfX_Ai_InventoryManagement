import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ApiService } from '../../../services/api.service';

@Component({
    selector: 'app-product-form',
    standalone: true,
    imports: [CommonModule, FormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatSelectModule, MatSnackBarModule],
    template: `
    <h2 mat-dialog-title>{{isEdit ? 'Edit' : 'Add'}} Product</h2>
    <mat-dialog-content>
      <mat-form-field appearance="outline"><mat-label>Name</mat-label><input matInput [(ngModel)]="product.name" required></mat-form-field>
      <mat-form-field appearance="outline"><mat-label>SKU</mat-label><input matInput [(ngModel)]="product.sku" required [disabled]="isEdit"></mat-form-field>
      <mat-form-field appearance="outline"><mat-label>Category</mat-label><input matInput [(ngModel)]="product.category"></mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>Vendor</mat-label>
        <mat-select [(ngModel)]="product.vendor_id">
          <mat-option [value]="null">None</mat-option>
          <mat-option *ngFor="let v of vendors" [value]="v.id">{{v.name}}</mat-option>
        </mat-select>
      </mat-form-field>
      <div style="display:flex; gap:16px;">
        <mat-form-field appearance="outline"><mat-label>Current Stock</mat-label><input matInput type="number" [(ngModel)]="product.current_stock"></mat-form-field>
        <mat-form-field appearance="outline"><mat-label>Reorder Level</mat-label><input matInput type="number" [(ngModel)]="product.reorder_level"></mat-form-field>
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-raised-button color="primary" (click)="save()">{{isEdit ? 'Update' : 'Create'}}</button>
    </mat-dialog-actions>
  `,
    styles: [`mat-form-field { width: 100%; }`],
})
export class ProductFormComponent implements OnInit {
    product: any = { name: '', sku: '', category: '', vendor_id: null, current_stock: 0, reorder_level: 10 };
    vendors: any[] = [];
    isEdit = false;

    constructor(
        private dialogRef: MatDialogRef<ProductFormComponent>,
        @Inject(MAT_DIALOG_DATA) public data: any,
        private api: ApiService,
        private snackBar: MatSnackBar
    ) {
        if (data?.product) {
            this.product = { ...data.product };
            this.isEdit = true;
        }
    }

    ngOnInit(): void {
        this.api.getUsers('VENDOR').subscribe({ next: (v) => this.vendors = v, error: () => { } });
    }

    save(): void {
        const obs = this.isEdit
            ? this.api.updateProduct(this.product.id, this.product)
            : this.api.createProduct(this.product);

        obs.subscribe({
            next: () => {
                this.snackBar.open(`Product ${this.isEdit ? 'updated' : 'created'}`, 'Close', { duration: 3000 });
                this.dialogRef.close(true);
            },
            error: (err) => this.snackBar.open(err.error?.error || 'Save failed', 'Close', { duration: 3000 }),
        });
    }
}
