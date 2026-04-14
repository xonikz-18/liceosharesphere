import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, catchError, combineLatest, concat, map, of, tap } from 'rxjs';
import { PostItem, PostService } from './post.service';

export type BorrowRequestStatus = 'pending' | 'approved' | 'declined';

interface CurrentUser {
  id: number | string;
  fullname: string;
  profilePicture?: string;
}

export interface BorrowRequest {
  id: number | string;
  postId: number | string;
  postName: string;
  postImage: string;
  ownerId: number | string;
  ownerName: string;
  ownerProfilePicture?: string;
  borrowerId: number | string;
  borrowerName: string;
  borrowerProfilePicture?: string;
  requestedAt: string;
  updatedAt: string;
  status: BorrowRequestStatus;
}

export interface BorrowNotification {
  id: number | string;
  requestId: number | string;
  postId?: number | string;
  type: 'incoming-request' | 'request-approved' | 'request-declined';
  actorName: string;
  actorProfilePicture?: string;
  itemName: string;
  status: BorrowRequestStatus;
  createdAt: string;
  message: string;
}

export interface BorrowedItem {
  requestId: number | string;
  postId: number | string;
  name: string;
  image: string;
  owner: string;
  ownerProfilePicture?: string;
  requestedAt: string;
  approvedAt: string;
  approvedAtValue: string;
  status: 'borrowed';
}

export interface LentItem {
  requestId: number | string;
  postId: number | string;
  name: string;
  image: string;
  borrower: string;
  borrowerProfilePicture?: string;
  requestedAt: string;
  approvedAt: string;
  approvedAtValue: string;
  status: 'lent';
}

export interface HistoryEntry {
  requestId: number | string;
  postId: number | string;
  type: 'borrowed' | 'lent';
  item: string;
  person: string;
  date: string;
  dateValue: string;
}

export interface BorrowRequestResult {
  ok: boolean;
  message: string;
  postStatus?: string;
}

@Injectable({
  providedIn: 'root'
})
export class BorrowRequestService {
  private readonly http = inject(HttpClient);
  private readonly postService = inject(PostService);
  private readonly apiUrl = 'http://localhost:3000/auth/borrow-requests';
  private readonly notificationsStoragePrefix = 'borrowNotifications:';
  private readonly notificationsReadStoragePrefix = 'borrowNotificationsRead:';
  private readonly incomingRequestsReadStoragePrefix = 'incomingRequestsRead:';
  private readonly borrowedItemsStoragePrefix = 'borrowedItems:';
  private readonly lentItemsStoragePrefix = 'lentItems:';
  private readonly requestsChangedSubject = new BehaviorSubject<number>(0);
  private readonly notificationsSubject = new BehaviorSubject<BorrowNotification[]>([]);
  private readonly incomingRequestsSubject = new BehaviorSubject<BorrowRequest[]>([]);
  private currentBorrowerRequests: BorrowRequest[] = [];

  readonly requestsChanged$ = this.requestsChangedSubject.asObservable();
  readonly notifications$ = this.notificationsSubject.asObservable();
  readonly incomingRequests$ = this.incomingRequestsSubject.asObservable();

  resetSessionState() {
    this.currentBorrowerRequests = [];
    this.notificationsSubject.next([]);
    this.incomingRequestsSubject.next([]);
    this.requestsChangedSubject.next(Date.now());
  }

  syncNotificationsFromCache(userId?: number | string): BorrowNotification[] {
    const inMemoryNotifications = this.notificationsSubject.value;
    if (inMemoryNotifications.length > 0) {
      return inMemoryNotifications;
    }

    const cachedNotifications = this.getCachedNotificationsForUser(userId);
    this.notificationsSubject.next(cachedNotifications);
    return cachedNotifications;
  }

  getCachedNotificationsForUser(userId?: number | string): BorrowNotification[] {
    if (userId === undefined || userId === null) {
      return [];
    }

    try {
      const stored = localStorage.getItem(`${this.notificationsStoragePrefix}${userId}`);

      if (!stored) {
        return [];
      }

      const parsed = JSON.parse(stored);
      if (!Array.isArray(parsed)) {
        return [];
      }

      const notifications = this.sanitizeNotifications(
        parsed.map((notification) => this.normalizeNotification(notification)).filter(Boolean) as BorrowNotification[]
      );

      this.persistNotifications(userId, notifications);
      return notifications;
    } catch {
      return [];
    }
  }

