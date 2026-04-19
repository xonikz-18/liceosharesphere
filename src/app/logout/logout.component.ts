import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ProfileService } from '../services/profile.service';

@Component({
  selector: 'app-logout',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './logout.component.html',
  styleUrl: './logout.component.scss'
})
export class LogoutComponent {
  @Output() cancel = new EventEmitter<void>();

  constructor(private router: Router, private profileService: ProfileService) {}

  onCancel() {
    this.cancel.emit();
  }

  onConfirm() {
    this.profileService.logout();
    this.router.navigate(['/']);
  }
}