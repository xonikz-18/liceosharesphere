import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';

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

  constructor(private router: Router) {}

  users = [
    {
      email: 'admin@liceo.edu.ph',
      password: '123123123',
      role: 'admin'
    },
    {
      email: 'student@liceo.edu.ph',
      password: 'password123',
      role: 'student'
    } 
  ];

  login() {

    this.showError = true;
    this.invalidLogin = false;

    if (!this.email.trim() || !this.password.trim()) {
      return;
    }

    const user = this.users.find(
      u => u.email === this.email && u.password === this.password
    );

    if (!user) {
      this.invalidLogin = true;
      return;
    }

    if (user.role === 'admin') {
      this.router.navigate(['/admindashboard']);
    } else {
      this.router.navigate(['/dashboard']);
    }
  }
}