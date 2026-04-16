import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, catchError, map, of, switchMap, tap } from 'rxjs';

export interface PostItem {
  id: number | string;
  userId?: number | string;
  name: string;
  description: string;
  image: string;
  owner: string;
  ownerProfilePicture?: string;
  date: string;
  status: string;
}

@Injectable({
  providedIn: 'root'
})
export class PostService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = 'http://localhost:3000/auth/posts';
  private readonly fallbackApiUrl = 'http://localhost:3000/posts';
  private readonly postsSessionStorageKey = 'cachedPosts';
  private readonly postsLocalStorageKey = 'cachedPostsPersistent';
  private readonly maxPersistedPosts = 80;
  private cachedPosts: PostItem[] = this.readCachedPosts();
  private readonly postsSubject = new BehaviorSubject<PostItem[]>([...this.cachedPosts]);

  readonly postsChanged$ = this.postsSubject.asObservable();

  syncFromCache(): PostItem[] {
    if (!this.cachedPosts.length) {
      this.cachedPosts = this.readCachedPosts();
    }

    this.postsSubject.next([...this.cachedPosts]);
    return [...this.cachedPosts];
  }

  getCachedPosts(): PostItem[] {
    if (!this.cachedPosts.length) {
      this.cachedPosts = this.readCachedPosts();
      this.postsSubject.next([...this.cachedPosts]);
    }

    return [...this.cachedPosts];
  }

  replaceCachedPost(post: PostItem) {
    this.updateCache(this.cachedPosts.map((cachedPost) =>
      String(cachedPost.id) === String(post.id) ? post : cachedPost
    ));
  }

  removeCachedPost(postId: number | string) {
    this.updateCache(this.cachedPosts.filter((post) => String(post.id) !== String(postId)));
  }

  restoreCachedPost(post: PostItem) {
    this.updateCache([post, ...this.cachedPosts.filter((cachedPost) => String(cachedPost.id) !== String(post.id))]);
  }

  updateCachedOwnerData(userId: number | string | undefined, ownerName: string | undefined, ownerProfilePicture?: string) {
    if (!userId) {
      return;
    }

    this.updateCache(
      this.cachedPosts.map((post) =>
        String(post.userId) === String(userId)
          ? {
              ...post,
              owner: ownerName?.trim() || post.owner,
              ownerProfilePicture: ownerProfilePicture ?? post.ownerProfilePicture
            }
          : post
      )
    );
  }

  getPosts(): Observable<PostItem[]> {
    const params = {
      _ts: Date.now().toString()
    };

    const endpoints = [
      this.apiUrl,
      this.fallbackApiUrl,
      `${this.fallbackApiUrl}/all`,
      `${this.apiUrl}/all`
    ];

    return this.fetchPostsFromEndpoints(endpoints, params).pipe(
      tap((posts) => {
        if (posts !== null) {
          this.updateCache(posts);
        }
      }),
      map((posts) => {
        if (posts === null) {
          return [...this.cachedPosts];
        }

        return posts;
      })
    );
  }

  updatePost(post: PostItem): Observable<PostItem> {
    const body = {
      userId: post.userId,
      user_id: post.userId,
      itemName: post.name,
      description: post.description,
      attachment: post.image,
      status: post.status
    };

    return this.http.put<unknown>(`${this.apiUrl}/${post.id}`, body).pipe(
      catchError(() => this.http.put<unknown>(`${this.fallbackApiUrl}/${post.id}`, body)),
      map((updatedPost) => {
        const response = this.asRecord(updatedPost);
        return this.normalizePost(response['post'] ?? updatedPost, post);
      }),
      tap((savedPost) => {
        this.updateCache(this.cachedPosts.map((cachedPost) =>
          String(cachedPost.id) === String(savedPost.id) ? savedPost : cachedPost
        ));
      })
    );
  }

  deletePost(postId: number | string, userId?: number | string): Observable<void> {
    const body = { userId, user_id: userId };

    return this.http.delete<void>(`${this.apiUrl}/${postId}`, {
      body
    }).pipe(
      catchError(() => this.http.delete<void>(`${this.fallbackApiUrl}/${postId}`, {
        body
      })),
      tap(() => {
        this.removeCachedPost(postId);
      })
    );
  }

  createPost(post: Omit<PostItem, 'id'>): Observable<PostItem> {
    const body = {
      userId: post.userId,
      user_id: post.userId,
      itemName: post.name,
      description: post.description,
      attachment: post.image,
      owner: post.owner,
      date: post.date,
      status: post.status
    };

    return this.http.post<unknown>(this.apiUrl, body).pipe(
      catchError(() => this.http.post<unknown>(this.fallbackApiUrl, body)),
      catchError(() => this.http.post<unknown>(`${this.fallbackApiUrl}/add`, body)),
      catchError(() => this.http.post<unknown>(`${this.apiUrl}/add`, body)),
      map((createdPost) => {
        const response = this.asRecord(createdPost);
        return this.normalizePost(response['post'] ?? createdPost, post);
      }),
      tap((savedPost) => {
        this.updateCache([savedPost, ...this.cachedPosts.filter((postItem) => postItem.id !== savedPost.id)]);
      })
    );
  }

  private updateCache(posts: PostItem[]) {
    const sortedPosts = this.sortPosts(posts);
    this.cachedPosts = sortedPosts;
    this.persistCachedPosts(sortedPosts);
    this.postsSubject.next([...sortedPosts]);
  }

  private readCachedPosts(): PostItem[] {
    const parseStoredPosts = (storedPosts: string | null): PostItem[] | null => {
      if (!storedPosts) {
        return null;
      }

      const parsedPosts = JSON.parse(storedPosts);

      if (!Array.isArray(parsedPosts)) {
        return null;
      }

      return this.sortPosts(parsedPosts.map((post) => this.normalizePost(post)).filter((post) => !!post.id));
    };

    const sessionStored = sessionStorage.getItem(this.postsSessionStorageKey);
    const localStored = localStorage.getItem(this.postsLocalStorageKey);

    let sessionPosts: PostItem[] | null = null;
    let localPosts: PostItem[] | null = null;

    try {
      sessionPosts = parseStoredPosts(sessionStored);
    } catch {
      sessionStorage.removeItem(this.postsSessionStorageKey);
      sessionPosts = null;
    }

    try {
      localPosts = parseStoredPosts(localStored);
    } catch {
      localStorage.removeItem(this.postsLocalStorageKey);
      localPosts = null;
    }

    if (sessionPosts && sessionPosts.length) {
      return sessionPosts;
    }

    return localPosts ?? [];
  }

  private persistCachedPosts(posts: PostItem[]) {
    const compactPosts = this.buildCompactPostsForStorage(posts);
    const minimalPosts = compactPosts.map((post) => ({
      ...post,
      image: ''
    }));
    const tinyPosts = minimalPosts.slice(0, Math.min(10, minimalPosts.length));

    try {
      sessionStorage.setItem(this.postsSessionStorageKey, JSON.stringify(compactPosts));
    } catch {
      sessionStorage.removeItem(this.postsSessionStorageKey);
    }

    this.writeWithRetry(
      localStorage,
      this.postsLocalStorageKey,
      compactPosts,
      minimalPosts,
      tinyPosts
    );
  }

  private writeWithRetry(storage: Storage, key: string, ...values: unknown[]) {
    for (const value of values) {
      try {
        storage.setItem(key, JSON.stringify(value));
        return;
      } catch {
        // Try the next smaller payload.
      }
    }

    try {
      storage.removeItem(key);
    } catch {
      // Ignore storage cleanup failures.
    }
  }

  private buildCompactPostsForStorage(posts: PostItem[]): PostItem[] {
    return posts
      .slice(0, this.maxPersistedPosts)
      .map((post) => ({
        ...post,
        image: this.shouldSkipPersistingImage(post.image) ? '' : post.image
      }));
  }

  private shouldSkipPersistingImage(image: string | undefined): boolean {
    if (!image || typeof image !== 'string') {
      return false;
    }

    if (!image.startsWith('data:')) {
      return false;
    }

    return image.length > 4096;
  }

  private normalizePost(post: unknown, fallback?: Partial<PostItem>): PostItem {
    const source = this.asRecord(post);
    const createdAt = source['created_at'];

    return {
      id: source['id'] ?? source['_id'] ?? fallback?.id ?? Date.now(),
      userId: source['user_id'] ?? source['userId'] ?? source['owner_id'] ?? source['ownerId'] ?? fallback?.userId,
      name: source['item_name'] ?? source['itemName'] ?? source['name'] ?? fallback?.name ?? '',
      description: source['description'] ?? fallback?.description ?? '',
      image: source['attachment'] ?? source['image'] ?? fallback?.image ?? '',
      owner: source['owner'] ?? source['fullname'] ?? source['user_fullname'] ?? fallback?.owner ?? 'Unknown',
      ownerProfilePicture: source['ownerProfilePicture'] ?? source['profile_picture'] ?? source['profilePicture'] ?? fallback?.ownerProfilePicture,
      date: this.formatDate(createdAt ?? source['date'] ?? fallback?.date),
      status: source['status'] ?? fallback?.status ?? 'available'
    };
  }

  private parsePostsPayload(payload: unknown): PostItem[] | null {
    const extractedPosts = this.extractPostsArray(payload);

    if (extractedPosts === null) {
      return null;
    }

    return extractedPosts.map((post) => this.normalizePost(post));
  }

  private fetchPostsFromEndpoints(endpoints: string[], params: Record<string, string>): Observable<PostItem[] | null> {
    if (!endpoints.length) {
      return of(null);
    }

    const [currentEndpoint, ...remainingEndpoints] = endpoints;

    return this.http.get<unknown>(currentEndpoint, { params }).pipe(
      map((payload) => this.parsePostsPayload(payload)),
      catchError(() => of(null)),
      switchMap((posts) => {
        if (posts === null) {
          return this.fetchPostsFromEndpoints(remainingEndpoints, params);
        }

        if (posts.length === 0 && remainingEndpoints.length > 0) {
          return this.fetchPostsFromEndpoints(remainingEndpoints, params);
        }

        return of(posts);
      })
    );
  }

  private extractPostsArray(payload: unknown): unknown[] | null {
    if (Array.isArray(payload)) {
      return payload;
    }

    const record = this.asRecord(payload);
    const candidates = [record['posts'], record['items'], record['data'], record['results'], record['list']];

    for (const candidate of candidates) {
      if (Array.isArray(candidate)) {
        return candidate;
      }

      const nestedRecord = this.asRecord(candidate);
      const nestedCandidates = [nestedRecord['posts'], nestedRecord['items'], nestedRecord['results'], nestedRecord['list']];

      for (const nestedCandidate of nestedCandidates) {
        if (Array.isArray(nestedCandidate)) {
          return nestedCandidate;
        }
      }
    }

    const looksLikeSinglePost =
      record['id'] !== undefined
      && (
        record['item_name'] !== undefined
        || record['itemName'] !== undefined
        || record['name'] !== undefined
      );

    if (looksLikeSinglePost) {
      return [record];
    }

    return null;
  }

  private sortPosts(posts: PostItem[]): PostItem[] {
    return [...posts].sort((left, right) => {
      const rightId = Number(right.id);
      const leftId = Number(left.id);

      if (!Number.isNaN(rightId) && !Number.isNaN(leftId) && rightId !== leftId) {
        return rightId - leftId;
      }

      return String(right.id).localeCompare(String(left.id));
    });
  }

  private formatDate(value: unknown): string {
    if (typeof value !== 'string' || !value.trim()) {
      return new Date().toLocaleDateString();
    }

    const parsedDate = new Date(value);
    return Number.isNaN(parsedDate.getTime()) ? value : parsedDate.toLocaleDateString();
  }

  private asRecord(value: unknown): Record<string, any> {
    return value && typeof value === 'object' ? (value as Record<string, any>) : {};
  }

  private asArray(value: unknown): unknown[] {
    return Array.isArray(value) ? value : [];
  }
}