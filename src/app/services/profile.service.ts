import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, combineLatest, concat, of } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { BorrowRequestService } from './borrow-request.service';
import { PostService } from './post.service';
import { MessageService } from './message.service';

@Injectable({
  providedIn: 'root'
})
export class ProfileService {
  private apiUrl = 'http://localhost:3000'; // adjust to your backend port
  private cachedProfile: any = null;
  private readonly profileStorageKey = 'currentUser';
  private readonly sessionProfileStorageKey = 'currentUserSession';
  private readonly profilePictureStorageKey = 'currentUserProfilePicture';
  private readonly http = inject(HttpClient);
  private readonly postService = inject(PostService);
  private readonly borrowRequestService = inject(BorrowRequestService);
  private readonly messageService = inject(MessageService);

  private writeWithRetry(storage: Storage, key: string, primaryValue: unknown, fallbackValue: unknown) {
    try {
      storage.setItem(key, JSON.stringify(primaryValue));
      return;
    } catch {
      // retry with a smaller payload.
    }

    try {
      storage.removeItem(key);
      storage.setItem(key, JSON.stringify(fallbackValue));
    } catch {
      // keep runtime state if browser storage is unavailable or full.
    }
  }

  private buildLightweightProfile(profile: any): any {
    if (!profile || typeof profile !== 'object') {
      return profile;
    }

    const normalized = this.normalizeProfile(profile);
    const profilePicture = normalized.profilePicture ?? normalized.profile_picture ?? '';

    return {
      id: normalized.id ?? normalized.userId ?? normalized.user_id ?? normalized._id,
      userId: normalized.userId ?? normalized.id ?? normalized.user_id ?? normalized._id,
      user_id: normalized.user_id ?? normalized.id ?? normalized.userId ?? normalized._id,
      _id: normalized._id ?? normalized.id ?? normalized.userId ?? normalized.user_id,
      fullname: normalized.fullname ?? normalized.name ?? '',
      email: normalized.email ?? '',
      department: normalized.department ?? '',
      sex: normalized.sex ?? '',
      contact_number: normalized.contact_number ?? normalized.contact ?? '',
      profilePicture,
      profile_picture: profilePicture
    };
  }

  private normalizeProfile(profile: any): any {
    if (!profile || typeof profile !== 'object') {
      return profile;
    }

    const profilePicture = profile.profilePicture ?? profile.profile_picture ?? profile.imageUrl ?? '';
    const resolvedId = profile.id ?? profile.userId ?? profile.user_id ?? profile._id;

    return {
      ...profile,
      id: resolvedId,
      userId: resolvedId,
      user_id: resolvedId,
      profilePicture,
      profile_picture: profilePicture
    };
  }

  private getStoredProfile(): any {
    if (this.cachedProfile) {
      return this.cachedProfile;
    }

    const storedProfilePicture = this.getStoredProfilePicture();
    const sessionStored = sessionStorage.getItem(this.sessionProfileStorageKey);

    if (sessionStored) {
      try {
        this.cachedProfile = this.normalizeProfile(JSON.parse(sessionStored));
        this.cachedProfile = this.ensureProfilePicture(this.cachedProfile, storedProfilePicture);
        try {
          sessionStorage.setItem(this.sessionProfileStorageKey, JSON.stringify(this.cachedProfile));
          if (storedProfilePicture) {
            this.writeProfilePicture(storedProfilePicture);
          }
        } catch {
          // keep runtime profile when storage update is unavailable.
        }
        return this.cachedProfile;
      } catch {
        sessionStorage.removeItem(this.sessionProfileStorageKey);
      }
    }

    const stored = localStorage.getItem(this.profileStorageKey);

    if (!stored) {
      return null;
    }

    try {
      this.cachedProfile = this.normalizeProfile(JSON.parse(stored));
      this.cachedProfile = this.ensureProfilePicture(this.cachedProfile, storedProfilePicture);
      try {
        localStorage.setItem(this.profileStorageKey, JSON.stringify(this.toStorageSafeProfile(this.cachedProfile)));
      } catch {
        // keep runtime profile when storage update is unavailable.
      }
      return this.cachedProfile;
    } catch {
      localStorage.removeItem(this.profileStorageKey);
      return null;
    }
  }

