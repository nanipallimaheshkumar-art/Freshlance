// FreshLane Express Free Delivery Policy - 100% Free Delivery on All Orders

export function initializeFreeDeliveryTimer(): number {
  return 0;
}

export function isFreeDeliveryActive(): boolean {
  return true;
}

export function getDeliveryFee(_subtotal: number): number {
  return 0;
}

export function getRemainingTime(): { isActive: boolean; seconds: number; formatted: string } {
  return { isActive: true, seconds: 0, formatted: 'FREE' };
}

/**
 * Delivery hook providing Free Delivery across all orders
 */
export function useFreeDeliveryPromotion() {
  return {
    isFreeDeliveryActive: true,
    remainingSeconds: 0,
    formattedTime: '',
    calculateDeliveryFee: (_subtotal: number) => 0,
  };
}

