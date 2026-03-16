import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-profileedit',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './profileedit.component.html',
  styleUrl: './profileedit.component.scss'
})
export class ProfileEditComponent {

  firstName = '';
  lastName = '';
  yearLevel = '';
  contact = '';
  department = 'Information Technology';
  email = 'amber17@liceo.edu.ph';

  save(){
    console.log("Saved");
  }

}