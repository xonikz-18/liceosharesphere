import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {

  email: string = '';
  password: string = '';

  showError: boolean = false;
  invalidLogin: boolean = false;
  errorMessage: string = '';
  isLoading: boolean = false;

  constructor(private router: Router, private http: HttpClient) {}

  login() {
    this.showError = true;
    this.invalidLogin = false;
    this.errorMessage = '';

    if (!this.email.trim() || !this.password.trim()) {
      this.errorMessage = 'Please fill in all fields.';
      return;
    }

    this.isLoading = true;

    this.http.post<{ fullname: string; email: string; role: string }>(
    'http://localhost:3000/auth/login', // ✅ FIXED
    { email: this.email, password: this.password }
    ).subscribe({
      next: (user) => {
        this.isLoading = false;
        localStorage.setItem('currentUser', JSON.stringify(user));

        if (user.role === 'admin') {
          this.router.navigate(['/admindashboard']);
        } else {
          this.router.navigate(['/dashboard']);
        }
      },
      error: (err) => {
        this.isLoading = false;
        this.invalidLogin = true;
        this.errorMessage = err.error?.message || 'Invalid email or password.';
      }
    });
  }
}