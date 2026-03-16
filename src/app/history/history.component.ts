import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { LogoutComponent } from '../logout/logout.component';

interface HistoryItem {
  type: 'borrowed' | 'lent';
  item: string;
  person: string;
  date: string;
}

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    LogoutComponent
  ],
  templateUrl: './history.component.html',
  styleUrl: './history.component.scss'
})
export class HistoryComponent {

  showLogoutPopup = false;

  toggleLogout(){
    this.showLogoutPopup = true;
  }

  handleCancel(){
    this.showLogoutPopup = false;
  }

  history: HistoryItem[] = [

    { type: 'borrowed', item: 'Pencil', person: 'Krystal Jung', date: 'February 13, 2026' },
    { type: 'borrowed', item: 'Scissors', person: 'Kissie Ann', date: 'February 08, 2026' },
    { type: 'lent', item: 'T-ruler', person: 'Anton Lee', date: 'February 03, 2026' },
    { type: 'lent', item: 'Ballpen', person: 'Ashton Bayot', date: 'January 28, 2026' },
    { type: 'lent', item: 'Whiteboard Marker', person: 'Nikki Pacatang', date: 'January 17, 2026' },
    { type: 'borrowed', item: 'Lab Gown', person: 'Amber Ainsley Garillos', date: 'January 13, 2026' },
    { type: 'lent', item: 'College Skirt', person: 'Rose Ann', date: 'January 06, 2026' },
    { type: 'borrowed', item: 'Lab Gown', person: 'Amber Ainsley Garillos', date: 'January 04, 2026' },
    { type: 'lent', item: 'Funnel', person: 'Heeseung Lee', date: 'January 03, 2026' },

    /* duplicates for scroll */
    { type: 'borrowed', item: 'Notebook', person: 'Jisoo Kim', date: 'December 28, 2025' },
    { type: 'lent', item: 'Calculator', person: 'Mark Lee', date: 'December 20, 2025' }

  ];

}