import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { Router } from '@angular/router';
import { environment } from '@env/environment';

export interface User {
    id: number;
    name: string;
    email: string;
    role: 'ADMIN' | 'MANAGER' | 'VENDOR';
}

export interface AuthResponse {
    message: string;
    user: User;
    token: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
    private currentUserSubject = new BehaviorSubject<User | null>(this.getStoredUser());
    currentUser$ = this.currentUserSubject.asObservable();

    constructor(private http: HttpClient, private router: Router) { }

    private getStoredUser(): User | null {
        const user = localStorage.getItem('user');
        return user ? JSON.parse(user) : null;
    }

    get currentUser(): User | null {
        return this.currentUserSubject.value;
    }

    get token(): string | null {
        return localStorage.getItem('token');
    }

    get isLoggedIn(): boolean {
        return !!this.token;
    }

    get userRole(): string {
        return this.currentUser?.role || '';
    }

    login(email: string, password: string): Observable<AuthResponse> {
        return this.http.post<AuthResponse>(`${environment.apiUrl}/auth/login`, { email, password })
            .pipe(tap((res) => this.handleAuth(res)));
    }

    register(name: string, email: string, password: string, role: string): Observable<AuthResponse> {
        return this.http.post<AuthResponse>(`${environment.apiUrl}/auth/register`, { name, email, password, role })
            .pipe(tap((res) => this.handleAuth(res)));
    }

    refreshToken(): Observable<{ token: string }> {
        return this.http.post<{ token: string }>(`${environment.apiUrl}/auth/refresh`, {})
            .pipe(tap((res) => localStorage.setItem('token', res.token)));
    }

    logout(): void {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        this.currentUserSubject.next(null);
        this.router.navigate(['/login']);
    }

    hasRole(...roles: string[]): boolean {
        return roles.includes(this.userRole);
    }

    private handleAuth(res: AuthResponse): void {
        localStorage.setItem('token', res.token);
        localStorage.setItem('user', JSON.stringify(res.user));
        this.currentUserSubject.next(res.user);
    }
}
