import { Component, AfterViewInit, OnInit, DestroyRef, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { interval } from 'rxjs';
import Chart from 'chart.js/auto';
import { LogoutComponent } from '../logout/logout.component';
import { AdminReviewComponent } from '../adminreview/adminreview.component';
import { PostItem, PostService } from '../services/post.service';
import { ProfileService } from '../services/profile.service';

const ADMIN_EMAIL = 'npacatang89487@liceo.edu.ph';

@Component({
  selector: 'app-admindashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    LogoutComponent,
    AdminReviewComponent
  ],
  templateUrl: './admindashboard.component.html',
  styleUrls: ['./admindashboard.component.scss']
})
export class AdminDashboardComponent implements OnInit, AfterViewInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly postService = inject(PostService);
  private readonly profileService = inject(ProfileService);

  private chart: Chart | null = null;
  private chartCanvasReady = false;
  private cdr = inject(ChangeDetectorRef);

  posts: PostItem[] = [];
  currentUserId: number | string | null = null;
  isLoading = false;
  errorMessage = '';
  selectedItem: PostItem | null = null;

  /* ================= LOGOUT ================= */

  showLogoutPopup = false;

  toggleLogout() {
    this.showLogoutPopup = true;
  }

  handleCancel() {
    this.showLogoutPopup = false;
  }

  ngOnInit(): void {
    this.currentUserId = this.getCurrentUserId();

    this.postService.postsChanged$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((posts) => {
        this.posts = posts;
        this.updateChart();
      });

    this.postService.syncFromCache();
    this.loadPosts();

    interval(15000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.loadPosts();
      });
  }

  ngAfterViewInit(): void {
    this.chartCanvasReady = true;
    this.createChart();
  }

  private getCurrentUserId(): number | string | null {
    const profile = this.profileService.getProfileSnapshot();
    return profile?.id ?? profile?.userId ?? profile?.user_id ?? profile?._id ?? null;
  }

  loadPosts(): void {
    this.isLoading = true;
    this.errorMessage = '';

    const cachedPosts = this.postService.getCachedPosts();
    if (cachedPosts.length) {
      this.posts = cachedPosts;
      this.updateChart();
  
    }

    this.postService.getPosts().subscribe({
      next: (posts) => {
        this.posts = posts;
        this.updateChart();
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.errorMessage = 'Unable to load post listings at this time.';
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  private getMonthlyCounts(): number[] {
    const monthCounts = Array(12).fill(0);

    for (const post of this.posts) {
      const parsedDate = new Date(post.date);
      if (!Number.isNaN(parsedDate.getTime())) {
        monthCounts[parsedDate.getMonth()] += 1;
      }
    }

    return monthCounts;
  }

  private buildChartData() {
    return {
      labels: [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ],
      datasets: [
        {
          label: 'Total Listings',
          data: this.getMonthlyCounts(),
          borderColor: '#f7b733',
          backgroundColor: 'rgba(247,183,51,0.3)',
          tension: 0.4,
          pointRadius: 6,
          pointHoverRadius: 10
        }
      ]
    };
  }

  private createChart(): void {
    if (!this.chartCanvasReady) {
      return;
    }

    const canvas = document.getElementById('listingChart') as HTMLCanvasElement;
    if (!canvas) {
      return;
    }

    if (this.chart) {
      this.chart.destroy();
    }

    this.chart = new Chart(canvas, {
      type: 'line',
      data: this.buildChartData(),
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animations: {
          tension: {
            duration: 1000,
            easing: 'linear',
            from: 1,
            to: 0
          }
        },
        scales: {
          y: {
            beginAtZero: false,
            min: 1,
            max: 100,
            ticks: {
              stepSize: 10
            }
          }
        }
      }
    });
  }

  private updateChart(): void {
    if (!this.chart) {
      this.createChart();
      return;
    }

    this.chart.data = this.buildChartData();
    this.chart.update();
  }

  openItem(item: PostItem) {
    this.selectedItem = item;
  }

  closeModal() {
    this.selectedItem = null;
  }

  deleteItem(item?: PostItem) {
    const target = item ?? this.selectedItem;
    if (!target || !this.currentUserId) {
      return;
    }

    this.postService.removeCachedPost(target.id);
    this.posts = this.posts.filter((post) => String(post.id) !== String(target.id));
    this.updateChart();
    this.closeModal();

    this.postService.deletePost(target.id, this.currentUserId).subscribe({
      next: () => {
        this.loadPosts();
      },
      error: () => {
        this.errorMessage = 'Unable to delete this post. Please try again.';
        this.postService.restoreCachedPost(target);
        this.posts = [...this.postService.getCachedPosts()];
        this.updateChart();
      }
    });
  }
}
