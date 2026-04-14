import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { interval } from 'rxjs';
import { BorrowNotification, BorrowRequest, BorrowRequestService } from '../services/borrow-request.service';
import { ProfileService } from '../services/profile.service';

@Component({
  selector: 'app-notification',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notification.component.html',
  styleUrls: ['./notification.component.scss']
})
export class NotificationComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly borrowRequestService = inject(BorrowRequestService);
  private readonly profileService = inject(ProfileService);

  notifications: BorrowNotification[] = [];
  incomingRequests: BorrowRequest[] = [];
  feedbackMessage = '';
  processingRequestId: number | string | null = null;

  ngOnInit() {
    this.notifications = this.borrowRequestService.syncNotificationsFromCache(this.getCurrentUserId() ?? undefined);

    this.borrowRequestService.notifications$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((notifications) => {
        this.notifications = notifications.filter((notification) => notification.type !== 'incoming-request');
      });

    this.borrowRequestService.incomingRequests$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((requests) => {
        this.incomingRequests = requests;
      });

    this.loadNotifications();
    this.loadIncomingRequests();

    interval(2000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.loadNotifications();
        this.loadIncomingRequests();
      });

    this.borrowRequestService.requestsChanged$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.loadNotifications();
        this.loadIncomingRequests();
      });
  }

  approveIncomingRequest(request: BorrowRequest, event?: Event) {
    event?.stopPropagation();

    this.feedbackMessage = '';
    this.feedbackMessage = 'Borrow request approved.';
    this.borrowRequestService.approveRequest(request.id).subscribe((result) => {
      this.feedbackMessage = result.message;
      this.loadIncomingRequests();
      this.loadNotifications();
    });
    this.borrowRequestService.removeIncomingRequest(request.id);
  }

  declineIncomingRequest(request: BorrowRequest, event?: Event) {
    event?.stopPropagation();

    this.feedbackMessage = '';
    this.feedbackMessage = 'Borrow request declined.';
    this.borrowRequestService.declineRequest(request.id).subscribe((result) => {
      this.feedbackMessage = result.message;
      this.loadIncomingRequests();
      this.loadNotifications();
    });
    this.borrowRequestService.removeIncomingRequest(request.id);
  }

  approve(notification: BorrowNotification, event?: Event){
    event?.stopPropagation();

    if (!this.isIncomingRequest(notification) || this.isProcessing(notification)) {
      return;
    }

    this.feedbackMessage = '';
    this.processingRequestId = notification.requestId;

    this.borrowRequestService.approveRequest(notification.requestId).subscribe((result) => {
      this.feedbackMessage = result.message;
      this.processingRequestId = null;
    });
  }

  decline(notification: BorrowNotification, event?: Event){
    event?.stopPropagation();

    if (!this.isIncomingRequest(notification) || this.isProcessing(notification)) {
      return;
    }

    this.feedbackMessage = '';
    this.processingRequestId = notification.requestId;

    this.borrowRequestService.declineRequest(notification.requestId).subscribe((result) => {
      this.feedbackMessage = result.message;
      this.processingRequestId = null;
    });
  }

  isIncomingRequest(notification: BorrowNotification): boolean {
    return notification.type === 'incoming-request' && notification.status === 'pending';
  }

  isProcessing(notification: BorrowNotification): boolean {
    return this.processingRequestId !== null && String(this.processingRequestId) === String(notification.requestId);
  }

  private loadNotifications() {
    const currentUserId = this.getCurrentUserId();
    this.borrowRequestService.getNotificationsForUser(currentUserId ?? undefined).subscribe((notifications) => {
      this.notifications = notifications.filter((notification) => notification.type !== 'incoming-request');
    });
  }

  private loadIncomingRequests() {
    const currentUserId = this.getCurrentUserId();
    this.borrowRequestService.refreshIncomingRequestsForOwner(currentUserId ?? undefined).subscribe();
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