import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-forgotpassemail',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './forgotpassemail.component.html',
  styleUrls: ['./forgotpassemail.component.scss']
})
export class ForgotPassEmailComponent {
  email: string = '';

  constructor(private router: Router, private http: HttpClient) {}

  goBack(){
    this.router.navigate(['/']); // back to login
  }

  continue(){
    if(!this.email) return;

    this.http.post<any>('http://localhost:3000/api/auth/forgot-password', { email: this.email })
      .subscribe({
        next: (res) => {
          localStorage.setItem('resetEmail', this.email);
          alert('OTP sent: ' + res.code); // for testing
          this.router.navigate(['/forgotpassotp']);
        },
        error: (err) => alert(err.error.message || 'Request failed')
      });
  }
}