  getUnreadNotificationCountForUser(userId?: number | string, notifications?: BorrowNotification[]): number {
    if (userId === undefined || userId === null) {
      return 0;
    }

    const activeNotifications = notifications ?? this.getCachedNotificationsForUser(userId);
    const readIds = this.getReadNotificationIds(userId);
    return activeNotifications.filter((notification) => !readIds.has(String(notification.id))).length;
  }

  markNotificationsAsReadForUser(userId?: number | string) {
    if (userId === undefined || userId === null) {
      return;
    }

    const existingReadIds = this.getReadNotificationIds(userId);
    const notificationIds = this.notificationsSubject.value.map((notification) => String(notification.id));
    this.persistReadNotificationIds(userId, new Set([...existingReadIds, ...notificationIds]));
  }

  getUnreadIncomingRequestsCountForUser(userId?: number | string, requests: BorrowRequest[] = this.incomingRequestsSubject.value): number {
    if (userId === undefined || userId === null) {
      return 0;
    }

    const readIds = this.getReadIncomingRequestIds(userId);
    return requests.filter((request) => !readIds.has(String(request.id))).length;
  }

  markIncomingRequestsAsReadForUser(userId?: number | string) {
    if (userId === undefined || userId === null) {
      return;
    }

    const existingReadIds = this.getReadIncomingRequestIds(userId);
    const requestIds = this.incomingRequestsSubject.value.map((request) => String(request.id));
    this.persistReadIncomingRequestIds(userId, new Set([...existingReadIds, ...requestIds]));
  }

  getCachedBorrowedItemsForUser(userId?: number | string): BorrowedItem[] {
    if (userId === undefined || userId === null) {
      return [];
    }

    try {
      const stored = localStorage.getItem(`${this.borrowedItemsStoragePrefix}${userId}`);

      if (!stored) {
        return [];
      }

      const parsed = JSON.parse(stored);
      if (!Array.isArray(parsed)) {
        return [];
      }

      const items = this.dedupeBorrowedItemsByRequest(
        parsed.map((item) => this.normalizeBorrowedItem(item)).filter(Boolean) as BorrowedItem[]
      );

      this.persistBorrowedItems(userId, items);
      return items;
    } catch {
      return [];
    }
  }

  getCachedLentItemsForUser(userId?: number | string): LentItem[] {
    if (userId === undefined || userId === null) {
      return [];
    }

    try {
      const stored = localStorage.getItem(`${this.lentItemsStoragePrefix}${userId}`);

      if (!stored) {
        return [];
      }

      const parsed = JSON.parse(stored);
      if (!Array.isArray(parsed)) {
        return [];
      }

      const items = this.dedupeLentItemsByRequest(
        parsed.map((item) => this.normalizeLentItem(item)).filter(Boolean) as LentItem[]
      );

      this.persistLentItems(userId, items);
      return items;
    } catch {
      return [];
    }
  }

  requestBorrow(post: PostItem): Observable<BorrowRequestResult> {
    const currentUser = this.getCurrentUser();

    if (!currentUser) {
      return of({ ok: false, message: 'Please log in first.' });
    }

    if (String(post.userId) === String(currentUser.id)) {
      return of({ ok: false, message: 'You cannot borrow your own item.' });
    }

    const requestState = this.getRequestStateForPost(post.id, currentUser.id);
    if (requestState === 'pending') {
      return of({ ok: false, message: 'Your borrow request is already pending.' });
    }

    if (post.status !== 'available' && post.status !== 'pending') {
      return of({ ok: false, message: 'This item is not available right now.' });
    }

    return this.http.post<unknown>(this.apiUrl, {
      postId: post.id,
      ownerId: post.userId,
      borrowerId: currentUser.id
    }).pipe(
      map((response) => this.asRecord(response)),
      tap((response) => {
        const postRecord = this.asRecord(response['post']);
        const postId = postRecord['id'];
        const status = postRecord['status'];

        if (postId !== undefined && typeof status === 'string') {
          this.updateCachedPostStatus(postId as number | string, status);
        }
      }),
      map((response) => this.normalizeBorrowRequest(response['request'])),
      tap((request) => {
        if (!request) {
          return;
        }

        this.currentBorrowerRequests = [
          request,
          ...this.currentBorrowerRequests.filter((entry) => String(entry.id) !== String(request.id))
        ];
        this.requestsChangedSubject.next(Date.now());
      }),
      map((request) => request
        ? { ok: true, message: 'Borrow request sent to the owner.', postStatus: 'pending' }
        : { ok: false, message: 'Failed to send borrow request.' }
      ),
      catchError((error) => {
        const message = this.extractErrorMessage(error, 'Failed to send borrow request.');
        const shouldKeepPendingState = message === 'Your borrow request is already pending.';

        return of({
          ok: false,
          message,
          postStatus: shouldKeepPendingState ? 'pending' : undefined
        });
      })
    );
  }

