import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, map, tap } from 'rxjs';

export interface ConversationItem {
  otherUserId: number | string;
  otherName: string;
  otherProfilePicture: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
}

export interface ChatMessageItem {
  id: number | string;
  senderId: number | string;
  receiverId: number | string;
  messageText: string;
  isRead: boolean;
  createdAt: string;
  senderName: string;
  senderProfilePicture: string;
}

@Injectable({
  providedIn: 'root'
})
export class MessageService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = 'http://localhost:3000/api/messages';
  private readonly unreadCountSubject = new BehaviorSubject<number>(0);
  private readonly unreadCountStorageKeyPrefix = 'messageUnreadCount:';

  readonly unreadCount$ = this.unreadCountSubject.asObservable();

  syncUnreadCountFromCache(userId?: number | string): number {
    if (userId === undefined || userId === null) {
      this.unreadCountSubject.next(0);
      return 0;
    }

    try {
      const raw = sessionStorage.getItem(this.getUnreadCountStorageKey(userId));
      const cachedCount = Number(raw ?? 0);
      const safeCount = Number.isNaN(cachedCount) ? 0 : Math.max(0, cachedCount);
      this.unreadCountSubject.next(safeCount);
      return safeCount;
    } catch {
      this.unreadCountSubject.next(0);
      return 0;
    }
  }

  getConversations(userId?: number | string): Observable<ConversationItem[]> {
    if (userId === undefined || userId === null) {
      return this.wrapArray([]);
    }

    return this.http.get<unknown>(`${this.apiUrl}/conversations`, {
      params: { userId: String(userId) }
    }).pipe(
      map((response) => this.asRecord(response)),
      map((response) => this.asArray(response['conversations']).map((item) => this.normalizeConversation(item)).filter(Boolean) as ConversationItem[])
    );
  }

  getThread(userId?: number | string, otherUserId?: number | string): Observable<ChatMessageItem[]> {
    if (userId === undefined || userId === null || otherUserId === undefined || otherUserId === null) {
      return this.wrapArray([]);
    }

    return this.http.get<unknown>(`${this.apiUrl}/thread`, {
      params: {
        userId: String(userId),
        otherUserId: String(otherUserId)
      }
    }).pipe(
      map((response) => this.asRecord(response)),
      map((response) => this.asArray(response['messages']).map((item) => this.normalizeMessage(item)).filter(Boolean) as ChatMessageItem[])
    );
  }

  sendMessage(senderId: number | string, receiverId: number | string, messageText: string): Observable<ChatMessageItem> {
    return this.http.post<unknown>(this.apiUrl, {
      senderId,
      receiverId,
      messageText
    }).pipe(
      map((response) => this.asRecord(response)),
      map((response) => this.normalizeMessage(response['message'] ?? response)),
      map((message) => {
        if (!message) {
          throw new Error('Message send failed.');
        }

        return message;
      })
    );
  }

  markThreadAsRead(userId?: number | string, otherUserId?: number | string): Observable<number> {
    if (userId === undefined || userId === null || otherUserId === undefined || otherUserId === null) {
      return this.wrapValue(0);
    }

    return this.http.patch<unknown>(`${this.apiUrl}/thread/read`, {
      userId,
      otherUserId
    }).pipe(
      map((response) => this.asRecord(response)),
      map((response) => Number(response['updatedCount'] ?? 0))
    );
  }

  refreshUnreadCount(userId?: number | string): Observable<number> {
    if (userId === undefined || userId === null) {
      this.persistUnreadCount(0, undefined);
      this.unreadCountSubject.next(0);
      return this.wrapValue(0);
    }

    return this.http.get<unknown>(`${this.apiUrl}/unread-count`, {
      params: { userId: String(userId) }
    }).pipe(
      map((response) => this.asRecord(response)),
      map((response) => Number(response['unreadCount'] ?? 0)),
      tap((count) => {
        const safeCount = Number.isNaN(count) ? 0 : Math.max(0, count);
        this.persistUnreadCount(safeCount, userId);
        this.unreadCountSubject.next(safeCount);
      })
    );
  }

  private getUnreadCountStorageKey(userId: number | string): string {
    return `${this.unreadCountStorageKeyPrefix}${String(userId)}`;
  }

  private persistUnreadCount(count: number, userId?: number | string) {
    if (userId === undefined || userId === null) {
      return;
    }

    try {
      sessionStorage.setItem(this.getUnreadCountStorageKey(userId), String(Math.max(0, count)));
    } catch {
      // Ignore storage errors and keep runtime state only.
    }
  }

  private normalizeConversation(value: unknown): ConversationItem | null {
    const source = this.asRecord(value);
    const otherUserId = source['otherUserId'] ?? source['other_user_id'];

    if (otherUserId === undefined || otherUserId === null) {
      return null;
    }

    return {
      otherUserId: otherUserId as number | string,
      otherName: String(source['otherName'] ?? ''),
      otherProfilePicture: String(source['otherProfilePicture'] ?? source['other_profile_picture'] ?? ''),
      lastMessage: String(source['lastMessage'] ?? ''),
      lastMessageAt: String(source['lastMessageAt'] ?? source['last_message_at'] ?? ''),
      unreadCount: Number(source['unreadCount'] ?? source['unread_count'] ?? 0)
    };
  }

  private normalizeMessage(value: unknown): ChatMessageItem | null {
    const source = this.asRecord(value);
    const id = source['id'];
    const senderId = source['senderId'] ?? source['sender_id'];
    const receiverId = source['receiverId'] ?? source['receiver_id'];

    if (id === undefined || senderId === undefined || receiverId === undefined) {
      return null;
    }

    return {
      id: id as number | string,
      senderId: senderId as number | string,
      receiverId: receiverId as number | string,
      messageText: String(source['messageText'] ?? source['message_text'] ?? ''),
      isRead: Boolean(source['isRead'] ?? source['is_read']),
      createdAt: String(source['createdAt'] ?? source['created_at'] ?? ''),
      senderName: String(source['senderName'] ?? source['sender_name'] ?? ''),
      senderProfilePicture: String(source['senderProfilePicture'] ?? source['sender_profile_picture'] ?? '')
    };
  }

  private asRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' ? value as Record<string, unknown> : {};
  }

  private asArray(value: unknown): unknown[] {
    return Array.isArray(value) ? value : [];
  }

  private wrapArray<T>(value: T[]): Observable<T[]> {
    return new Observable<T[]>((subscriber) => {
      subscriber.next(value);
      subscriber.complete();
    });
  }

  private wrapValue<T>(value: T): Observable<T> {
    return new Observable<T>((subscriber) => {
      subscriber.next(value);
      subscriber.complete();
    });
  }
}
