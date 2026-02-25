import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../../services/auth.service';

@Component({
    selector: 'app-login',
    standalone: true,
    imports: [
        CommonModule, FormsModule, RouterLink,
        MatCardModule, MatFormFieldModule, MatInputModule,
        MatButtonModule, MatIconModule, MatSnackBarModule, MatProgressSpinnerModule,
    ],
    template: `
    <div class="auth-container">
      <div class="auth-card fade-in">
        <div class="auth-logo">
          <mat-icon class="logo-icon">inventory_2</mat-icon>
          <h1>SmartShelfX</h1>
          <p>AI-Powered Inventory Management</p>
        </div>

        <form (ngSubmit)="login()" class="auth-form">
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

          <button mat-raised-button color="primary" type="submit" [disabled]="loading" class="auth-btn">
            <mat-spinner *ngIf="loading" diameter="20"></mat-spinner>
            <span *ngIf="!loading">Sign In</span>
          </button>
        </form>

        <div class="auth-footer">
          <p>Don't have an account? <a routerLink="/register">Register</a></p>
        </div>

        <div class="demo-credentials">
          <p><strong>Demo Credentials:</strong></p>
          <small>Admin: admin&#64;smartshelfx.com / password123</small><br>
          <small>Manager: manager&#64;smartshelfx.com / password123</small>
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
    .auth-logo {
      text-align: center;
      margin-bottom: 32px;
    }
    .logo-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      color: var(--primary);
      margin-bottom: 8px;
    }
    .auth-logo h1 {
      font-size: 28px;
      font-weight: 700;
      background: linear-gradient(135deg, #6366f1, #06b6d4);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .auth-logo p {
      color: var(--text-secondary);
      font-size: 14px;
      margin-top: 4px;
    }
    .auth-form {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .auth-btn {
      height: 48px;
      font-size: 16px;
      font-weight: 600;
      border-radius: 8px;
      margin-top: 8px;
    }
    .auth-footer {
      text-align: center;
      margin-top: 20px;
      color: var(--text-secondary);
    }
    .auth-footer a {
      color: var(--primary);
      text-decoration: none;
      font-weight: 600;
    }
    .demo-credentials {
      margin-top: 20px;
      padding: 12px;
      background: var(--bg-hover);
      border-radius: 8px;
      text-align: center;
      color: var(--text-secondary);
      font-size: 12px;
    }
  `],
})
export class LoginComponent {
    email = '';
    password = '';
    hidePassword = true;
    loading = false;

    constructor(
        private authService: AuthService,
        private router: Router,
        private snackBar: MatSnackBar
    ) {
        if (this.authService.isLoggedIn) {
            this.router.navigate(['/dashboard']);
        }
    }

    login(): void {
        if (!this.email || !this.password) {
            this.snackBar.open('Please fill in all fields', 'Close', { duration: 3000 });
            return;
        }

        this.loading = true;
        this.authService.login(this.email, this.password).subscribe({
            next: () => {
                this.router.navigate(['/dashboard']);
                this.snackBar.open('Welcome back!', 'Close', { duration: 3000 });
            },
            error: (err) => {
                this.loading = false;
                this.snackBar.open(err.error?.error || 'Login failed', 'Close', { duration: 3000 });
            },
        });
    }
}
