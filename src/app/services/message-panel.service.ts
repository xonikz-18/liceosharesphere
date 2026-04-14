import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export interface MessageTargetOwner {
  ownerId: number | string;
  ownerName?: string;
  ownerProfilePicture?: string;
}

@Injectable({
  providedIn: 'root'
})
export class MessagePanelService {
  private readonly openWithOwnerSubject = new Subject<MessageTargetOwner | null>();

  readonly openWithOwner$ = this.openWithOwnerSubject.asObservable();

  openPanel(targetOwner: MessageTargetOwner | null = null) {
    this.openWithOwnerSubject.next(targetOwner);
  }
}
