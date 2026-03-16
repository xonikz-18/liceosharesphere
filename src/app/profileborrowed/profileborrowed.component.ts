import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { LogoutComponent } from '../logout/logout.component';

interface BorrowedItem {
  name: string;
  date: string;
  image: string;
}

@Component({
  selector: 'app-profileborrowed',
  standalone: true,
  imports: [CommonModule, RouterModule, LogoutComponent],
  templateUrl: './profileborrowed.component.html',
  styleUrls: ['./profileborrowed.component.scss']
})
export class ProfileBorrowedComponent {

  showLogoutPopup = false;

  toggleLogout(){
    this.showLogoutPopup = true;
  }

  handleCancel(){
    this.showLogoutPopup = false;
  }

  borrowed: BorrowedItem[] = [
    { name:'P.E Uniform', date:'February 13, 2026', image:'peuniform.png' },
    { name:'P.E Uniform', date:'February 13, 2026', image:'peuniform.png' },
    { name:'P.E Uniform', date:'February 13, 2026', image:'peuniform.png' },
    { name:'P.E Uniform', date:'February 13, 2026', image:'peuniform.png' }
  ];
}