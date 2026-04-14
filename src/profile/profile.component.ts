import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProfileEditComponent } from '../app/profileedit/profileedit.component';
import { ProfileService } from '../app/services/profile.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ProfileEditComponent],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})
export class ProfileComponent implements OnInit {
  profile: any = {
    fullname: '',
    sex: '',
    department: '',
    contact_number: '',
    email: ''
  };
  showEdit = false;
  errorMessage: string = '';
  successMessage: string = '';

  constructor(private profileService: ProfileService) {}

  ngOnInit(): void {
    this.loadProfile(); // ✅ load immediately
  }

  loadProfile() {
    this.profileService.getProfile().subscribe({
      next: (res) => {
        this.profile = res; // ✅ show info right away
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Failed to load profile.';
      }
    });
  }

  openEdit() {
    this.showEdit = true;
  }

  handleProfilePreview(profilePicture: string) {
    this.profile = {
      ...this.profile,
      profilePicture,
      profile_picture: profilePicture
    };
  }

  onProfileSaved(updatedProfile: any) {
    const previousProfile = { ...this.profile };
    this.profile = this.profileService.applyLocalProfileUpdate({ ...this.profile, ...updatedProfile });
    this.successMessage = 'Profile updated successfully!';
    this.errorMessage = '';
    this.showEdit = false;

    this.profileService.updateProfile(updatedProfile).subscribe({
      next: (res) => {
        this.profile = res;
        this.successMessage = 'Profile updated successfully!';
        this.errorMessage = '';
      },
      error: (err) => {
        this.profile = this.profileService.applyLocalProfileUpdate(previousProfile);
        this.showEdit = true;
        this.errorMessage = err.error?.message || 'Failed to update profile.';
        this.successMessage = '';
      }
    });
  }

  onCloseEdit() {
    this.showEdit = false;
    this.loadProfile();
  }
}
