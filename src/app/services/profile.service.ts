import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ProfileService {

  profile = {
    firstName: 'Amber',
    lastName: 'Garillos',
    year: '2',
    contact: '09091457196',
    department: 'Information Technology',
    email: 'amber17@liceo.edu.ph'
  };

  getProfile(){
    return this.profile;
  }

  updateProfile(updated: any){
    this.profile = updated;
  }
}