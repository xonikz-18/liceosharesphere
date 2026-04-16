import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-signinuser',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './signinuser.component.html',
  styleUrls: ['./signinuser.component.scss']
})
export class SigninuserComponent {

  fullname: string = '';
  email: string = '';
  sex: string = '';
  department: string = '';
  contactNumber: string = '';
  password: string = '';
  confirmPassword: string = '';
  errorMessage: string = '';
  submitted = false;
  isLoading = false;

   constructor(private router: Router, private http: HttpClient) {}

  onRegister(signupForm: NgForm) {
    this.submitted = true;
    this.errorMessage = '';

    if (signupForm.invalid) {
      return;
    }

    if (!this.email.includes('@liceo.edu.ph')) {
      this.errorMessage = 'Please use your school email (@liceo.edu.ph).';
      return;
    }

    if (this.password.length < 6) {
      this.errorMessage = 'Password must be at least 6 characters.';
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.errorMessage = 'Passwords do not match.';
      return;
    }
    
    const payload = {
      fullname: this.fullname,
      email: this.email,
      sex: this.sex,
      department: this.department,
      contact_number: this.contactNumber,
      password: this.password,
      confirm_password: this.confirmPassword
    };

    this.isLoading = true;

    this.http.post<any>('http://localhost:3000/auth/register', payload).subscribe({
      next: () => {
        this.isLoading = false;
        this.router.navigate(['/login']);
      },
      error: (err) => {
        this.errorMessage = err.error.message || 'Registration failed. Please try again.';
        this.isLoading = false;
        
      }
      
    });
  }
    onCancel() {
      this.router.navigate(['/login']);
    }
}