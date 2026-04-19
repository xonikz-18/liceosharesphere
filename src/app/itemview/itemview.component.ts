import { Component, Input, OnChanges, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BorrowRequestService, BorrowRequestStatus } from '../services/borrow-request.service';
import { PostItem, PostService } from '../services/post.service';
import { MessagePanelService } from '../services/message-panel.service';
import { ProfileService } from '../services/profile.service';

@Component({
  selector: 'app-itemview',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './itemview.component.html',
  styleUrls: ['./itemview.component.scss']
})
export class ItemViewComponent implements OnChanges {
  private readonly borrowRequestService = inject(BorrowRequestService);
  private readonly postService = inject(PostService);
  private readonly messagePanelService = inject(MessagePanelService);
  private readonly profileService = inject(ProfileService);

  @Input() item: PostItem | null = null;
  @Output() close = new EventEmitter<void>();

  showFullImage = false;
  showPreview: boolean = false;
  requestMessage = '';
  isOwner = false;
  isSubmittingRequest = false;
  private requestStateOverride: BorrowRequestStatus | null = null;

  ngOnChanges() {
    const currentUserId = this.getCurrentUserId();
    this.isOwner = this.item !== null && currentUserId !== null && String(currentUserId) === String(this.item.userId);
    this.requestStateOverride = this.getCurrentRequestState();
    this.requestMessage = '';
    this.isSubmittingRequest = false;
  }
    openPreview(){
      this.showPreview = true;
    }    
    closePreview(){
      this.showPreview = false;
    }    
      onClose() {
        this.close.emit();
      }

  messageOwner(event?: Event) {
    event?.stopPropagation();

    if (!this.item || this.item.userId === undefined || this.item.userId === null) {
      return;
    }

    this.close.emit();
    this.messagePanelService.openPanel({
      ownerId: this.item.userId,
      ownerName: this.item.owner,
      ownerProfilePicture: this.item.ownerProfilePicture
    });
  }

  requestBorrow(event?: Event) {
    event?.stopPropagation();

    if (!this.item || this.isRequestDisabled || this.isSubmittingRequest) {
      return;
    }

    const requestItem = { ...this.item };
    const previousRequestState = this.requestStateOverride;
    const previousStatus = this.item.status;

    this.item = {
      ...this.item,
      status: 'pending'
    };
    this.postService.replaceCachedPost({ ...this.item });

    this.requestStateOverride = 'pending';
    this.isSubmittingRequest = true;
    this.requestMessage = 'Request pending.';

    this.borrowRequestService.requestBorrow(requestItem).subscribe((result) => {
      this.isSubmittingRequest = false;
      this.requestMessage = result.message;

      if (!this.item) {
        return;
      }
      if (result.ok || result.postStatus === 'pending') {
        this.requestStateOverride = 'pending';
        return;
      }
      this.item = {
        ...this.item,
        status: previousStatus
      };
      this.postService.replaceCachedPost({ ...this.item });
      this.requestStateOverride = previousRequestState;
      if (result.message === 'Your borrow request is already pending.') {
        this.requestStateOverride = 'pending';
      }
    });
  }

  get requestButtonLabel(): string {
    if (this.isOwner) {
      return 'Your Item';
    }

    if (!this.item) {
      return 'Request to Borrow';
    }

    if (this.currentRequestState === 'pending' || this.displayedStatus === 'pending') {
      return 'Request Pending';
    }

    if (this.item.status === 'borrowed') {
      return 'Unavailable';
    }

    if (this.item.status !== 'available') {
      return 'Unavailable';
    }

    return 'Request to Borrow';
  }

  get displayedStatus(): string {
    if (!this.item) {
      return '';
    }

    if (this.currentRequestState === 'pending' && this.item.status === 'available') {
      return 'pending';
    }

    return this.item.status;
  }

  get isRequestDisabled(): boolean {
    if (!this.item) {
      return true;
    }

    if (this.isOwner) {
      return true;
    }

    if (this.currentRequestState === 'pending' || this.displayedStatus === 'pending') {
      return true;
    }

    return this.item.status !== 'available';
  }

  openFullImage(event: Event){
    event.stopPropagation();
    this.showFullImage = true;
  }

  closeFullImage(){
    this.showFullImage = false;
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

  private get currentRequestState(): BorrowRequestStatus | null {
    return this.requestStateOverride ?? this.getCurrentRequestState();
  }

  private getCurrentRequestState(): BorrowRequestStatus | null {
    const currentUserId = this.getCurrentUserId();

    if (!this.item || currentUserId === null) {
      return null;
    }

    return this.borrowRequestService.getRequestStateForPost(this.item.id, currentUserId);
  }
}