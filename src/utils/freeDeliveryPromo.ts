import { useState, useEffect } from 'react';

const STORAGE_KEY = 'freshlane_free_delivery_until';
const DURATION_MINUTES = 15;

/**
 * Ensures a 15-minute free delivery window is active.
 * If not set or already expired, sets it to 15 minutes from now.
 */
export function initializeFreeDeliveryTimer(): number {
  if (typeof window === 'undefined') {
    return Date.now() + DURATION_MINUTES * 60 * 1000;
  }
  
  const existing = localStorage.getItem(STORAGE_KEY);
  const now = Date.now();
  
  if (existing) {
    const timestamp = parseInt(existing, 10);
    if (!isNaN(timestamp) && timestamp > now) {
      return timestamp;
    }
  }
  
  // Set new 15-minute window starting now
  const newExpiry = now + DURATION_MINUTES * 60 * 1000;
  localStorage.setItem(STORAGE_KEY, newExpiry.toString());
  return newExpiry;
}

export function isFreeDeliveryActive(): boolean {
  if (typeof window === 'undefined') return true;
  const expiry = initializeFreeDeliveryTimer();
  return Date.now() < expiry;
}

export function getDeliveryFee(subtotal: number): number {
  if (subtotal === 0) return 0;
  if (isFreeDeliveryActive()) {
    return 0; // 100% Free delivery during 15-min flash promotion!
  }
  return subtotal >= 299 ? 0 : 35;
}

export function getRemainingTime(): { isActive: boolean; seconds: number; formatted: string } {
  if (typeof window === 'undefined') {
    return { isActive: true, seconds: DURATION_MINUTES * 60, formatted: '15:00' };
  }
  
  const expiry = initializeFreeDeliveryTimer();
  const diff = Math.max(0, Math.floor((expiry - Date.now()) / 1000));
  const isActive = diff > 0;
  
  const mins = Math.floor(diff / 60);
  const secs = diff % 60;
  const formatted = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  
  return { isActive, seconds: diff, formatted };
}

/**
 * React hook that gives real-time seconds countdown for the 15-minute free delivery offer
 */
export function useFreeDeliveryPromotion() {
  const [status, setStatus] = useState(() => getRemainingTime());

  useEffect(() => {
    const interval = setInterval(() => {
      setStatus(getRemainingTime());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return {
    isFreeDeliveryActive: status.isActive,
    remainingSeconds: status.seconds,
    formattedTime: status.formatted,
    calculateDeliveryFee: (subtotal: number) => {
      if (subtotal === 0) return 0;
      return status.isActive ? 0 : subtotal >= 299 ? 0 : 35;
    },
  };
}
