import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LogoutComponent } from '../logout/logout.component';
import { ProfileEditComponent } from '../profileedit/profileedit.component';
import { ProfileService } from '../services/profile.service';
import { ReturnComponent } from '../return/return.component';
import { BorrowedItem, BorrowRequestService } from '../services/borrow-request.service';


@Component({
  selector: 'app-profileborrowed',
  standalone: true,
  imports: [CommonModule, RouterModule, LogoutComponent, ProfileEditComponent, ReturnComponent],
  templateUrl: './profileborrowed.component.html',
  styleUrls: ['./profileborrowed.component.scss']
})
export class ProfileBorrowedComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly profileService = inject(ProfileService);
  private readonly borrowRequestService = inject(BorrowRequestService);

  showLogoutPopup = false;
  showEditProfile = false;
  showReturnPopup = false;
  selectedItem: any = null;

  profile: any = {
    fullname: '',
    sex: '',
    department: '',
    contact_number: '',
    email: ''
  };
  borrowed: BorrowedItem[] = [];
  currentUserId: number | string | null = null;

  ngOnInit() {
    this.currentUserId = this.getCurrentUserId();
    this.profile = {
      ...this.profile,
      ...this.profileService.getProfileSnapshot()
    };
    this.borrowed = this.borrowRequestService.getCachedActiveBorrowedItemsForUser(this.currentUserId ?? undefined);
    this.loadProfile();
    this.loadBorrowedItems();

    this.borrowRequestService.requestsChanged$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.loadBorrowedItems();
      });
  }

  loadProfile() {
    this.profileService.getProfile().subscribe({
      next: (res) => {
        this.profile = res;
      },
      error: (err) => {
        console.error('Failed to load profile:', err);
      }
    });
  }

  toggleLogout() {
    this.showLogoutPopup = true;
  }

  handleCancel() {
    this.showLogoutPopup = false;
  }

  openEditProfile() {
    this.showEditProfile = true;
  }

  handleProfilePreview(profilePicture: string) {
    this.profile = {
      ...this.profile,
      profilePicture,
      profile_picture: profilePicture
    };
  }

  closeEditProfile() {
    this.showEditProfile = false;
    this.loadProfile();
  }

  updateProfile(updated: any) {
    const previousProfile = { ...this.profile };
    this.profile = this.profileService.applyLocalProfileUpdate({ ...this.profile, ...updated });
    this.showEditProfile = false;

    this.profileService.updateProfile(updated).subscribe({
      next: (res) => {
        this.profile = res; // ✅ update instantly
      },
      error: (err) => {
        this.profile = this.profileService.applyLocalProfileUpdate(previousProfile);
        this.showEditProfile = true;
        console.error('Update failed:', err);
      }
    });
  }

  openReturn(item: any) {
    this.selectedItem = item;
    this.showReturnPopup = true;
  }

  closeReturn() {
    this.showReturnPopup = false;
  }

  private loadBorrowedItems() {
    this.borrowRequestService.getActiveBorrowedItemsForUser(this.currentUserId ?? undefined).subscribe((items) => {
      this.borrowed = items;
    });
  }

  private getCurrentUserId(): number | string | null {
    try {
      const currentUser = JSON.parse(sessionStorage.getItem('currentUserSession') || localStorage.getItem('currentUser') || '{}');
      const id = currentUser.id ?? currentUser.userId ?? currentUser.user_id ?? currentUser._id;
      if (id !== undefined && id !== null) {
        return id;
      }

      const snapshot = this.profileService.getProfileSnapshot();
      return snapshot?.id ?? snapshot?.userId ?? snapshot?.user_id ?? snapshot?._id ?? null;
    } catch {
      const snapshot = this.profileService.getProfileSnapshot();
      return snapshot?.id ?? snapshot?.userId ?? snapshot?.user_id ?? snapshot?._id ?? null;
    }
  }
}
