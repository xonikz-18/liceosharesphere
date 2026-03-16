import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

interface LentItem {
  name: string;
  status: string;
  image: string;
}

@Component({
  selector: 'app-profilelent',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './profilelent.component.html',
  styleUrl: './profilelent.component.scss'
})
export class ProfileLentComponent {

  lent: LentItem[] = [
    { name: 'P.E Uniform', status: 'Available', image: 'peuniform.png' },
    { name: 'P.E Uniform', status: 'Returned', image: 'peuniform.png' },
    { name: 'P.E Uniform', status: 'Returned', image: 'peuniform.png' },
  ];

}