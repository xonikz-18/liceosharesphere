import { Component, ViewChild, ElementRef, AfterViewInit, ChangeDetectorRef} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { toast } from 'ngx-sonner';

@Component({
  selector: 'app-forgotpassotp',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './forgotpassotp.component.html',
  styleUrls: ['./forgotpassotp.component.scss']
})
export class ForgotPassOtpComponent implements AfterViewInit {

  otp: string[] = ['', '', '', '', '', ''];

  @ViewChild('otp0') otp0!: ElementRef;
  @ViewChild('otp1') otp1!: ElementRef;
  @ViewChild('otp2') otp2!: ElementRef;
  @ViewChild('otp3') otp3!: ElementRef;
  @ViewChild('otp4') otp4!: ElementRef;
  @ViewChild('otp5') otp5!: ElementRef;

  inputs: ElementRef[] = [];

  constructor(private router: Router, private http: HttpClient, private cdr: ChangeDetectorRef) {}

  ngAfterViewInit() {
    this.inputs = [
      this.otp0, this.otp1, this.otp2,
      this.otp3, this.otp4, this.otp5
    ];
  }

  goBack() {
    this.router.navigate(['/forgotpassemail']);
  }

  onInput(event: any, index: number) {
    let value = event.target.value.replace(/[^0-9]/g, '');
    value = value.slice(-1); // only 1 digit

    this.otp[index] = value;
    event.target.value = value;

    if (value && index < 5) {
      this.inputs[index + 1].nativeElement.focus();
    }
  }

  onKeyDown(event: any, index: number) {
    if (event.key === 'Backspace') {
      if (this.otp[index]) {
        this.otp[index] = '';
        event.target.value = '';
      } else if (index > 0) {
        this.inputs[index - 1].nativeElement.focus();
        this.otp[index - 1] = '';
        this.inputs[index - 1].nativeElement.value = '';
      }
      event.preventDefault();
    }

    // block letters
    if (!/[0-9]/.test(event.key) && event.key !== 'Backspace' && event.key.length === 1) {
      event.preventDefault();
    }
  }

    verifyOTP() {
  const code = this.otp.join('');

  if (code.length !== 6) {
    alert('Enter complete OTP');
    return;
  }

  const email = localStorage.getItem('resetEmail');

  this.http.post<any>('http://localhost:3000/api/otp/verify', { email, code }).subscribe({
    next: () => {
      localStorage.setItem('resetCode', code);
      this.router.navigate(['/forgotpassnew']);
    },
    error: (err) => {
      if (err.status === 400) {
        alert(err.error.message || 'Invalid or expired code.');
      }
    }
  });
}
}

