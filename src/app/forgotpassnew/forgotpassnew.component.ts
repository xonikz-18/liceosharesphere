import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

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

  constructor(private router: Router) {}

  goBack(){
    this.router.navigate(['/forgotpassotp']);
  }

  // 🔥 password strength checker
  isStrongPassword(password: string): boolean {
    const minLength = password.length >= 8;
    const hasNumber = /[0-9]/.test(password);
    const hasLetter = /[A-Za-z]/.test(password);

    return minLength && hasNumber && hasLetter;
  }

  resetPassword(){

    // ❌ empty
    if(!this.password || !this.confirmPassword){
      this.errorMsg = 'Please fill all fields';
      return;
    }

    // ❌ mismatch
    if(this.password !== this.confirmPassword){
      this.errorMsg = 'Passwords do not match';
      return;
    }

    // ❌ weak password
    if(!this.isStrongPassword(this.password)){
      this.errorMsg = 'Password must be at least 8 characters with letters and numbers';
      return;
    }

    this.errorMsg = '';

    console.log('New Password:', this.password);

    // 🔥 BACKEND READY
    // this.authService.resetPassword(email, password)

    // ✅ redirect after success
    this.router.navigate(['/dashboard']);
  }

}