  approveRequest(requestId: number | string): Observable<{ ok: boolean; message: string }> {
    const currentUserId = this.getCurrentUserId();

    if (currentUserId === null) {
      return of({ ok: false, message: 'Please log in first.' });
    }

    const matchingIncomingRequest = this.incomingRequestsSubject.value.find(
      (request) => String(request.id) === String(requestId)
    );
    const optimisticApprovedPostId = matchingIncomingRequest?.postId;

    this.updateNotificationStatus(requestId, 'approved');

    if (optimisticApprovedPostId !== undefined) {
      this.updateCachedPostStatus(optimisticApprovedPostId, 'borrowed');
      this.requestsChangedSubject.next(Date.now());
    }

    return this.http.patch<unknown>(`${this.apiUrl}/${requestId}/approve`, {
      ownerId: currentUserId
    }).pipe(
      map((response) => this.asRecord(response)),
      tap((response) => {
        const post = this.asRecord(response['post']);
        const postId = post['id'];
        const status = post['status'];

        if (postId !== undefined && typeof status === 'string') {
          this.updateCachedPostStatus(postId as number | string, status);
        }

        this.requestsChangedSubject.next(Date.now());
      }),
      map(() => ({ ok: true, message: 'Borrow request approved.' })),
      catchError((error) => {
        this.refreshNotificationsForUser(currentUserId).subscribe();
        return of({
          ok: false,
          message: error?.error?.message || 'Failed to approve borrow request.'
        });
      })
    );
  }

  declineRequest(requestId: number | string): Observable<{ ok: boolean; message: string }> {
    const currentUserId = this.getCurrentUserId();

    if (currentUserId === null) {
      return of({ ok: false, message: 'Please log in first.' });
    }

    const matchingNotification = this.notificationsSubject.value.find(
      (notification) => String(notification.requestId) === String(requestId)
    );
    const matchingIncomingRequest = this.incomingRequestsSubject.value.find(
      (request) => String(request.id) === String(requestId)
    );
    const optimisticPostId = matchingIncomingRequest?.postId ?? matchingNotification?.postId;
    const previousPost = optimisticPostId === undefined
      ? null
      : this.postService.getCachedPosts().find((post) => String(post.id) === String(optimisticPostId)) ?? null;

    this.updateNotificationStatus(requestId, 'declined');

    if (optimisticPostId !== undefined) {
      this.updateCachedPostStatus(optimisticPostId, 'available');
      this.requestsChangedSubject.next(Date.now());
    }

    return this.http.patch<unknown>(`${this.apiUrl}/${requestId}/decline`, {
      ownerId: currentUserId
    }).pipe(
      map((response) => this.asRecord(response)),
      tap((response) => {
        const post = this.asRecord(response['post']);
        const postId = post['id'];
        const status = post['status'];

        if (postId !== undefined && typeof status === 'string') {
          this.updateCachedPostStatus(postId as number | string, status);
        }

        this.requestsChangedSubject.next(Date.now());
      }),
      map(() => ({ ok: true, message: 'Borrow request declined.' })),
      catchError((error) => {
        if (previousPost) {
          this.postService.replaceCachedPost(previousPost);
          this.requestsChangedSubject.next(Date.now());
        }

        this.refreshNotificationsForUser(currentUserId).subscribe();
        return of({
          ok: false,
          message: error?.error?.message || 'Failed to decline borrow request.'
        });
      })
    );
  }

  loadBorrowerRequestsForUser(borrowerId?: number | string): Observable<BorrowRequest[]> {
    if (borrowerId === undefined || borrowerId === null) {
      return of(this.currentBorrowerRequests);
    }

    return this.http.get<unknown>(`${this.apiUrl}/mine`, {
      params: { borrowerId: String(borrowerId) }
    }).pipe(
      map((response) => this.asRecord(response)),
      map((response) => this.asArray(response['requests']).map((request) => this.normalizeBorrowRequest(request)).filter(Boolean) as BorrowRequest[]),
      tap((requests) => {
        this.currentBorrowerRequests = requests;
      }),
      catchError(() => {
        this.currentBorrowerRequests = [];
        return of([]);
      })
    );
  }

