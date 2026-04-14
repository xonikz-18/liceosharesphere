import { Component, Output, EventEmitter, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PostItem, PostService } from '../services/post.service';

@Component({
  selector: 'app-add',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './add.component.html',
  styleUrls: ['./add.component.scss']
})
export class AddComponent {
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly postService = inject(PostService);

  @Output() cancel = new EventEmitter<void>();
  @Output() postItem = new EventEmitter<PostItem>();

  itemName: string = '';
  description: string = '';
  previewImage: string = '';
  showFullPreview: boolean = false;
  errorMsg: string = '';
  isSaving: boolean = false;

  onCancel() {
    this.cancel.emit();
    this.itemName = '';
    this.description = '';
    this.previewImage = '';
    this.errorMsg = '';
    this.showFullPreview = false;
  }

  onPost() {
    if (!this.itemName || !this.description || !this.previewImage || this.isSaving) {
      this.errorMsg = 'Please fill in all fields and upload an image.';
      return;
    }

    const currentUser = JSON.parse(sessionStorage.getItem('currentUserSession') || localStorage.getItem('currentUser') || '{}');
    const currentUserId = currentUser.id ?? currentUser.userId ?? currentUser.user_id ?? currentUser._id;

    if (currentUserId === undefined || currentUserId === null) {
      this.errorMsg = 'Your session is missing. Please log in again.';
      return;
    }

    const newItem: Omit<PostItem, 'id'> = {
      userId: currentUserId,
      name: this.itemName,
      description: this.description,
      image: this.previewImage,
      owner: currentUser.fullname || 'Unknown',
      date: new Date().toLocaleDateString(),
      status: 'available'
    };

    this.isSaving = true;
    this.errorMsg = '';

    this.postService.createPost(newItem).subscribe({
      next: (savedItem: PostItem) => {
        this.postItem.emit(savedItem);
        this.onCancel();
        this.isSaving = false;
      },
      error: (err: unknown) => {
        const errorRecord = err && typeof err === 'object' ? (err as { error?: { message?: string } }) : undefined;
        this.errorMsg = errorRecord?.error?.message || 'Failed to save post.';
        this.isSaving = false;
      }
    });
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.previewImage = e.target.result; // base64 string
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

  removeImage() {
    this.previewImage = '';
  }
}
