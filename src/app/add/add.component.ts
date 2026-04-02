import { Component, Output, EventEmitter, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-add',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './add.component.html',
  styleUrls: ['./add.component.scss']
})
export class AddComponent {

  @Output() cancel = new EventEmitter<void>();
  @Output() postItem = new EventEmitter<any>();

  itemName: string = '';
  description: string = '';

  previewImage: string = '';
  showFullPreview: boolean = false;

  constructor(private cdr: ChangeDetectorRef) {}

  onCancel() {
    this.cancel.emit();
  }

  onPost() {
    if (!this.itemName || !this.description || !this.previewImage) return;

    const newItem = {
      id: Date.now(),
      name: this.itemName,
      description: this.description,
      image: this.previewImage,
      owner: 'Amber',
      date: new Date().toLocaleDateString(),
      status: 'available'
    };

    this.postItem.emit(newItem);
    this.cancel.emit();
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];

    if (file) {
      const reader = new FileReader();

      reader.onload = (e: any) => {
        this.previewImage = e.target.result;

        this.cdr.detectChanges(); // 🔥 forces instant preview
      };

      reader.readAsDataURL(file);
    }
  }

  openPreview() {
    this.showFullPreview = true;
  }

  closePreview() {
    this.showFullPreview = false;
  }

  removeImage(){
  this.previewImage = '';
}
}