import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-forgotpassemail',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './forgotpassemail.component.html',
  styleUrls: ['./forgotpassemail.component.scss']
})
export class ForgotPassEmailComponent {

  email: string = '';

  constructor(private router: Router) {}

  goBack(){
    this.router.navigate(['/']); // 🔥 back to login
  }

  continue(){
    if(!this.email) return;

    // 👉 later: send email to backend
    this.router.navigate(['/forgotpassotp']); // next step
  }

}