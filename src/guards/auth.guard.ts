import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

function getUser() {
  try {
    return JSON.parse(
      sessionStorage.getItem('currentUserSession') ||
      localStorage.getItem('currentUser') ||
      '{}'
    );
  } catch {
    return {};
  }
}

function getRole(user: any): 'admin' | 'user' | null {
  if (!user) return null;

  // admin email
  if (user.email === 'liceosharespear@liceo.edu.ph') {
    return 'admin';
  }

  return user?.role || 'user';
}

//GUEST ONLY (login/register)
export const guestGuard: CanActivateFn = () => {
  const router = inject(Router);
  const user = getUser();

  if (user && user.email) {
    const role = getRole(user);

    return role === 'admin'
      ? router.createUrlTree(['/admindashboard'])
      : router.createUrlTree(['/dashboard']);
  }

  return true;
};

// AUTH (logged in users only)
export const authGuard: CanActivateFn = () => {
  const router = inject(Router);
  const user = getUser();

  if (!user || !user.email) {
    return router.createUrlTree(['/login']);
  }

  return true;
};

//ADMIN ONLY
export const adminGuard: CanActivateFn = () => {
  const router = inject(Router);
  const user = getUser();
  const role = getRole(user);

  if (!user || !user.email) {
    return router.createUrlTree(['/login']);
  }

  if (role !== 'admin') {
    return router.createUrlTree(['/dashboard']);
  }

  return true;
};

// USER ONLY
export const userGuard: CanActivateFn = () => {
  const router = inject(Router);
  const user = getUser();
  const role = getRole(user);

  if (!user || !user.email) {
    return router.createUrlTree(['/login']);
  }

  if (role === 'admin') {
    return router.createUrlTree(['/admindashboard']);
  }

  return true;
};