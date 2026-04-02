import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-profileedit',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './profileedit.component.html',
  styleUrls: ['./profileedit.component.scss']
})
export class ProfileEditComponent {

  @Input() profile!: any;

  @Output() saveProfile = new EventEmitter<any>();
  @Output() close = new EventEmitter<void>();

  // 🔥 THIS IS WHAT YOU'RE MISSING
  editableProfile: any = {};

  previewImage: string = 'assets/images/dummypepic.png';

  ngOnInit(){
    this.editableProfile = { ...this.profile }; // clone
  }

  onFileSelected(event: any){
    const file = event.target.files[0];
    if(file){
      const reader = new FileReader();
      reader.onload = () => {
        this.previewImage = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  save(){
    this.saveProfile.emit(this.editableProfile);
    this.close.emit();
  }

  cancel(){
    this.close.emit();
  }
}