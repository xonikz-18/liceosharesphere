import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { toast } from 'ngx-sonner';


@Component({
  selector: 'app-forgotpassemail',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './forgotpassemail.component.html',
  styleUrls: ['./forgotpassemail.component.scss']
})
export class ForgotPassEmailComponent {
  email: string = '';
  errorMessage: string = '';

  constructor(private router: Router, private http: HttpClient) {}
  
  onReset() { 
    if (!this.email) {
      this.errorMessage = 'Please enter your email address.';
      return;
    }
    this.errorMessage = '';
  }

  goBack(){
    this.router.navigate(['/']); 
  }

  continue() {
  if (!this.email) return;

  this.http.post<any>('http://localhost:3000/api/auth/forgot-password', { email: this.email })
    .subscribe({
      next: () => {
        localStorage.setItem('resetEmail', this.email);

        // 👉 Redirect agad
        this.router.navigate(['/forgotpassotp']);

        // 👉 Send OTP in background (no waiting)
        this.http.post<any>('http://localhost:3000/api/otp/send', { email: this.email })
          .subscribe({
            error: () => toast.error('Failed to send OTP')
          });
          toast.success('Code sent successfully') 
      },
      error: (err) => {
        toast.error(err.error.message || 'Request failed');
      }
    });
}
}
