import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { PostService } from '../services/post.service';

@Component({
  selector: 'app-adminreview',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './adminreview.component.html',
  styleUrls: ['./adminreview.component.scss']
})
export class AdminReviewComponent implements OnInit {

  private postService = inject(PostService);

  posts: any[] = [];

  ngOnInit() {
    this.postService.getPosts().subscribe({
      next: (data: any[]) => {
        this.posts = data.map(p => ({
          owner: p.owner,
          name: p.name,
          date: new Date(p.date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          }),
          status: p.status
        }));
      },
      error: () => {
        this.posts = [];
      }
    });
  }
}