  getIncomingRequestsForOwner(ownerId?: number | string): Observable<BorrowRequest[]> {
    if (ownerId === undefined || ownerId === null) {
      return of(this.incomingRequestsSubject.value);
    }

    return this.http.get<unknown>(`${this.apiUrl}/incoming`, {
      params: { ownerId: String(ownerId) }
    }).pipe(
      map((response) => this.asRecord(response)),
      map((response) => this.asArray(response['requests']).map((request) => this.normalizeBorrowRequest(request)).filter(Boolean) as BorrowRequest[]),
      tap((requests) => {
        this.incomingRequestsSubject.next(requests);
      }),
      catchError(() => {
        this.incomingRequestsSubject.next([]);
        return of([]);
      })
    );
  }

  refreshIncomingRequestsForOwner(ownerId?: number | string): Observable<BorrowRequest[]> {
    return this.getIncomingRequestsForOwner(ownerId);
  }

  hasPendingRequestForPost(postId: number | string, userId?: number | string | null): boolean {
    if (userId === undefined || userId === null) {
      return false;
    }

    const normalizedPostId = String(postId);
    const normalizedUserId = String(userId);

    const hasIncomingOwnerRequest = this.incomingRequestsSubject.value.some((request) =>
      String(request.postId) === normalizedPostId
      && String(request.ownerId) === normalizedUserId
      && request.status === 'pending'
    );

    if (hasIncomingOwnerRequest) {
      return true;
    }

    return this.currentBorrowerRequests.some((request) =>
      String(request.postId) === normalizedPostId
      && String(request.borrowerId) === normalizedUserId
      && request.status === 'pending'
    );
  }

  getRequestStateForPost(postId: number | string, borrowerId?: number | string): BorrowRequestStatus | null {
    if (borrowerId === undefined || borrowerId === null) {
      return null;
    }

    const matchingRequests = this.currentBorrowerRequests.filter((request) =>
      String(request.postId) === String(postId) && String(request.borrowerId) === String(borrowerId)
    );

    if (!matchingRequests.length) {
      return null;
    }

    const prioritizedRequest = matchingRequests.sort((left, right) =>
      new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
    )[0];

    return prioritizedRequest.status;
  }

  getNotificationsForUser(userId?: number | string): Observable<BorrowNotification[]> {
    if (userId === undefined || userId === null) {
      return of(this.notificationsSubject.value);
    }

    const inMemoryNotifications = this.notificationsSubject.value;
    if (!inMemoryNotifications.length) {
      const cachedNotifications = this.getCachedNotificationsForUser(userId);
      this.notificationsSubject.next(cachedNotifications);
    }

    return this.http.get<unknown>(`${this.apiUrl}/notifications`, {
      params: { userId: String(userId) }
    }).pipe(
      map((response) => this.asRecord(response)),
      map((response) => this.sanitizeNotifications(
        this.asArray(response['notifications'])
          .map((notification) => this.normalizeNotification(notification))
          .filter((notification): notification is BorrowNotification => notification !== null)
          .filter((notification) => notification.type !== 'incoming-request') as BorrowNotification[]
      )),
      tap((notifications) => {
        const mergedNotifications = this.mergeNotificationsWithExisting(
          notifications,
          this.notificationsSubject.value
        );
        this.persistNotifications(userId, mergedNotifications);
        this.notificationsSubject.next(mergedNotifications);
      }),
      catchError(() => {
        const currentInMemoryNotifications = this.notificationsSubject.value;
        const fallbackNotifications = currentInMemoryNotifications.length > 0
          ? currentInMemoryNotifications
          : this.getCachedNotificationsForUser(userId);
        this.notificationsSubject.next(fallbackNotifications);
        return of(fallbackNotifications);
      })
    );
  }

  refreshNotificationsForUser(userId?: number | string): Observable<BorrowNotification[]> {
    return this.getNotificationsForUser(userId);
  }

  removeIncomingRequest(requestId: number | string) {
    this.incomingRequestsSubject.next(
      this.incomingRequestsSubject.value.filter((request) => String(request.id) !== String(requestId))
    );
  }

  getCurrentIncomingRequests(): BorrowRequest[] {
    return [...this.incomingRequestsSubject.value];
  }

  getBorrowedItemsForUser(userId?: number | string): Observable<BorrowedItem[]> {
    if (userId === undefined || userId === null) {
      return of([]);
    }

    const cachedItems = this.getCachedBorrowedItemsForUser(userId);
    const request$ = this.http.get<unknown>(`${this.apiUrl}/borrowed`, {
      params: { userId: String(userId) }
    }).pipe(
      map((response) => this.asRecord(response)),
      map((response) => this.dedupeBorrowedItemsByRequest(this.asArray(response['items']).map((item) => this.normalizeBorrowedItem(item)).filter(Boolean) as BorrowedItem[])),
      tap((items) => {
        this.persistBorrowedItems(userId, items);
      }),
      catchError(() => of(cachedItems))
    );

    if (cachedItems.length) {
      return concat(of(cachedItems), request$);
    }

    return request$;
  }

