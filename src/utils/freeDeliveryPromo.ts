// Standard FreshLane Express delivery fee rules (15-min flash promo removed per request)

export function initializeFreeDeliveryTimer(): number {
  return 0;
}

export function isFreeDeliveryActive(): boolean {
  return false;
}

export function getDeliveryFee(subtotal: number): number {
  if (subtotal === 0) return 0;
  return subtotal >= 299 ? 0 : 35;
}

export function getRemainingTime(): { isActive: boolean; seconds: number; formatted: string } {
  return { isActive: false, seconds: 0, formatted: '00:00' };
}

/**
 * Standard delivery hook without artificial 15-min countdown timers
 */
export function useFreeDeliveryPromotion() {
  return {
    isFreeDeliveryActive: false,
    remainingSeconds: 0,
    formattedTime: '',
    calculateDeliveryFee: (subtotal: number) => {
      if (subtotal === 0) return 0;
      return subtotal >= 299 ? 0 : 35;
    },
  };
}

