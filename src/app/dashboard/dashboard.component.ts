import { Component, DestroyRef, HostListener, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { combineLatest, interval } from 'rxjs';
    

import { LogoutComponent } from '../logout/logout.component';
import { AddComponent } from '../add/add.component';
import { NotificationComponent } from '../notification/notification.component';
import { MessageComponent } from '../message/message.component';
import { ItemViewComponent } from '../itemview/itemview.component';
import { BorrowNotification, BorrowRequestService } from '../services/borrow-request.service';
import { PostItem, PostService } from '../services/post.service';
import { ProfileService } from '../services/profile.service';
import { MessageService } from '../services/message.service';
import { MessagePanelService, MessageTargetOwner } from '../services/message-panel.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    LogoutComponent,
    AddComponent,
    NotificationComponent,
    MessageComponent,
    ItemViewComponent
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly postService = inject(PostService);
  private readonly borrowRequestService = inject(BorrowRequestService);
  private readonly profileService = inject(ProfileService);
  private readonly messageService = inject(MessageService);
  private readonly messagePanelService = inject(MessagePanelService);
  private latestNotifications: BorrowNotification[] = [];
  private latestIncomingRequestsCount = 0;

  showLogoutPopup = false;
  showAddPopup = false;

  showNotifications = false;
  showMessages = false;

  items: PostItem[] = [];
  isLoading = false;
  errorMessage = '';
  searchTerm = '';
  notificationCount = 0;
  messageUnreadCount = 0;
  private currentUserId: number | string | null = null;
  messageTargetOwner: MessageTargetOwner | null = null;
  private cdr = inject(ChangeDetectorRef);
  previewImage: string = '';

  selectedItem: PostItem | null = null;

  ngOnInit() {
    this.currentUserId = this.getCurrentUserId();
    this.messageService.syncUnreadCountFromCache(this.currentUserId ?? undefined);
    const cachedNotifications = this.borrowRequestService.syncNotificationsFromCache(this.currentUserId ?? undefined);
    this.latestNotifications = cachedNotifications;
    this.latestIncomingRequestsCount = this.borrowRequestService.getUnreadIncomingRequestsCountForUser(
      this.currentUserId ?? undefined,
      this.borrowRequestService.getCurrentIncomingRequests()
    );
    this.updateNotificationCount();
    this.refreshMessageUnreadCount();
    this.syncItemsFromCache();

    this.postService.postsChanged$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((posts) => {
        this.items = this.borrowRequestService.applyRequestStatusesToPosts(posts);
        this.syncSelectedItem();
      });

    this.loadPosts();
    this.loadBorrowerRequests();
    this.refreshNotifications();
    this.refreshIncomingRequests();

    this.borrowRequestService.notifications$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((notifications) => {
        this.latestNotifications = notifications;
        this.updateNotificationCount();
      });

    this.borrowRequestService.incomingRequests$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((requests) => {
        this.latestIncomingRequestsCount = this.borrowRequestService.getUnreadIncomingRequestsCountForUser(
          this.currentUserId ?? undefined,
          requests
        );
        this.syncItemsFromCache();
        this.updateNotificationCount();
      });

    interval(2000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.refreshDashboardData();
      });

    this.borrowRequestService.requestsChanged$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.refreshDashboardData();
      });

    this.messageService.unreadCount$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((count) => {
        this.messageUnreadCount = count;
      });

    this.messagePanelService.openWithOwner$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((targetOwner) => {
        this.showNotifications = false;
        this.messageTargetOwner = targetOwner;
        this.showMessages = true;
      });
  }

  private refreshDashboardData() {
    this.loadBorrowerRequests();
    this.syncItemsFromCache();
    this.loadPosts();
    this.refreshNotifications();
    this.refreshIncomingRequests();
    this.refreshMessageUnreadCount();
  }

  private refreshMessageUnreadCount() {
    this.currentUserId = this.getCurrentUserId();
    this.messageService.refreshUnreadCount(this.currentUserId ?? undefined).subscribe();
  }

  loadPosts() {
    this.isLoading = true;
    this.errorMessage = '';
    const cachedItems = this.borrowRequestService.applyRequestStatusesToPosts(this.postService.getCachedPosts());

    if (cachedItems.length > 0) {
      this.items = cachedItems;
    }

    this.postService.getPosts().subscribe({
      next: (posts) => {
        if (posts.length === 0 && cachedItems.length > 0) {
          this.items = cachedItems;
        } else {
          this.items = this.borrowRequestService.applyRequestStatusesToPosts(posts);
        }
        this.isLoading = false;
        this.syncSelectedItem();
        this.cdr.detectChanges();
      },
      error: () => {
        this.items = cachedItems;
        this.errorMessage = '';
        this.isLoading = false;
        this.syncSelectedItem();
        this.cdr.detectChanges();
      }
    });
  }

  get filteredItems(): PostItem[] {
    const normalizedQuery = this.searchTerm.trim().toLowerCase();

    if (!normalizedQuery) {
      return this.items;
    }

    return this.items.filter((item) => {
      const searchableText = [
        item.name,
        item.description,
        item.owner,
        item.status
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return searchableText.includes(normalizedQuery);
    });
  }

  onSearchChange(event: Event) {
    const input = event.target as HTMLInputElement;
    this.searchTerm = input.value;
  }

  hasPendingRequest(item: PostItem): boolean {
    return this.borrowRequestService.hasPendingRequestForPost(item.id, this.currentUserId);
  }

openItem(item: PostItem){
  this.selectedItem = item;
}

closeItem(){
  this.selectedItem = null;
}

  private syncItemsFromCache() {
    this.items = this.borrowRequestService.applyRequestStatusesToPosts(this.postService.syncFromCache());
    this.syncSelectedItem();
    this.cdr.detectChanges();
  }

  private syncSelectedItem() {
    if (!this.selectedItem) {
      return;
    }

    const updatedItem = this.items.find((item) => String(item.id) === String(this.selectedItem?.id));
    if (updatedItem) {
      this.selectedItem = updatedItem;
    }
  }

  private refreshNotifications() {
    this.currentUserId = this.getCurrentUserId();
    this.borrowRequestService.refreshNotificationsForUser(this.currentUserId ?? undefined).subscribe();
  }

  private refreshIncomingRequests() {
    this.currentUserId = this.getCurrentUserId();
    this.borrowRequestService.refreshIncomingRequestsForOwner(this.currentUserId ?? undefined).subscribe(() => {
      this.syncItemsFromCache();
    });
  }

  private updateNotificationCount() {
    this.notificationCount = this.latestIncomingRequestsCount + this.borrowRequestService.getUnreadNotificationCountForUser(
      this.currentUserId ?? undefined,
      this.latestNotifications
    );
  }

  private loadBorrowerRequests() {
    this.currentUserId = this.getCurrentUserId();
    this.borrowRequestService.loadBorrowerRequestsForUser(this.currentUserId ?? undefined).subscribe(() => {
      this.syncItemsFromCache();
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

  toggleLogout(){
    this.showLogoutPopup = true;
  }

  handleCancel(){
    this.showLogoutPopup = false;
  }

  openAddPopup(){
    this.showAddPopup = true;
  }

  closeAddPopup(){
    this.showAddPopup = false;
  }

  handlePost(item: PostItem){
    this.items = this.borrowRequestService.applyRequestStatusesToPosts([
      item,
      ...this.items.filter((existingItem) => String(existingItem.id) !== String(item.id))
    ]);
    this.syncSelectedItem();
    this.showAddPopup = false;
  }

  openPreview(img: string){
    this.previewImage = img;
    this.cdr.detectChanges();
  }

  closePreview(){
    this.previewImage = '';
  }

  toggleNotifications(event: Event){
    event.stopPropagation();
    const openingNotifications = !this.showNotifications;
    this.showNotifications = openingNotifications;

    if (openingNotifications) {
      this.showMessages = false;
      this.messageTargetOwner = null;
    }

    if (openingNotifications) {
      this.borrowRequestService.markNotificationsAsReadForUser(this.currentUserId ?? undefined);
      this.borrowRequestService.markIncomingRequestsAsReadForUser(this.currentUserId ?? undefined);
      this.latestIncomingRequestsCount = 0;
      this.notificationCount = 0;

      combineLatest([
        this.borrowRequestService.refreshNotificationsForUser(this.currentUserId ?? undefined),
        this.borrowRequestService.refreshIncomingRequestsForOwner(this.currentUserId ?? undefined)
      ]).subscribe(([notifications]) => {
        this.latestNotifications = notifications;
        this.borrowRequestService.markNotificationsAsReadForUser(this.currentUserId ?? undefined);
        this.borrowRequestService.markIncomingRequestsAsReadForUser(this.currentUserId ?? undefined);
        this.latestIncomingRequestsCount = 0;
        this.updateNotificationCount();
      });
      return;
    }

    this.refreshNotifications();
    this.refreshIncomingRequests();
  }

  openMessages(event: Event){
    event.stopPropagation();
    this.showNotifications = false;
    this.showMessages = !this.showMessages;

    if (this.showMessages) {
      this.messageTargetOwner = null;
      this.refreshMessageUnreadCount();
    }
  }

  closeMessagePanel() {
    this.showMessages = false;
    this.messageTargetOwner = null;
    this.refreshMessageUnreadCount();
  }

  @HostListener('document:click')
  closeDropdowns(){
    this.showNotifications = false;
    this.showMessages = false;
    this.messageTargetOwner = null;
  }

}