  getCachedActiveBorrowedItemsForUser(userId?: number | string): BorrowedItem[] {
    return this.getLatestActiveBorrowedItems(this.filterActiveBorrowedItems(this.getCachedBorrowedItemsForUser(userId)));
  }

  getActiveBorrowedItemsForUser(userId?: number | string): Observable<BorrowedItem[]> {
    if (userId === undefined || userId === null) {
      return of([]);
    }

    const cachedPosts = this.postService.getCachedPosts();
    const postsRequest$ = this.postService.getPosts().pipe(
      catchError(() => of(cachedPosts))
    );
    const posts$ = cachedPosts.length ? concat(of(cachedPosts), postsRequest$) : postsRequest$;

    return combineLatest([
      this.getBorrowedItemsForUser(userId),
      posts$
    ]).pipe(
      map(([items, posts]) => this.getLatestActiveBorrowedItems(this.filterActiveBorrowedItems(items, posts)))
    );
  }

  getLentItemsForUser(userId?: number | string): Observable<LentItem[]> {
    if (userId === undefined || userId === null) {
      return of([]);
    }

    const cachedItems = this.getCachedLentItemsForUser(userId);
    const request$ = this.http.get<unknown>(`${this.apiUrl}/lent`, {
      params: { userId: String(userId) }
    }).pipe(
      map((response) => this.asRecord(response)),
      map((response) => this.dedupeLentItemsByRequest(this.asArray(response['items']).map((item) => this.normalizeLentItem(item)).filter(Boolean) as LentItem[])),
      tap((items) => {
        this.persistLentItems(userId, items);
      }),
      catchError(() => of(cachedItems))
    );

    return concat(of(cachedItems), request$);
  }

  getHistoryForUser(userId?: number | string): Observable<HistoryEntry[]> {
    if (userId === undefined || userId === null) {
      return of([]);
    }

    return combineLatest([
      this.getBorrowedItemsForUser(userId),
      this.getLentItemsForUser(userId)
    ]).pipe(
      map(([borrowedItems, lentItems]) => {
        const borrowedHistory = this.dedupeBorrowedItemsByRequest(borrowedItems).map((item) => ({
          requestId: item.requestId,
          postId: item.postId,
          type: 'borrowed' as const,
          item: item.name,
          person: item.owner,
          date: item.approvedAt,
          dateValue: item.approvedAtValue
        }));

        const lentHistory = this.dedupeLentItemsByRequest(lentItems).map((item) => ({
          requestId: item.requestId,
          postId: item.postId,
          type: 'lent' as const,
          item: item.name,
          person: item.borrower,
          date: item.approvedAt,
          dateValue: item.approvedAtValue
        }));

        return [...borrowedHistory, ...lentHistory].sort((left, right) => {
          const timestampDifference = this.toTimestamp(right.dateValue) - this.toTimestamp(left.dateValue);

          if (timestampDifference !== 0) {
            return timestampDifference;
          }

          return String(right.requestId).localeCompare(String(left.requestId));
        });
      })
    );
  }

  applyRequestStatusesToPosts(posts: PostItem[]): PostItem[] {
    const currentUserId = this.getCurrentUserId();

    return posts.map((post) => {
      const normalizedPost = { ...post };

      if (
        currentUserId !== null
        && normalizedPost.status === 'available'
        && this.hasPendingRequestForPost(normalizedPost.id, currentUserId)
      ) {
        normalizedPost.status = 'pending';
      }

      return normalizedPost;
    });
  }

  notifyBorrowDataChanged() {
    this.requestsChangedSubject.next(Date.now());
  }

  private updateCachedPostStatus(postId: number | string, status: string) {
    const post = this.postService.getCachedPosts().find((entry) => String(entry.id) === String(postId));

    if (!post) {
      return;
    }

    this.postService.replaceCachedPost({
      ...post,
      status
    });
  }

  private updateNotificationStatus(requestId: number | string, status: BorrowRequestStatus) {
    const notifications = this.sanitizeNotifications(this.notificationsSubject.value.map((notification) => {
      if (String(notification.requestId) !== String(requestId)) {
        return notification;
      }

      return {
        ...notification,
        status
      };
    }));

    this.notificationsSubject.next(notifications);

    const currentUserId = this.getCurrentUserId();
    if (currentUserId !== null) {
      this.persistNotifications(currentUserId, notifications);
    }
  }

