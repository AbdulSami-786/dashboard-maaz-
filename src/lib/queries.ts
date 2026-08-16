import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  deleteReview,
  deleteUser,
  fetchOrders,
  fetchReviews,
  fetchUsers,
  fetchWishlist,
  setReviewApproved,
  setUserSuspended,
  updateOrderStatus,
} from './api';

export function useOrders() {
  return useQuery({ queryKey: ['orders'], queryFn: fetchOrders, refetchInterval: 60_000 });
}

export function useReviews() {
  return useQuery({ queryKey: ['reviews'], queryFn: fetchReviews, refetchInterval: 60_000 });
}

export function useUsers() {
  return useQuery({ queryKey: ['users'], queryFn: fetchUsers, refetchInterval: 60_000 });
}

export function useWishlist() {
  return useQuery({ queryKey: ['wishlist'], queryFn: fetchWishlist, refetchInterval: 60_000 });
}

export function useUpdateOrderStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => updateOrderStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['orders'] }),
  });
}

export function useSetReviewApproved() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, approved }: { id: string; approved: boolean }) => setReviewApproved(id, approved),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reviews'] }),
  });
}

export function useDeleteReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteReview(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reviews'] }),
  });
}

export function useSetUserSuspended() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, suspended }: { id: string; suspended: boolean }) => setUserSuspended(id, suspended),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteUser(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });
}
