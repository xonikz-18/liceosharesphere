import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-signinuser',
  standalone: true,
  imports: [FormsModule, RouterModule],
  templateUrl: './signinuser.component.html',
  styleUrls: ['./signinuser.component.scss']
})
export class SigninuserComponent {

  constructor(private router: Router) {}

  user = {
    fullname: '',
    email: '',
    sex: '',
    department: '',
    contact: '',
    password: '',
    confirmPassword: ''
  };

  signUp() {
    console.log(this.user);
  }

  cancel() {
    this.router.navigate(['']);
  }

}