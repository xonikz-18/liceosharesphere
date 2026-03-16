import { Component, Output, EventEmitter } from '@angular/core';
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

  itemName: string = '';
  description: string = '';

  selectedFile: File | null = null;

  onCancel() {
    this.cancel.emit();
  }

  onPost() {
    console.log("Post submitted", this.itemName, this.description);
    this.cancel.emit();
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
      console.log(file.name);
    }
  }
}