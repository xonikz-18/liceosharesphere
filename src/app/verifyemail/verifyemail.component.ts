import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-verifyemail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './verifyemail.component.html',
  styleUrls: ['./verifyemail.component.scss']
})
export class VerifyemailComponent {

  email: string = '';

  constructor(private router: Router) {}

  continue() {
    if (this.email) {
      this.router.navigate(['/signinuser']);
    } else {
      alert('Please enter your email.');
    }
  }

  back() {
    this.router.navigate(['']);
  }

}