  private persistNotifications(userId: number | string, notifications: BorrowNotification[]) {
    try {
      localStorage.setItem(`${this.notificationsStoragePrefix}${userId}`, JSON.stringify(this.sanitizeNotifications(notifications)));
    } catch {
      // Ignore storage write failures and keep the in-memory list current.
    }
  }

  private sanitizeNotifications(notifications: BorrowNotification[]): BorrowNotification[] {
    const latestNotifications = new Map<string, BorrowNotification>();

    for (const notification of notifications) {
      if (notification.type === 'incoming-request' && notification.status !== 'pending') {
        continue;
      }

      const key = notification.type === 'incoming-request'
        ? `incoming:${String(notification.requestId)}`
        : String(notification.id);
      const existingNotification = latestNotifications.get(key);

      if (!existingNotification || this.compareHistoryOrder(notification.createdAt, notification.id, existingNotification.createdAt, existingNotification.id) < 0) {
        latestNotifications.set(key, notification);
      }
    }

    return [...latestNotifications.values()].sort((left, right) =>
      this.compareHistoryOrder(left.createdAt, left.id, right.createdAt, right.id)
    );
  }

  private mergeNotificationsWithExisting(
    incomingNotifications: BorrowNotification[],
    existingNotifications: BorrowNotification[]
  ): BorrowNotification[] {
    const existingById = new Map(existingNotifications.map((notification) => [String(notification.id), notification]));

    return incomingNotifications.map((notification) => {
      const existingNotification = existingById.get(String(notification.id));

      if (notification.actorProfilePicture || !existingNotification?.actorProfilePicture) {
        return notification;
      }

      return {
        ...notification,
        actorProfilePicture: existingNotification.actorProfilePicture
      };
    });
  }

  private getReadNotificationIds(userId: number | string): Set<string> {
    try {
      const stored = localStorage.getItem(`${this.notificationsReadStoragePrefix}${userId}`);

      if (!stored) {
        return new Set<string>();
      }

      const parsed = JSON.parse(stored);
      return Array.isArray(parsed)
        ? new Set(parsed.map((entry) => String(entry)))
        : new Set<string>();
    } catch {
      return new Set<string>();
    }
  }

  private getReadIncomingRequestIds(userId: number | string): Set<string> {
    try {
      const stored = localStorage.getItem(`${this.incomingRequestsReadStoragePrefix}${userId}`);

      if (!stored) {
        return new Set<string>();
      }

      const parsed = JSON.parse(stored);
      return Array.isArray(parsed)
        ? new Set(parsed.map((entry) => String(entry)))
        : new Set<string>();
    } catch {
      return new Set<string>();
    }
  }

  private persistReadNotificationIds(userId: number | string, ids: Set<string>) {
    try {
      localStorage.setItem(`${this.notificationsReadStoragePrefix}${userId}`, JSON.stringify([...ids]));
    } catch {
      // Ignore storage write failures and keep runtime state working.
    }
  }

  private persistReadIncomingRequestIds(userId: number | string, ids: Set<string>) {
    try {
      localStorage.setItem(`${this.incomingRequestsReadStoragePrefix}${userId}`, JSON.stringify([...ids]));
    } catch {
      // Ignore storage write failures and keep runtime state working.
    }
  }

  private persistBorrowedItems(userId: number | string, items: BorrowedItem[]) {
    try {
      localStorage.setItem(`${this.borrowedItemsStoragePrefix}${userId}`, JSON.stringify(this.dedupeBorrowedItemsByRequest(items)));
    } catch {
      // Ignore storage write failures and keep the next fetch authoritative.
    }
  }

  private filterActiveBorrowedItems(items: BorrowedItem[], posts: PostItem[] = this.postService.getCachedPosts()): BorrowedItem[] {
    const cachedPosts = posts;

    if (!cachedPosts.length) {
      return items;
    }

    return items.filter((item) => {
      const matchingPost = cachedPosts.find((post) => String(post.id) === String(item.postId));

      if (!matchingPost) {
        return true;
      }

      return matchingPost.status === 'borrowed';
    });
  }

  private getLatestActiveBorrowedItems(items: BorrowedItem[]): BorrowedItem[] {
    const latestItemsByPost = new Map<string, BorrowedItem>();

    for (const item of items) {
      const key = String(item.postId);
      const existingItem = latestItemsByPost.get(key);

      if (!existingItem || this.compareHistoryOrder(item.approvedAtValue, item.requestId, existingItem.approvedAtValue, existingItem.requestId) < 0) {
        latestItemsByPost.set(key, item);
      }
    }

    return [...latestItemsByPost.values()].sort((left, right) =>
      this.compareHistoryOrder(left.approvedAtValue, left.requestId, right.approvedAtValue, right.requestId)
    );
  }

