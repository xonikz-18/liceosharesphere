import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { LogoutComponent } from '../logout/logout.component';
import { EditItemComponent } from '../edititem/edititem.component';
import { ProfileEditComponent } from '../profileedit/profileedit.component';
import { ProfileService } from '../services/profile.service';

@Component({
  selector: 'app-profilelent',
  standalone: true,
  imports: [CommonModule, RouterModule, LogoutComponent, EditItemComponent, ProfileEditComponent],
  templateUrl: './profilelent.component.html',
  styleUrls: ['./profilelent.component.scss']
})
export class ProfileLentComponent implements OnInit {

  constructor(private profileService: ProfileService) {}

  showLogoutPopup = false;
  showEditPopup = false;
  showEditProfile = false;

  selectedItem: any = null;
  selectedIndex = -1;

  profile: any; // 🔥 declare only

  lent = [
    { id:1, name:'P.E Uniform', status:'available', image:'' },
    { id:2, name:'P.E Uniform', status:'returned', image:'' },
    { id:3, name:'P.E Uniform', status:'returned', image:'' },
    { id:4, name:'P.E Uniform', status:'available', image:'' }
  ];

  ngOnInit(){
    this.profile = this.profileService.getProfile(); // 🔥 FIX HERE
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

  openEdit(item: any, index: number){
    this.selectedItem = { ...item };
    this.selectedIndex = index;
    this.showEditPopup = true;
  }

  handleEditSave(updatedItem: any){
    if(updatedItem && this.selectedIndex !== -1){
      this.lent[this.selectedIndex] = updatedItem;
    }
    this.showEditPopup = false;
  }
}