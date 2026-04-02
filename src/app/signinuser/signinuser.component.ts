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

signUp(form: any) {
  if (form.invalid) {
    alert('Please fill in all fields!');
    return;
  }

  if (this.user.password !== this.user.confirmPassword) {
    alert('Passwords do not match!');
    return;
  }

  this.router.navigate(['/dashboard']);
}

  cancel() {
    this.router.navigate(['']);
  }

}