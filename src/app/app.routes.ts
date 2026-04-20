import { Routes } from '@angular/router';
import { authGuard, adminGuard, guestGuard, userGuard } from '../guards/auth.guard';

import { LoginComponent } from './login/login.component';
import { SigninuserComponent } from './signinuser/signinuser.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { HistoryComponent } from './history/history.component';
import { ProfileBorrowedComponent } from './profileborrowed/profileborrowed.component';
import { ProfileLentComponent } from './profilelent/profilelent.component';
import { ForgotPassEmailComponent } from './forgotpassemail/forgotpassemail.component';
import { ForgotPassOtpComponent } from './forgotpassotp/forgotpassotp.component';
import { ForgotPassNewComponent } from './forgotpassnew/forgotpassnew.component';
import { AdminDashboardComponent } from './admindashboard/admindashboard.component';
import { AdminReviewComponent } from './adminreview/adminreview.component';

export const routes: Routes = [

  // PUBLIC (GUEST ONLY)
  { path: '', component: LoginComponent, canActivate: [guestGuard] },
  { path: 'login', component: LoginComponent, canActivate: [guestGuard] },
  { path: 'signinuser', component: SigninuserComponent, canActivate: [guestGuard] },
  { path: 'forgotpassemail', component: ForgotPassEmailComponent, canActivate: [guestGuard] },
  { path: 'forgotpassotp', component: ForgotPassOtpComponent, canActivate: [guestGuard] },
  { path: 'forgotpassnew', component: ForgotPassNewComponent, canActivate: [guestGuard] },

  // USER ONLY
  { path: 'dashboard', component: DashboardComponent, canActivate: [userGuard] },
  { path: 'history', component: HistoryComponent, canActivate: [userGuard] },
  { path: 'profile', component: ProfileBorrowedComponent, canActivate: [userGuard] },
  { path: 'profile/lent', component: ProfileLentComponent, canActivate: [userGuard] },

  // ADMIN ONLY
  { path: 'admindashboard', component: AdminDashboardComponent, canActivate: [adminGuard] },
  { path: 'adminreview', component: AdminReviewComponent, canActivate: [adminGuard] },

  // FALLBACK
  { path: '**', redirectTo: '' }
];