  private toStorageSafeProfile(profile: any): any {
    if (!profile || typeof profile !== 'object') {
      return profile;
    }

    const normalizedProfile = this.normalizeProfile(profile);
    const profilePicture = normalizedProfile.profilePicture ?? normalizedProfile.profile_picture ?? '';

    return {
      ...normalizedProfile,
      profilePicture,
      profile_picture: profilePicture,
      hasProfilePicture: Boolean(profilePicture)
    };
  }

  private getProfileId(profile: any): string | number | undefined {
    return profile?.id ?? profile?._id ?? profile?.userId ?? profile?.user_id;
  }

  private persistProfile(profile: any): any {
    const normalizedProfile = this.normalizeProfile(profile);
    this.cachedProfile = normalizedProfile;
    const lightweightProfile = this.buildLightweightProfile(normalizedProfile);
    const profilePicture = normalizedProfile.profilePicture ?? normalizedProfile.profile_picture ?? '';
    const minimalProfile = {
      id: lightweightProfile?.id,
      userId: lightweightProfile?.userId,
      user_id: lightweightProfile?.user_id,
      _id: lightweightProfile?._id,
      fullname: lightweightProfile?.fullname ?? '',
      email: lightweightProfile?.email ?? '',
      department: lightweightProfile?.department ?? '',
      sex: lightweightProfile?.sex ?? '',
      contact_number: lightweightProfile?.contact_number ?? '',
      contact: lightweightProfile?.contact_number ?? '',
      profilePicture: '',
      profile_picture: '',
      hasProfilePicture: false
    };

    try {
      sessionStorage.setItem(this.sessionProfileStorageKey, JSON.stringify(lightweightProfile));
    } catch {
      sessionStorage.removeItem(this.sessionProfileStorageKey);
    }

    this.writeWithRetry(
      localStorage,
      this.profileStorageKey,
      this.toStorageSafeProfile(lightweightProfile),
      minimalProfile
    );

    this.writeProfilePicture(profilePicture);

    this.postService.updateCachedOwnerData(
      this.getProfileId(normalizedProfile),
      normalizedProfile?.fullname,
      normalizedProfile?.profilePicture
    );
    return normalizedProfile;
  }

  private normalizeProfileResponse(response: any, fallbackProfile: any): any {
    if (!response) {
      return fallbackProfile;
    }

    const profile = response.user ?? response;

    if (!profile || typeof profile !== 'object') {
      return fallbackProfile;
    }

    return this.normalizeProfile({ ...fallbackProfile, ...profile });
  }

  private hydrateLoginSession(profile: any): Observable<any> {
    const persistedProfile = this.persistProfile(profile);
    const profileId = this.getProfileId(persistedProfile);

    if (!profileId) {
      return of(persistedProfile);
    }

    return combineLatest([
      this.postService.getPosts(),
      this.borrowRequestService.loadBorrowerRequestsForUser(profileId),
      this.borrowRequestService.refreshNotificationsForUser(profileId),
      this.borrowRequestService.refreshIncomingRequestsForOwner(profileId),
      this.messageService.refreshUnreadCount(profileId).pipe(catchError(() => of(0)))
    ]).pipe(
      map(() => persistedProfile),
      catchError(() => of(persistedProfile))
    );
  }