  private dedupeBorrowedItemsByRequest(items: BorrowedItem[]): BorrowedItem[] {
    return this.dedupeByLatestRequest(items, (item) => item.approvedAtValue).sort((left, right) =>
      this.compareHistoryOrder(left.approvedAtValue, left.requestId, right.approvedAtValue, right.requestId)
    );
  }

  private dedupeLentItemsByRequest(items: LentItem[]): LentItem[] {
    return this.dedupeByLatestRequest(items, (item) => item.approvedAtValue).sort((left, right) =>
      this.compareHistoryOrder(left.approvedAtValue, left.requestId, right.approvedAtValue, right.requestId)
    );
  }

  private dedupeByLatestRequest<T extends { requestId: number | string }>(
    items: T[],
    getDateValue: (item: T) => string
  ): T[] {
    const uniqueItems = new Map<string, T>();

    for (const item of items) {
      const key = String(item.requestId);
      const existingItem = uniqueItems.get(key);

      if (!existingItem) {
        uniqueItems.set(key, item);
        continue;
      }

      if (this.compareHistoryOrder(getDateValue(item), item.requestId, getDateValue(existingItem), existingItem.requestId) < 0) {
        uniqueItems.set(key, item);
      }
    }

    return [...uniqueItems.values()];
  }

  private compareHistoryOrder(leftDateValue: string, leftRequestId: number | string, rightDateValue: string, rightRequestId: number | string): number {
    const timestampDifference = this.toTimestamp(rightDateValue) - this.toTimestamp(leftDateValue);

    if (timestampDifference !== 0) {
      return timestampDifference;
    }

    return String(rightRequestId).localeCompare(String(leftRequestId));
  }

  private persistLentItems(userId: number | string, items: LentItem[]) {
    try {
      localStorage.setItem(`${this.lentItemsStoragePrefix}${userId}`, JSON.stringify(this.dedupeLentItemsByRequest(items)));
    } catch {
      // Ignore storage write failures and keep the next fetch authoritative.
    }
  }

  private getCurrentUser(): CurrentUser | null {
    try {
      const sessionUser = sessionStorage.getItem('currentUserSession');
      const storedUser = sessionUser || localStorage.getItem('currentUser') || '{}';
      const currentUser = JSON.parse(storedUser);
      const id = currentUser.id ?? currentUser.userId ?? currentUser.user_id ?? currentUser._id;

      if (id === undefined || id === null) {
        return null;
      }

      return {
        id,
        fullname: currentUser.fullname ?? currentUser.name ?? 'User',
        profilePicture: currentUser.profilePicture ?? currentUser.profile_picture ?? currentUser.imageUrl ?? ''
      };
    } catch {
      return null;
    }
  }

  private getCurrentUserId(): number | string | null {
    return this.getCurrentUser()?.id ?? null;
  }

  private extractErrorMessage(error: unknown, fallbackMessage: string): string {
    const record = this.asRecord(error);
    const errorPayload = this.asRecord(record['error']);
    const directMessage = record['message'];
    const nestedMessage = errorPayload['message'];

    if (typeof nestedMessage === 'string' && nestedMessage.trim()) {
      return nestedMessage;
    }

    if (typeof directMessage === 'string' && directMessage.trim()) {
      return directMessage;
    }

    if (typeof record['statusText'] === 'string' && record['statusText'].trim()) {
      return String(record['statusText']);
    }

    return fallbackMessage;
  }

  private normalizeBorrowRequest(value: unknown): BorrowRequest | null {
    const source = this.asRecord(value);
    const id = source['id'];
    const postId = source['postId'] ?? source['post_id'];
    const ownerId = source['ownerId'] ?? source['owner_id'];
    const borrowerId = source['borrowerId'] ?? source['borrower_id'];
    const status = source['status'];

    if (id === undefined || postId === undefined || ownerId === undefined || borrowerId === undefined || typeof status !== 'string') {
      return null;
    }

    return {
      id: id as number | string,
      postId: postId as number | string,
      postName: String(source['postName'] ?? source['post_name'] ?? ''),
      postImage: String(source['postImage'] ?? source['post_image'] ?? ''),
      ownerId: ownerId as number | string,
      ownerName: String(source['ownerName'] ?? source['owner_name'] ?? ''),
      ownerProfilePicture: this.normalizeProfilePicture(source['ownerProfilePicture'] ?? source['owner_profile_picture']),
      borrowerId: borrowerId as number | string,
      borrowerName: String(source['borrowerName'] ?? source['borrower_name'] ?? ''),
      borrowerProfilePicture: this.normalizeProfilePicture(source['borrowerProfilePicture'] ?? source['borrower_profile_picture']),
      requestedAt: String(source['requestedAt'] ?? source['requested_at'] ?? ''),
      updatedAt: String(source['updatedAt'] ?? source['updated_at'] ?? ''),
      status: status as BorrowRequestStatus
    };
  }

