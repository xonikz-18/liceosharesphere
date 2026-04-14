import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, ElementRef, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { interval } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ChatMessageItem, ConversationItem, MessageService } from '../services/message.service';
import { ProfileService } from '../services/profile.service';
import { MessageTargetOwner } from '../services/message-panel.service';

@Component({
  selector: 'app-message',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './message.component.html',
  styleUrls: ['./message.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MessageComponent implements OnInit, OnChanges {
  private readonly destroyRef = inject(DestroyRef);
  private readonly changeDetectorRef = inject(ChangeDetectorRef);
  private readonly messageService = inject(MessageService);
  private readonly profileService = inject(ProfileService);
  private lastHandledTargetOwnerId: string | null = null;

  @Input() targetOwner: MessageTargetOwner | null = null;
  @Output() closePanel = new EventEmitter<void>();
  @ViewChild('chatBody') chatBodyRef?: ElementRef<HTMLDivElement>;

  currentUserId: number | string | null = null;
  currentUserProfilePicture = '';
  conversations: ConversationItem[] = [];
  selectedConversation: ConversationItem | null = null;
  openChat = false;
  messages: ChatMessageItem[] = [];
  pendingMessages: ChatMessageItem[] = [];
  failedMessages: ChatMessageItem[] = [];
  messageText = '';
  sendError = '';

  ngOnInit() {
    this.currentUserId = this.getCurrentUserId();
    const snapshot = this.profileService.getProfileSnapshot();
    this.currentUserProfilePicture = snapshot?.profilePicture ?? snapshot?.profile_picture ?? '';

    // If a targetOwner was already provided when the panel opened,
    // jump straight into their chat — don't show the inbox first.
    if (this.targetOwner) {
      this.handleTargetOwner();
    }

    this.loadConversations();

    interval(2500)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.loadConversations();
        this.refreshThread(false);
      });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['targetOwner']) {
      this.lastHandledTargetOwnerId = null;
      // If the component is already initialized (currentUserId set), navigate immediately.
      // On first creation, ngOnInit will handle it after setting currentUserId.
      if (this.currentUserId) {
        this.handleTargetOwner();
      }
    }
  }

  close() {
    this.closePanel.emit();
  }

  goToInbox() {
    this.openChat = false;
    this.changeDetectorRef.markForCheck();
  }

  openConversation(conversation: ConversationItem) {
    const isSameConversation = this.selectedConversation &&
      String(this.selectedConversation.otherUserId) === String(conversation.otherUserId);

    this.selectedConversation = conversation;
    this.openChat = true;
    if (!isSameConversation) {
      this.messages = [];
      this.pendingMessages = [];
      this.failedMessages = [];
      this.sendError = '';
    }
    this.changeDetectorRef.markForCheck();

    this.refreshThread(true);
    this.markSelectedThreadAsRead();
    this.messageService.refreshUnreadCount(this.currentUserId ?? undefined).subscribe();
  }

  sendMessage() {
    const receiverId = this.selectedConversation?.otherUserId;

    if (!this.currentUserId || !receiverId) {
      this.sendError = 'Unable to send message. Please reopen the conversation.';
      this.changeDetectorRef.markForCheck();
      return;
    }

    if (this.messageText.trim() === '') {
      return;
    }

    const textToSend = this.messageText.trim();
    this.messageText = '';
    this.sendError = '';

    // Optimistic: show the message instantly before server responds
    const optimisticMsg: ChatMessageItem = {
      id: `optimistic-${Date.now()}`,
      senderId: this.currentUserId,
      receiverId,
      messageText: textToSend,
      isRead: false,
      createdAt: new Date().toISOString(),
      senderName: '',
      senderProfilePicture: ''
    };
    this.pendingMessages = [...this.pendingMessages, optimisticMsg];
    this.messages = [...this.messages, optimisticMsg];
    this.changeDetectorRef.markForCheck();
    this.scrollChatToBottom();

    this.messageService.sendMessage(this.currentUserId, receiverId, textToSend).subscribe({
      next: (message) => {
        // Replace optimistic message with confirmed server message
        this.pendingMessages = this.pendingMessages.filter((m) => m.id !== optimisticMsg.id);
        this.messages = [...this.messages.filter(m => m.id !== optimisticMsg.id), message];
        this.upsertConversationAfterSend(receiverId, textToSend, message.createdAt);
        this.loadConversations();
        this.changeDetectorRef.markForCheck();
      },
      error: (error) => {
        // Keep failed bubble visible and restore text for retry.
        this.pendingMessages = this.pendingMessages.filter((m) => m.id !== optimisticMsg.id);
        this.failedMessages = [...this.failedMessages, optimisticMsg];
        this.messageText = textToSend;
        this.sendError = error?.error?.message || 'Failed to send. Please try again.';
        this.changeDetectorRef.markForCheck();
      }
    });
  }

  isMine(message: ChatMessageItem): boolean {
    if (this.currentUserId === null) {
      return false;
    }

    return String(message.senderId) === String(this.currentUserId);
  }

  isSelectedConversation(conversation: ConversationItem): boolean {
    if (!this.selectedConversation) {
      return false;
    }

    return String(conversation.otherUserId) === String(this.selectedConversation.otherUserId);
  }

  formatTime(value: string): string {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return value;
    }

    return parsed.toLocaleString();
  }

  private loadConversations() {
    this.messageService.getConversations(this.currentUserId ?? undefined).subscribe((conversations) => {
      this.conversations = conversations;

      this.syncSelectedConversation(conversations);
      this.handleTargetOwner();

      this.changeDetectorRef.markForCheck();
    });
  }

  private upsertConversationAfterSend(receiverId: number | string, lastMessage: string, lastMessageAt: string) {
    const existingIndex = this.conversations.findIndex((conversation) =>
      String(conversation.otherUserId) === String(receiverId)
    );

    const baseConversation = existingIndex >= 0
      ? this.conversations[existingIndex]
      : {
          otherUserId: receiverId,
          otherName: this.selectedConversation?.otherName || 'User',
          otherProfilePicture: this.selectedConversation?.otherProfilePicture || '',
          lastMessage: '',
          lastMessageAt: '',
          unreadCount: 0
        };

    const updatedConversation: ConversationItem = {
      ...baseConversation,
      lastMessage,
      lastMessageAt,
      unreadCount: 0
    };

    const withoutExisting = this.conversations.filter((conversation) =>
      String(conversation.otherUserId) !== String(receiverId)
    );

    this.conversations = [updatedConversation, ...withoutExisting];
  }

  private syncSelectedConversation(conversations: ConversationItem[]) {
    if (!this.selectedConversation) {
      return;
    }

    const updated = conversations.find((conversation) =>
      String(conversation.otherUserId) === String(this.selectedConversation?.otherUserId)
    );

    if (updated) {
      this.selectedConversation = updated;
      return;
    }

    // Keep a newly opened synthetic conversation (from Message Owner) so
    // first message can still be sent even if it is not yet in server list.
    if (this.openChat) {
      return;
    }

    this.selectedConversation = null;
    this.messages = [];
  }

  private refreshThread(markReadAfterLoad: boolean) {
    if (!this.currentUserId || !this.selectedConversation?.otherUserId) {
      return;
    }

    this.messageService.getThread(this.currentUserId, this.selectedConversation.otherUserId).subscribe((messages) => {
      this.messages = this.mergeServerPendingAndFailedMessages(messages);

      if (markReadAfterLoad) {
        this.markSelectedThreadAsRead();
      }

      this.changeDetectorRef.markForCheck();
      this.scrollChatToBottom();
    });
  }

  private mergeServerPendingAndFailedMessages(serverMessages: ChatMessageItem[]): ChatMessageItem[] {
    const unresolvedPending = this.pendingMessages.filter((pending) => {
      const pendingTime = new Date(pending.createdAt).getTime();

      return !serverMessages.some((serverMessage) => {
        const sameSender = String(serverMessage.senderId) === String(pending.senderId);
        const sameReceiver = String(serverMessage.receiverId) === String(pending.receiverId);
        const sameText = serverMessage.messageText === pending.messageText;
        const serverTime = new Date(serverMessage.createdAt).getTime();
        const closeInTime = Number.isFinite(pendingTime) && Number.isFinite(serverTime)
          ? Math.abs(serverTime - pendingTime) <= 15000
          : false;

        return sameSender && sameReceiver && sameText && closeInTime;
      });
    });

    const unresolvedFailed = this.failedMessages.filter((failed) => {
      const failedTime = new Date(failed.createdAt).getTime();

      return !serverMessages.some((serverMessage) => {
        const sameSender = String(serverMessage.senderId) === String(failed.senderId);
        const sameReceiver = String(serverMessage.receiverId) === String(failed.receiverId);
        const sameText = serverMessage.messageText === failed.messageText;
        const serverTime = new Date(serverMessage.createdAt).getTime();
        const closeInTime = Number.isFinite(failedTime) && Number.isFinite(serverTime)
          ? Math.abs(serverTime - failedTime) <= 60000
          : false;

        return sameSender && sameReceiver && sameText && closeInTime;
      });
    });

    this.pendingMessages = unresolvedPending;
    this.failedMessages = unresolvedFailed;
    return [...serverMessages, ...unresolvedPending, ...unresolvedFailed];
  }

  private markSelectedThreadAsRead() {
    if (!this.currentUserId || !this.selectedConversation?.otherUserId) {
      return;
    }

    this.messageService.markThreadAsRead(this.currentUserId, this.selectedConversation.otherUserId).subscribe(() => {
      this.messageService.refreshUnreadCount(this.currentUserId ?? undefined).subscribe();
      this.loadConversations();
    });
  }

  private handleTargetOwner() {
    if (!this.targetOwner || !this.currentUserId) {
      return;
    }

    if (String(this.targetOwner.ownerId) === String(this.currentUserId)) {
      return;
    }

    const targetOwnerId = String(this.targetOwner.ownerId);
    if (this.lastHandledTargetOwnerId === targetOwnerId) {
      return;
    }

    const existingConversation = this.conversations.find((conversation) =>
      String(conversation.otherUserId) === targetOwnerId
    );

    const conversationToOpen = existingConversation ?? {
      otherUserId: this.targetOwner.ownerId,
      otherName: this.targetOwner.ownerName || 'Item owner',
      otherProfilePicture: this.targetOwner.ownerProfilePicture || '',
      lastMessage: '',
      lastMessageAt: '',
      unreadCount: 0
    };

    if (!existingConversation) {
      this.conversations = [conversationToOpen, ...this.conversations];
    }

    this.lastHandledTargetOwnerId = targetOwnerId;
    this.openConversation(conversationToOpen);
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

  private scrollChatToBottom() {
    setTimeout(() => {
      const chatBody = this.chatBodyRef?.nativeElement;

      if (!chatBody) {
        return;
      }

      chatBody.scrollTop = chatBody.scrollHeight;
    }, 0);
  }
}