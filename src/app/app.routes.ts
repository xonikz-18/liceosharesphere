import { Routes } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { VerifyemailComponent } from './verifyemail/verifyemail.component';
import { SigninuserComponent } from './signinuser/signinuser.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { HistoryComponent } from './history/history.component';
import { LogoutComponent } from './logout/logout.component';
import { AddComponent } from './add/add.component';
import { NotificationComponent } from './notification/notification.component';
import { MessageComponent } from './message/message.component';
import { ProfileBorrowedComponent } from './profileborrowed/profileborrowed.component';
import { ProfileLentComponent } from './profilelent/profilelent.component';
import { EditItemComponent } from './edititem/edititem.component';

export const routes: Routes = [
  { path: '', component: LoginComponent },

  { path: 'verifyemail', component: VerifyemailComponent },

  { path: 'signinuser', component: SigninuserComponent },

  { path: 'dashboard', component: DashboardComponent },

  { path: 'history', component: HistoryComponent },

  { path: 'profile', component: ProfileBorrowedComponent },

  { path: 'profile/lent', component: ProfileLentComponent },

  { path: 'edit-item/:id', component: EditItemComponent },

  { path: 'logout', component: LogoutComponent },

  { path: 'add', component: AddComponent },

  { path: 'notification', component: NotificationComponent },

  { path: 'message', component: MessageComponent },

  { path: '**', redirectTo: '' }
];