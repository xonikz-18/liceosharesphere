import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LogoutComponent } from '../logout/logout.component';
import { EditItemComponent } from '../edititem/edititem.component';
import { ProfileEditComponent } from '../profileedit/profileedit.component';
import { ProfileService } from '../services/profile.service';
import { BorrowRequestService } from '../services/borrow-request.service';
import { PostItem, PostService } from '../services/post.service';

@Component({
  selector: 'app-profilelent',
  standalone: true,
  imports: [CommonModule, RouterModule, LogoutComponent, EditItemComponent, ProfileEditComponent],
  templateUrl: './profilelent.component.html',
  styleUrls: ['./profilelent.component.scss']
})
export class ProfileLentComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly profileService = inject(ProfileService);
  private readonly postService = inject(PostService);
  private readonly borrowRequestService = inject(BorrowRequestService);

  showLogoutPopup = false;
  showEditPopup = false;
  showEditProfile = false;

  profile: any; // 🔥 declare only
  lent: PostItem[] = [];
  errorMessage = '';
  deletingPostId: number | string | null = null;
  selectedItem: PostItem | null = null;
  private currentUserId: number | string | undefined;

  ngOnInit(){
    this.currentUserId = this.getCurrentUserId();
    this.profile = this.profileService.getProfileSnapshot();
    this.loadProfile();
    this.lent = this.filterCurrentUserPosts(
      this.borrowRequestService.applyRequestStatusesToPosts(this.postService.getCachedPosts())
    );
    this.loadLentItems();
    this.refreshIncomingRequests();

    this.borrowRequestService.incomingRequests$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.lent = this.filterCurrentUserPosts(
          this.borrowRequestService.applyRequestStatusesToPosts(this.postService.getCachedPosts())
        );
      });

    this.borrowRequestService.requestsChanged$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.lent = this.filterCurrentUserPosts(
          this.borrowRequestService.applyRequestStatusesToPosts(this.postService.getCachedPosts())
        );
      });
  }

  private getCurrentUserId(): number | string | undefined {
    try {
      const currentUser = JSON.parse(sessionStorage.getItem('currentUserSession') || localStorage.getItem('currentUser') || '{}');
      const id = currentUser.id ?? currentUser.userId ?? currentUser.user_id ?? currentUser._id;
      if (id !== undefined && id !== null) {
        return id;
      }

      const snapshot = this.profileService.getProfileSnapshot();
      return snapshot?.id ?? snapshot?.userId ?? snapshot?.user_id ?? snapshot?._id;
    } catch {
      const snapshot = this.profileService.getProfileSnapshot();
      return snapshot?.id ?? snapshot?.userId ?? snapshot?.user_id ?? snapshot?._id;
    }
  }

  private filterCurrentUserPosts(posts: PostItem[]) {
    if (!this.currentUserId) {
      return [];
    }

    return posts.filter((post) => String(post.userId) === String(this.currentUserId));
  }

  loadProfile(){
    this.profileService.getProfile().subscribe({
      next: (res) => {
        this.profile = res;
      },
      error: (err) => {
        console.error('Failed to load profile:', err);
      }
    });
  }

  loadLentItems() {
    this.errorMessage = '';
    const cachedItems = this.filterCurrentUserPosts(
      this.borrowRequestService.applyRequestStatusesToPosts(this.postService.getCachedPosts())
    );
    this.postService.getPosts().subscribe({
      next: (posts) => {
        this.lent = this.filterCurrentUserPosts(this.borrowRequestService.applyRequestStatusesToPosts(posts));
      },
      error: () => {
        this.lent = cachedItems;
        this.errorMessage = '';
      }
    });
  }

  private refreshIncomingRequests() {
    this.borrowRequestService.refreshIncomingRequestsForOwner(this.currentUserId).subscribe(() => {
      this.lent = this.filterCurrentUserPosts(
        this.borrowRequestService.applyRequestStatusesToPosts(this.postService.getCachedPosts())
      );
    });
  }

  hasPendingRequest(item: PostItem): boolean {
    return this.borrowRequestService.hasPendingRequestForPost(item.id, this.currentUserId);
  }

  toggleLogout(){
    this.showLogoutPopup = true;
  }

  handleCancel(){
    this.showLogoutPopup = false;
  }

  openEditProfile(){
    this.showEditProfile = true;
  }

  handleProfilePreview(profilePicture: string) {
    this.profile = {
      ...this.profile,
      profilePicture,
      profile_picture: profilePicture
    };
  }

  closeEditProfile(){
    this.showEditProfile = false;
    this.loadProfile();
  }

  updateProfile(updated: any){
    const previousProfile = { ...this.profile };
    this.profile = this.profileService.applyLocalProfileUpdate({ ...this.profile, ...updated });
    this.showEditProfile = false;

    this.profileService.updateProfile(updated).subscribe({
      next: (res) => {
        this.profile = res;
        this.loadLentItems();
      },
      error: (err) => {
        this.profile = this.profileService.applyLocalProfileUpdate(previousProfile);
        this.showEditProfile = true;
        console.error('Update failed:', err);
      }
    });
  }

  openEdit(item: PostItem, event?: Event) {
    event?.stopPropagation();
    this.selectedItem = { ...item };
    this.showEditPopup = true;
    this.errorMessage = '';
  }

  closeEditItem() {
    this.showEditPopup = false;
    this.selectedItem = null;
  }

  saveEditedItem(updatedItem: PostItem) {
    if (!this.currentUserId) {
      return;
    }

    const previousItems = [...this.lent];
    const optimisticItem = { ...updatedItem, userId: this.currentUserId };

    this.errorMessage = '';
    this.lent = this.lent.map((item) =>
      String(item.id) === String(optimisticItem.id) ? optimisticItem : item
    );
    this.postService.replaceCachedPost(optimisticItem);
    this.closeEditItem();

    this.postService.updatePost(optimisticItem).subscribe({
      next: (savedItem) => {
        const normalizedSavedItem = this.borrowRequestService.applyRequestStatusesToPosts([savedItem])[0];
        this.lent = this.lent.map((item) =>
          String(item.id) === String(normalizedSavedItem.id) ? normalizedSavedItem : item
        );
        this.postService.replaceCachedPost(normalizedSavedItem);
        this.borrowRequestService.notifyBorrowDataChanged();
        this.loadLentItems();
      },
      error: (err) => {
        this.lent = previousItems;
        const previousItem = previousItems.find((item) => String(item.id) === String(optimisticItem.id));
        if (previousItem) {
          this.postService.replaceCachedPost(previousItem);
        }
        this.errorMessage = err.error?.message || 'Failed to update item.';
      }
    });
  }

  deleteItem(item: PostItem, event?: Event) {
    event?.stopPropagation();

    if (!this.currentUserId || this.deletingPostId !== null) {
      return;
    }

    this.deletingPostId = item.id;
    this.errorMessage = '';
    const previousItems = [...this.lent];

    this.lent = this.lent.filter((lentItem) => String(lentItem.id) !== String(item.id));
    this.postService.removeCachedPost(item.id);

    this.postService.deletePost(item.id, this.currentUserId).subscribe({
      next: () => {
        this.deletingPostId = null;
        this.borrowRequestService.notifyBorrowDataChanged();
        this.loadLentItems();
      },
      error: (err) => {
        this.lent = previousItems;
        this.postService.restoreCachedPost(item);
        this.errorMessage = err.error?.message || 'Failed to delete item.';
        this.deletingPostId = null;
      }
    });
  }
}