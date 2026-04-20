import { Component, AfterViewInit, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import Chart from 'chart.js/auto';
import { LogoutComponent } from '../logout/logout.component';
import { PostItem, PostService } from '../services/post.service';

@Component({
  selector: 'app-admindashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, LogoutComponent],
  templateUrl: './admindashboard.component.html',
  styleUrls: ['./admindashboard.component.scss']
})
export class AdminDashboardComponent implements OnInit, AfterViewInit {

  private postService = inject(PostService);
  private cdr = inject(ChangeDetectorRef);

  posts: PostItem[] = [];
  chart: Chart | null = null;
  chartReady = false;

  totalListings = 0;
  totalBorrowed = 0;
  totalLent = 0;

  showLogoutPopup = false;

  toggleLogout() {
    this.showLogoutPopup = true;
  }

  handleCancel() {
    this.showLogoutPopup = false;
  }

  ngOnInit() {
    this.postService.postsChanged$.subscribe(posts => {
      this.posts = posts;

      this.totalListings = posts.length;
      this.totalBorrowed = posts.filter(p => p.status === 'borrowed').length;
      this.totalLent = posts.filter(p => p.status === 'available').length;

      this.updateChart();
      this.cdr.detectChanges();
    });

    this.postService.getPosts().subscribe();

  }

  ngAfterViewInit() {
    this.chartReady = true;
    this.createChart();
  }

  loadPosts() {
    this.postService.getPosts().subscribe(posts => {
      this.posts = posts;

      this.totalListings = posts.length;
      this.totalBorrowed = posts.filter(p => p.status === 'borrowed').length;
      this.totalLent = posts.filter(p => p.status === 'available').length;

      this.updateChart();
      this.cdr.detectChanges();
    });
  }

  private getMonthly(type?: string) {
    const data = Array(12).fill(0);

    for (const p of this.posts) {
      const d = new Date(p.date);
      if (!isNaN(d.getTime())) {
        if (!type || p.status === type) {
          data[d.getMonth()]++;
        }
      }
    }

    return data;
  }

  private buildChartData() {
    return {
      labels: [
        'January','February','March','April','May','June',
        'July','August','September','October','November','December'
      ],
      datasets: [
        {
          label: 'Total Listings',
          data: this.getMonthly(),
          borderColor: '#000',
          tension: 0.4
        },
        {
          label: 'Total Borrowed',
          data: this.getMonthly('borrowed'),
          borderColor: '#f7b733',
          tension: 0.4
        },
        {
          label: 'Total Available Items',
          data: this.getMonthly('available'),
          borderColor: '#7c0000',
          tension: 0.4
        }
      ]
    };
  }

  private createChart() {
    if (!this.chartReady) return;

    const canvas = document.getElementById('listingChart') as HTMLCanvasElement;
    if (!canvas) return;

    if (this.chart) this.chart.destroy();

    this.chart = new Chart(canvas, {
      type: 'line',
      data: this.buildChartData(),
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'top'
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            max: 100,
            ticks: {
              stepSize: 1
            }
          }
        }
      }
    });
  }

  private updateChart() {
  if (!this.chart) {
    this.createChart();
    return;
  }

  const newData = this.buildChartData();

  if (JSON.stringify(this.chart.data.datasets) === JSON.stringify(newData.datasets)) {
    return;
  }

  this.chart.data = newData;
  this.chart.update();
}
}