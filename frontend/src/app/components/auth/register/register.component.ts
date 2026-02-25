import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../../services/auth.service';

@Component({
    selector: 'app-register',
    standalone: true,
    imports: [
        CommonModule, FormsModule, RouterLink,
        MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule,
        MatIconModule, MatSelectModule, MatSnackBarModule, MatProgressSpinnerModule,
    ],
    template: `
    <div class="auth-container">
      <div class="auth-card fade-in">
        <div class="auth-logo">
          <mat-icon class="logo-icon">inventory_2</mat-icon>
          <h1>Create Account</h1>
          <p>Join SmartShelfX</p>
        </div>

        <form (ngSubmit)="register()" class="auth-form">
          <mat-form-field appearance="outline">
            <mat-label>Full Name</mat-label>
            <input matInput [(ngModel)]="name" name="name" required>
            <mat-icon matPrefix>person</mat-icon>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Email</mat-label>
            <input matInput type="email" [(ngModel)]="email" name="email" required>
            <mat-icon matPrefix>email</mat-icon>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Password</mat-label>
            <input matInput [type]="hidePassword ? 'password' : 'text'" [(ngModel)]="password" name="password" required>
            <mat-icon matPrefix>lock</mat-icon>
            <button mat-icon-button matSuffix (click)="hidePassword = !hidePassword" type="button">
              <mat-icon>{{hidePassword ? 'visibility_off' : 'visibility'}}</mat-icon>
            </button>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Role</mat-label>
            <mat-select [(ngModel)]="role" name="role" required>
              <mat-option value="ADMIN">Admin</mat-option>
              <mat-option value="MANAGER">Manager</mat-option>
              <mat-option value="VENDOR">Vendor</mat-option>
            </mat-select>
            <mat-icon matPrefix>badge</mat-icon>
          </mat-form-field>

          <button mat-raised-button color="primary" type="submit" [disabled]="loading" class="auth-btn">
            <mat-spinner *ngIf="loading" diameter="20"></mat-spinner>
            <span *ngIf="!loading">Create Account</span>
          </button>
        </form>

        <div class="auth-footer">
          <p>Already have an account? <a routerLink="/login">Sign In</a></p>
        </div>
      </div>
    </div>
  `,
    styles: [`
    .auth-container {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%);
      padding: 20px;
    }
    .auth-card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 40px;
      width: 100%;
      max-width: 420px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
    }
    .auth-logo { text-align: center; margin-bottom: 24px; }
    .logo-icon { font-size: 48px; width: 48px; height: 48px; color: var(--primary); margin-bottom: 8px; }
    .auth-logo h1 { font-size: 24px; font-weight: 700; background: linear-gradient(135deg, #6366f1, #06b6d4); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .auth-logo p { color: var(--text-secondary); font-size: 14px; }
    .auth-form { display: flex; flex-direction: column; gap: 4px; }
    .auth-btn { height: 48px; font-size: 16px; font-weight: 600; border-radius: 8px; margin-top: 8px; }
    .auth-footer { text-align: center; margin-top: 20px; color: var(--text-secondary); }
    .auth-footer a { color: var(--primary); text-decoration: none; font-weight: 600; }
  `],
})
export class RegisterComponent {
    name = '';
    email = '';
    password = '';
    role = 'VENDOR';
    hidePassword = true;
    loading = false;

    constructor(private authService: AuthService, private router: Router, private snackBar: MatSnackBar) { }

    register(): void {
        if (!this.name || !this.email || !this.password) {
            this.snackBar.open('Please fill in all fields', 'Close', { duration: 3000 });
            return;
        }

        this.loading = true;
        this.authService.register(this.name, this.email, this.password, this.role).subscribe({
            next: () => {
                this.router.navigate(['/dashboard']);
                this.snackBar.open('Account created successfully!', 'Close', { duration: 3000 });
            },
            error: (err) => {
                this.loading = false;
                this.snackBar.open(err.error?.error || 'Registration failed', 'Close', { duration: 3000 });
            },
        });
    }
}
