import { Component, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { LogoutComponent } from '../logout/logout.component';
import { AddComponent } from '../add/add.component';
import { NotificationComponent } from '../notification/notification.component';
import { MessageComponent } from '../message/message.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    LogoutComponent,
    AddComponent,
    NotificationComponent,
    MessageComponent
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent {

  /* MODALS */

  showLogoutPopup = false;
  showAddPopup = false;

  /* DROPDOWNS */

  showNotifications = false;
  showMessages = false;

  /* LOGOUT */

  toggleLogout(){
    this.showLogoutPopup = true;
  }

  handleCancel(){
    this.showLogoutPopup = false;
  }

  /* ADD ITEM */

  openAddPopup(){
    this.showAddPopup = true;
  }

  closeAddPopup(){
    this.showAddPopup = false;
  }

  /* NOTIFICATIONS */

  toggleNotifications(event: Event){
    event.stopPropagation();
    this.showNotifications = !this.showNotifications;
    this.showMessages = false;
  }

  /* MESSAGES */

  toggleMessages(event: Event){
    event.stopPropagation();
    this.showMessages = !this.showMessages;
    this.showNotifications = false;
  }

  /* CLOSE WHEN CLICKING OUTSIDE */

  @HostListener('document:click')
  closeDropdowns(){
    this.showNotifications = false;
    this.showMessages = false;
  }

}