  private toIncomingNotification(request: BorrowRequest): BorrowNotification {
    return {
      id: `incoming-${String(request.id)}`,
      requestId: request.id,
      postId: request.postId,
      type: 'incoming-request',
      actorName: request.borrowerName,
      actorProfilePicture: request.borrowerProfilePicture,
      itemName: request.postName,
      status: 'pending',
      createdAt: request.updatedAt || request.requestedAt,
      message: `${request.borrowerName} requested to borrow "${request.postName}".`
    };
  }

  private normalizeNotification(value: unknown): BorrowNotification | null {
    const source = this.asRecord(value);
    const id = source['id'];
    const requestId = source['requestId'] ?? source['request_id'];
    const postId = source['postId'] ?? source['post_id'];
    const type = source['type'];
    const status = source['status'];

    if (id === undefined || requestId === undefined || typeof type !== 'string' || typeof status !== 'string') {
      return null;
    }

    return {
      id: id as number | string,
      requestId: requestId as number | string,
      postId: postId === undefined ? undefined : postId as number | string,
      type: type as BorrowNotification['type'],
      actorName: String(source['actorName'] ?? source['actor_name'] ?? ''),
      actorProfilePicture: this.normalizeProfilePicture(source['actorProfilePicture'] ?? source['actor_profile_picture']),
      itemName: String(source['itemName'] ?? source['item_name'] ?? ''),
      status: status as BorrowRequestStatus,
      createdAt: String(source['createdAt'] ?? source['created_at'] ?? ''),
      message: String(source['message'] ?? '')
    };
  }

  private normalizeProfilePicture(value: unknown): string {
    if (typeof value !== 'string') {
      return '';
    }

    const normalizedValue = value.trim();
    if (!normalizedValue) {
      return '';
    }

    return normalizedValue;
  }

  private normalizeBorrowedItem(value: unknown): BorrowedItem | null {
    const source = this.asRecord(value);
    const requestId = source['requestId'] ?? source['request_id'];
    const postId = source['postId'] ?? source['post_id'];
    const approvedAtValue = String(source['approvedAt'] ?? source['approved_at'] ?? '');

    if (requestId === undefined || postId === undefined) {
      return null;
    }

    return {
      requestId: requestId as number | string,
      postId: postId as number | string,
      name: String(source['name'] ?? ''),
      image: String(source['image'] ?? ''),
      owner: String(source['owner'] ?? ''),
      ownerProfilePicture: String(source['ownerProfilePicture'] ?? source['owner_profile_picture'] ?? ''),
      requestedAt: this.formatDate(String(source['requestedAt'] ?? source['requested_at'] ?? '')),
      approvedAt: this.formatDate(approvedAtValue),
      approvedAtValue,
      status: 'borrowed'
    };
  }

  private normalizeLentItem(value: unknown): LentItem | null {
    const source = this.asRecord(value);
    const requestId = source['requestId'] ?? source['request_id'];
    const postId = source['postId'] ?? source['post_id'];
    const approvedAtValue = String(source['approvedAt'] ?? source['approved_at'] ?? '');

    if (requestId === undefined || postId === undefined) {
      return null;
    }

    return {
      requestId: requestId as number | string,
      postId: postId as number | string,
      name: String(source['name'] ?? ''),
      image: String(source['image'] ?? ''),
      borrower: String(source['borrower'] ?? ''),
      borrowerProfilePicture: String(source['borrowerProfilePicture'] ?? source['borrower_profile_picture'] ?? ''),
      requestedAt: this.formatDate(String(source['requestedAt'] ?? source['requested_at'] ?? '')),
      approvedAt: this.formatDate(approvedAtValue),
      approvedAtValue,
      status: 'lent'
    };
  }

  private toTimestamp(value: string): number {
    const parsedDate = new Date(value);
    return Number.isNaN(parsedDate.getTime()) ? 0 : parsedDate.getTime();
  }

  private formatDate(value: string): string {
    const parsedDate = new Date(value);
    return Number.isNaN(parsedDate.getTime()) ? value : parsedDate.toLocaleDateString();
  }

  private asRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' ? value as Record<string, unknown> : {};
  }

  private asArray(value: unknown): unknown[] {
    return Array.isArray(value) ? value : [];
  }
}