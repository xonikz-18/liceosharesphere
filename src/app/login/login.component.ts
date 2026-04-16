import { ChangeDetectorRef, Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { ProfileService } from '../services/profile.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  private readonly emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  private readonly adminEmail = 'npacatang89487@liceo.edu.ph';

  email: string = '';
  password: string = '';

  showError: boolean = false;
  invalidLogin: boolean = false;
  errorMessage: string = '';
  isLoading: boolean = false;

  constructor(
    private router: Router,
    private profileService: ProfileService,
    private cdr: ChangeDetectorRef
  ) {}

  clearLoginError() {
    if (!this.invalidLogin && this.errorMessage !== 'Invalid email or password.') {
      return;
    }

    this.invalidLogin = false;
    this.errorMessage = '';
  }

  login() {
    this.showError = true;
    this.invalidLogin = false;
    this.errorMessage = '';

    const email = this.email.trim();
    const password = this.password.trim();

    if (!email || !password) {
      this.errorMessage = 'Please fill in all fields.';
      this.cdr.detectChanges();
      return;
    }

    if (!this.emailPattern.test(email)) {
      this.errorMessage = 'Please enter a valid email address.';
      this.cdr.detectChanges();
      return;
    }

    this.isLoading = true;
    this.cdr.detectChanges();

    this.profileService.login(email, password).subscribe({
      next: () => {
        this.isLoading = false;
        this.cdr.detectChanges();

        const normalizedEmail = email.toLowerCase();
        if (normalizedEmail === this.adminEmail) {
          this.router.navigate(['/admindashboard']);
          return;
        }

        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.isLoading = false;
        this.invalidLogin = true;
        this.errorMessage = err.error?.message || 'Invalid email or password.';
        this.cdr.detectChanges();
      }
    });
  }
}
