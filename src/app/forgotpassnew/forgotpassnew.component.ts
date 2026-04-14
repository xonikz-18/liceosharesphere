import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-forgotpassnew',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './forgotpassnew.component.html',
  styleUrls: ['./forgotpassnew.component.scss']
})
export class ForgotPassNewComponent {
  password: string = '';
  confirmPassword: string = '';
  errorMsg: string = '';

  constructor(private router: Router, private http: HttpClient) {}

  goBack(){
    this.router.navigate(['/forgotpassotp']);
  }

  isStrongPassword(password: string): boolean {
    const minLength = password.length >= 8;
    const hasNumber = /[0-9]/.test(password);
    const hasLetter = /[A-Za-z]/.test(password);
    return minLength && hasNumber && hasLetter;
  }

  resetPassword(){
    if(!this.password || !this.confirmPassword){
      this.errorMsg = 'Please fill all fields';
      return;
    }
    if(this.password !== this.confirmPassword){
      this.errorMsg = 'Passwords do not match';
      return;
    }
    if(!this.isStrongPassword(this.password)){
      this.errorMsg = 'Password must be at least 8 characters with letters and numbers';
      return;
    }

    const email = localStorage.getItem('resetEmail');
    const code = localStorage.getItem('resetCode');

    this.http.post<any>('http://localhost:3000/api/auth/reset-password', {
      email, code, newPassword: this.password
    }).subscribe({
      next: () => {
        alert('Password reset successful!');
        this.router.navigate(['/login']);
      },
      error: (err) => this.errorMsg = err.error.message || 'Reset failed'
    });
  }
}
