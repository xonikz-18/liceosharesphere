import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { PostService, PostItem } from '../services/post.service';
import { LogoutComponent } from '../logout/logout.component';

@Component({
  selector: 'app-adminreview',
  standalone: true,
  imports: [CommonModule, RouterModule, LogoutComponent],
  templateUrl: './adminreview.component.html',
  styleUrls: ['./adminreview.component.scss']
})
export class AdminReviewComponent implements OnInit {

  private postService = inject(PostService);
  private cdr = inject(ChangeDetectorRef);

  posts: PostItem[] = [];
  isLoading = true;
  selectedPost: PostItem | null = null;
  
  showLogoutPopup = false;

  toggleLogout() {
    this.showLogoutPopup = true;
  }

  handleCancel() {
    this.showLogoutPopup = false;
  }

  ngOnInit() {
    // realtime from service
    this.postService.postsChanged$.subscribe(posts => {
      this.posts = posts;
      this.isLoading = false;
      this.cdr.detectChanges();
    });

    // initial load
    this.postService.getPosts().subscribe();

    setInterval(() => {
      this.postService.getPosts().subscribe();
    }, 3000); // every 3 sec
  }

  openModal(item: PostItem) {
    this.selectedPost = item;
  }

  closeModal() {
    this.selectedPost = null;
  }

  deletePost() {
  if (!this.selectedPost) return;

  const deletedId = this.selectedPost.id;

  this.posts = this.posts.filter(p => String(p.id) !== String(deletedId));

  // optional: close modal agad
  this.closeModal();
  this.cdr.detectChanges();

  this.postService.deletePost(deletedId).subscribe({
    next: () => {
      // success — nothing to do
    },
    error: () => {
      this.postService.getPosts().subscribe(data => this.posts = data);
    }
  });
}

  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric'
    });
  }
}


