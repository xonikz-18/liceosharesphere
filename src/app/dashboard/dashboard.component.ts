import { Component, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { LogoutComponent } from '../logout/logout.component';
import { AddComponent } from '../add/add.component';
import { NotificationComponent } from '../notification/notification.component';
import { MessageComponent } from '../message/message.component';
import { ItemViewComponent } from '../itemview/itemview.component';

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
export class DashboardComponent {

  /* ========================= */
  /* MODALS */
  /* ========================= */

  showLogoutPopup = false;
  showAddPopup = false;

  /* ========================= */
  /* DROPDOWNS */
  /* ========================= */

  showNotifications = false;
  showMessages = false;

  /* ========================= */
  /* ITEMS */
  /* ========================= */

  items: any[] = [];

  previewImage: string = '';

  /* ========================= */
  /* LOGOUT */
  /* ========================= */

  selectedItem: any = null;

openItem(item: any){
  this.selectedItem = item;
}

closeItem(){
  this.selectedItem = null;
}

  toggleLogout(){
    this.showLogoutPopup = true;
  }

  handleCancel(){
    this.showLogoutPopup = false;
  }

  /* ========================= */
  /* ADD ITEM */
  /* ========================= */

  openAddPopup(){
    this.showAddPopup = true;
  }

  closeAddPopup(){
    this.showAddPopup = false;
  }

  handlePost(item: any){
  this.items.unshift(item);
  this.showAddPopup = false;
}

  /* ========================= */
  /* IMAGE PREVIEW */
  /* ========================= */

  openPreview(img: string){
    this.previewImage = img;
  }

  closePreview(){
    this.previewImage = '';
  }

  /* ========================= */
  /* NOTIFICATIONS */
  /* ========================= */

  toggleNotifications(event: Event){
    event.stopPropagation();
    this.showNotifications = !this.showNotifications;
    this.showMessages = false;
  }

  /* ========================= */
  /* MESSAGES */
  /* ========================= */

  toggleMessages(event: Event){
    event.stopPropagation();
    this.showMessages = !this.showMessages;
    this.showNotifications = false;
  }

  /* ========================= */
  /* CLOSE DROPDOWNS */
  /* ========================= */

  @HostListener('document:click')
  closeDropdowns(){
    this.showNotifications = false;
    this.showMessages = false;
  }

}