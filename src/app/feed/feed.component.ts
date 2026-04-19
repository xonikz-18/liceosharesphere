import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PostItem, PostService } from '../services/post.service';

@Component({
  selector: 'app-feed',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './feed.component.html',
  styleUrls: ['./feed.component.scss']
})
export class FeedComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);

  posts: PostItem[] = [];
  isLoading: boolean = false;
  errorMessage: string = '';

  constructor(private postService: PostService) {}

  ngOnInit() {
    this.posts = this.postService.getCachedPosts();

    this.postService.postsChanged$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((posts) => {
        this.posts = posts;
      });

    this.loadPosts();
  }

  loadPosts() {
    this.isLoading = true;
    this.errorMessage = '';
    const cachedPosts = this.postService.getCachedPosts();
    this.postService.getPosts().subscribe({
      next: (posts) => {
        this.posts = posts;
        this.isLoading = false;
      },
      error: () => {
        this.posts = cachedPosts;
        this.errorMessage = '';
        this.isLoading = false;
      }
    });
  }
  
  addPost(newPost: PostItem) {
    this.posts.unshift(newPost);
  }
}
