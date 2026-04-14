import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LogoutComponent } from '../logout/logout.component';
import { BorrowRequestService, HistoryEntry } from '../services/borrow-request.service';
import { ProfileService } from '../services/profile.service';

@Component({
  selector: 'app-history',
  imports: [
    CommonModule,
    RouterModule,
    LogoutComponent
  ],
  templateUrl: './history.component.html',
  styleUrl: './history.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HistoryComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly changeDetectorRef = inject(ChangeDetectorRef);
  private readonly borrowRequestService = inject(BorrowRequestService);
  private readonly profileService = inject(ProfileService);

  showLogoutPopup = false;
  history: HistoryEntry[] = [];
  private currentUserId: number | string | null = null;

  ngOnInit() {
    this.currentUserId = this.getCurrentUserId();
    this.loadHistory();

    this.borrowRequestService.requestsChanged$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.loadHistory();
      });
  }

  toggleLogout(){
    this.showLogoutPopup = true;
  }

  handleCancel(){
    this.showLogoutPopup = false;
  }

  private loadHistory() {
    this.borrowRequestService.getHistoryForUser(this.currentUserId ?? undefined).subscribe((history) => {
      this.history = history;
      this.changeDetectorRef.markForCheck();
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