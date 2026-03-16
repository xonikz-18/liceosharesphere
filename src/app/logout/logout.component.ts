import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-logout',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './logout.component.html',
  styleUrl: './logout.component.scss'
})
export class LogoutComponent {
  // This sends a signal back to the dashboard to close the popup
  @Output() cancel = new EventEmitter<void>();

  constructor(private router: Router) {}

  onCancel() {
    this.cancel.emit();
  }

  onConfirm() {
    // This takes you back to the login page
    this.router.navigate(['/']);
  }
}