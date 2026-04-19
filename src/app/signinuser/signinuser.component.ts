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

  fullnameerror: string = '';
  emailerror: string = '';
  sexerror: string = '';
  departmenterror: string = '';
  contactNumbererror: string = '';
  passworderror: string = '';
  confirmPassworderror: string = '';

  submitted = false;
  isLoading = false;

   constructor(private router: Router, private http: HttpClient) {}

  onRegister(signupForm: NgForm) {

    this.submitted = true;
    this.errorMessage = '';

    this.fullnameerror = '';
    this.emailerror = '';
    this.sexerror = '';
    this.departmenterror = '';
    this.contactNumbererror = '';
    this.passworderror = '';
    this.confirmPassworderror = '';

    let hasError = false;

    if (
    !this.fullname.trim() &&
    !this.email.trim() &&
    !this.sex &&
    !this.department &&
    !this.contactNumber.trim() &&
    !this.password &&
    !this.confirmPassword
  ) {
    this.errorMessage = 'Please fill in all required fields.';
    return;
  }

    if (!this.fullname.trim()) {
      this.fullnameerror = 'Full name is required.';
      hasError = true;
    }
    if (!this.email.trim()) {
      this.emailerror = 'Email is required.';
      hasError = true;
    }
    if (!this.sex.trim()) {
      this.sexerror = 'Gender is required.';
      hasError = true;
    }
    if (!this.department.trim()) {
      this.departmenterror = 'Department is required.';
      hasError = true;
    }
    if (!this.contactNumber.trim()) {
      this.contactNumbererror = 'Contact number is required.';
      hasError = true;
    }
    if (!this.password.trim()) {
      this.passworderror = 'Password is required.';
      hasError = true;
    }
    if (!this.confirmPassword.trim()) {
      this.confirmPassworderror = 'Confirm password is required.';
      hasError = true;
    }

      if (hasError) return;
    
     const payload = {
      fullname: this.fullname,
      email: this.email,
      sex: this.sex,
      department: this.department,
      contact_number: this.contactNumber,
      password: this.password
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