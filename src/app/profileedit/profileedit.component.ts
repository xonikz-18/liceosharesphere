import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { toast } from 'ngx-sonner';

@Component({
  selector: 'app-profileedit',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './profileedit.component.html',
  styleUrls: ['./profileedit.component.scss']
})
export class ProfileEditComponent implements OnInit {
  @Input() profile: any = {};
  @Output() saveProfile = new EventEmitter<any>();
  @Output() profilePreviewChange = new EventEmitter<string>();
  @Output() close = new EventEmitter<void>();

  editableProfile: any = {};
  previewImage = 'assets/images/dummypic.png';
  isSaving = false;
  errorMessage = '';

  sexes = ['Female', 'Male'];
  departments = [
    'College of Arts and Sciences',
    'School of Business, Management and Accountancy',
    'College of Criminal Justice',
    'College of Engineering',
    'College of Information Technology',
    'College of Medical Laboratory Science',
    'Conservatory of Music, Theater and Dance',
    'College of Nursing',
    'College of Dentistry',
    'College of Pharmacy',
    'College of Rehabilitation Sciences',
    'College of Radiologic Technology',
    'School of Teacher Education'
  ];

  ngOnInit() {
    this.editableProfile = { ...this.profile };
    this.previewImage = this.profile?.profilePicture || this.profile?.profile_picture || this.profile?.imageUrl || this.previewImage;
    this.profilePreviewChange.emit(this.previewImage);
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : this.previewImage;
      this.previewImage = result;
      this.editableProfile.profilePicture = result;
      this.editableProfile.profile_picture = result;
      this.profilePreviewChange.emit(result);
    };
    reader.readAsDataURL(file);
  }

  private hasRequiredFields() {
    return Boolean(
      this.editableProfile.fullname?.trim() &&
      this.editableProfile.sex?.trim() &&
      this.editableProfile.department?.trim() &&
      this.editableProfile.email?.trim()
    );
  }

  onSaveClick(event: Event) {
    event.preventDefault();
    event.stopPropagation();
    toast.success('Successfully saved');

    const activeElement = document.activeElement;
    if (activeElement instanceof HTMLElement) {
      activeElement.blur();
    }

    this.save();
  }

  save() {
    if (this.isSaving) {
      return;
    }

    if (!this.hasRequiredFields()) {
      this.errorMessage = 'Please fill in full name, sex, department, and email.';
      return;
    }

    this.isSaving = true;
    this.errorMessage = '';

    // always emit with id
    if (!this.editableProfile.id && this.profile.id) {
      this.editableProfile.id = this.profile.id;
    }

    if (!this.editableProfile._id && this.profile._id) {
      this.editableProfile._id = this.profile._id;
    }

    if (!this.editableProfile.userId && this.profile.userId) {
      this.editableProfile.userId = this.profile.userId;
    }

    this.saveProfile.emit(this.editableProfile);
    this.isSaving = false;
  }

  cancel() {
    this.close.emit();
  }
}