  login(email: string, password: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/auth/login`, { email, password }).pipe(
      map(res => {
        if (res.token) {
        localStorage.setItem('authToken', res.token);
      }
        const profile = res.user ? res.user : res;
        return this.normalizeProfile(profile);
      }),
      switchMap((profile) => {
        const profileId = this.getProfileId(profile);

        if (!profileId) {
          return this.hydrateLoginSession(profile);
        }

        return this.http.get<any>(`${this.apiUrl}/auth/profile/${profileId}`).pipe(
          map((response) => this.normalizeProfileResponse(response, profile)),
          catchError(() => of(profile)),
          switchMap((resolvedProfile) => this.hydrateLoginSession(resolvedProfile))
        );
      })
    );
  }

  // get profile (from backend or localStorage)
  getProfileSnapshot(): any {
    return this.getStoredProfile() ?? {};
  }

  getProfile(): Observable<any> {
    const stored = this.getStoredProfile();
    const profileId = this.getProfileId(stored);

    if (!profileId) {
      return of(stored ?? {});
    }

    const request$ = this.http.get<any>(`${this.apiUrl}/auth/profile/${profileId}`).pipe(
      map((response) => this.persistProfile(this.normalizeProfileResponse(response, stored ?? {}))),
      catchError(() => of(stored ?? {}))
    );

    if (stored && Object.keys(stored).length > 0) {
      return concat(of(stored), request$);
    }

    return request$;
  }

  private getStoredProfilePicture(): string | null {
    try {
      const picture = sessionStorage.getItem(this.profilePictureStorageKey);
      return picture && typeof picture === 'string' ? picture : null;
    } catch {
      return null;
    }
  }

  private ensureProfilePicture(profile: any, fallbackPicture: string | null): any {
    if (!profile || typeof profile !== 'object') {
      return profile;
    }

    const hasPicture = typeof profile.profilePicture === 'string' && profile.profilePicture
      ? profile.profilePicture
      : typeof profile.profile_picture === 'string' && profile.profile_picture
        ? profile.profile_picture
        : '';

    if (!hasPicture && fallbackPicture) {
      return {
        ...profile,
        profilePicture: fallbackPicture,
        profile_picture: fallbackPicture
      };
    }

    return profile;
  }

  private writeProfilePicture(profilePicture: string): void {
    try {
      if (profilePicture) {
        sessionStorage.setItem(this.profilePictureStorageKey, profilePicture);
      } else {
        sessionStorage.removeItem(this.profilePictureStorageKey);
      }
    } catch {
      sessionStorage.removeItem(this.profilePictureStorageKey);
    }

    try {
      if (profilePicture) {
        localStorage.setItem(this.profilePictureStorageKey, profilePicture);
      } else {
        localStorage.removeItem(this.profilePictureStorageKey);
      }
    } catch {
      localStorage.removeItem(this.profilePictureStorageKey);
    }
  }

  applyLocalProfileUpdate(profile: any): any {
    const mergedProfile = { ...(this.getStoredProfile() ?? {}), ...profile };
    return this.persistProfile(mergedProfile);
  }

  updateProfile(profile: any): Observable<any> {
    const mergedProfile = { ...(this.getStoredProfile() ?? {}), ...profile };
    const profileId = this.getProfileId(mergedProfile);

    if (!profileId) {
      return of(this.persistProfile(mergedProfile));
    }

    const requestBody = {
      ...mergedProfile,
      profile_picture: mergedProfile.profilePicture ?? mergedProfile.profile_picture ?? null
    };

    return this.http.put<any>(`${this.apiUrl}/profile/${profileId}`, requestBody).pipe(
      catchError(() => this.http.put<any>(`${this.apiUrl}/auth/profile/${profileId}`, requestBody)),
      map(res => this.persistProfile(this.normalizeProfileResponse(res, mergedProfile))),
      catchError(() => of(this.persistProfile(mergedProfile)))
    );
  }

  logout() {
    this.cachedProfile = null;
    localStorage.removeItem(this.profileStorageKey);
    sessionStorage.removeItem(this.sessionProfileStorageKey);
    sessionStorage.removeItem(this.profilePictureStorageKey);
    this.borrowRequestService.resetSessionState();
  }
}
