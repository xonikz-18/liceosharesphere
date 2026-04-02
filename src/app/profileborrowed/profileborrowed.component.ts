import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { LogoutComponent } from '../logout/logout.component';
import { ProfileEditComponent } from '../profileedit/profileedit.component';
import { ProfileService } from '../services/profile.service';
import { ReturnComponent } from '../return/return.component';

@Component({
  selector: 'app-profileborrowed',
  standalone: true,
  imports: [CommonModule, RouterModule, LogoutComponent, ProfileEditComponent, ReturnComponent],
  templateUrl: './profileborrowed.component.html',
  styleUrls: ['./profileborrowed.component.scss']
})
export class ProfileBorrowedComponent implements OnInit {

  constructor(private profileService: ProfileService) {}

  showLogoutPopup = false;
  showEditProfile = false;
  showReturnPopup = false;
  selectedItem: any = null;

  openReturn(item: any){
  this.selectedItem = item;
  this.showReturnPopup = true;
  }

  profile: any; // 🔥 declare only

  borrowed = [
    { name:'P.E Uniform', date:'February 13, 2026', image:'' },
    { name:'P.E Uniform', date:'February 13, 2026', image:'' },
    { name:'P.E Uniform', date:'February 13, 2026', image:'' },
    { name:'P.E Uniform', date:'February 13, 2026', image:'' }
  ];

  ngOnInit(){
    this.profile = this.profileService.getProfile(); // 🔥 MOVE HERE
  }

  toggleLogout(){
    this.showLogoutPopup = true;
  }

  handleCancel(){
    this.showLogoutPopup = false;
  }

  openEditProfile(){
    this.showEditProfile = true;
  }

  closeEditProfile(){
    this.showEditProfile = false;
  }

  updateProfile(updated: any){
    this.profileService.updateProfile(updated);
    this.profile = this.profileService.getProfile();
  }

  closeReturn(){
  this.showReturnPopup = false;
  }
}