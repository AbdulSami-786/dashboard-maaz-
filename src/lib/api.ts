import type { AdminUser, Order, Review, WishlistItem } from './types';

const BASE_URL = "https://script.google.com/macros/s/AKfycbwdmBD412KdzkV_oexuWxifu5GaSyglBNNF3HLdoNwKxVUEJkSQ4AF20wMm7RfboQYbmg/exec" as string | undefined;

const ADMIN_USERNAME_STORAGE_KEY = 'mdfashion_admin_username';
const ADMIN_KEY_STORAGE_KEY = 'mdfashion_admin_key';

export function getStoredAdminUsername(): string | null {
  return localStorage.getItem(ADMIN_USERNAME_STORAGE_KEY);
}
export function getStoredAdminKey(): string | null {
  return localStorage.getItem(ADMIN_KEY_STORAGE_KEY);
}
export function setStoredAdminCredentials(username: string, key: string) {
  localStorage.setItem(ADMIN_USERNAME_STORAGE_KEY, username);
  localStorage.setItem(ADMIN_KEY_STORAGE_KEY, key);
}
export function clearStoredAdminKey() {
  localStorage.removeItem(ADMIN_USERNAME_STORAGE_KEY);
  localStorage.removeItem(ADMIN_KEY_STORAGE_KEY);
}

export class ApiError extends Error {}

/**
 * Apps Script web apps don't implement doOptions, so a CORS preflight
 * (triggered by e.g. a JSON content type) fails outright. Sending the body
 * as text/plain keeps this a "simple" cross-origin request — no preflight —
 * while the server still reads e.postData.contents and JSON.parses it fine.
 */
async function call<T>(action: string, payload: Record<string, unknown> = {}): Promise<T> {
  if (!BASE_URL) {
    throw new ApiError('VITE_APPS_SCRIPT_URL is not set. Add it to your .env file.');
  }

 const adminUsername = getStoredAdminUsername();
const adminKey = getStoredAdminKey();
const body: Record<string, unknown> = { action, ...payload };
if (adminUsername && adminKey && action.startsWith('admin')) {
  body.adminUsername = adminUsername;
  body.adminKey = adminKey;
}
  let res: Response;
  try {
    res = await fetch(BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(body),
    });
  } catch {
    throw new ApiError('Could not reach the server. Check your connection and try again.');
  }

  if (!res.ok) {
    throw new ApiError(`Server responded with ${res.status}.`);
  }

  const json = await res.json();
  if (!json.ok) {
    throw new ApiError(json.error || 'Something went wrong.');
  }
  return json as T;
}

/** Throws ApiError with the server's actual message (e.g. "Invalid admin key."
 *  or "Admin key not configured on the server…") so the login screen can show
 *  the real reason instead of a generic failure. */
export async function verifyAdminCredentials(username: string, key: string): Promise<void> {
  await call<{ ok: true; orders: Order[] }>('adminGetOrders', { adminUsername: username, adminKey: key });
}

export async function updateAdminCredentials(newUsername: string, newPassword: string): Promise<void> {
  await call<{ ok: true; username: string }>('adminUpdateCredentials', { newUsername, newPassword });
  // Keep localStorage in sync so the current session doesn't get logged out.
  setStoredAdminCredentials(newUsername, newPassword || getStoredAdminKey()!);
}

export async function fetchOrders(): Promise<Order[]> {
  const res = await call<{ ok: true; orders: Order[] }>('adminGetOrders');
  return res.orders;
}

export async function updateOrderStatus(id: string, status: string): Promise<void> {
  await call<{ ok: true }>('adminUpdateOrderStatus', { id, status });
}

export async function fetchReviews(): Promise<Review[]> {
  const res = await call<{ ok: true; reviews: Review[] }>('adminGetReviews');
  return res.reviews;
}

export async function setReviewApproved(id: string, approved: boolean): Promise<void> {
  await call<{ ok: true }>('adminSetReviewApproved', { id, approved });
}

export async function deleteReview(id: string): Promise<void> {
  await call<{ ok: true }>('adminDeleteReview', { id });
}

export async function fetchUsers(): Promise<AdminUser[]> {
  const res = await call<{ ok: true; users: AdminUser[] }>('adminGetUsers');
  return res.users;
}

export async function setUserSuspended(id: string, suspended: boolean): Promise<void> {
  await call<{ ok: true }>('adminSetUserSuspended', { id, suspended });
}

export async function deleteUser(id: string): Promise<void> {
  await call<{ ok: true }>('adminDeleteUser', { id });
}

export async function fetchWishlist(): Promise<WishlistItem[]> {
  const res = await call<{ ok: true; wishlist: WishlistItem[] }>('adminGetWishlist');
  return res.wishlist;
}
