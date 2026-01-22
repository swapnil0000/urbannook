import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useGetUserProfileQuery } from '../store/api/userApi';
import { syncCartFromProfile } from '../store/slices/cartSlice';

export const useCartSync = () => {
  // Temporarily disable cart sync to prevent issues
  return null;
};