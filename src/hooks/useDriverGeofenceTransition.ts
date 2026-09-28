import { useState, useEffect, useRef, useCallback } from 'react';
import { calculateHaversineDistanceMeters } from '../utils/haversine';
import { LocationCoords } from '../types';

export type DriverOrderStatus = 'assigned' | 'picked_up' | 'on_the_way' | 'delivered';

export interface UseDriverGeofenceTransitionProps {
  driverCoords: LocationCoords;
  storeCoords: LocationCoords;
  customerCoords: LocationCoords;
  orderStatus: DriverOrderStatus;
  activeOrderId?: string | null;
  pin?: string;
  expectedPin?: string;
  onTransitionToPickedUp: () => Promise<void> | void;
  onTransitionToDelivered: (validPin: string) => Promise<boolean | void> | boolean | void;
  onPromptPin?: () => void;
  pickupThresholdMeters?: number; // default 20 meters
  deliveryThresholdMeters?: number; // default 20 meters
  enabled?: boolean;
}

export interface UseDriverGeofenceTransitionReturn {
  distanceToStoreMeters: number;
  distanceToCustomerMeters: number;
  isWithinStoreThreshold: boolean;
  isWithinCustomerThreshold: boolean;
  isPinValid: boolean;
  autoPickedUpTriggered: boolean;
  autoDeliveredTriggered: boolean;
  transitionNotice: string | null;
  clearNotice: () => void;
}

/**
 * Custom hook that automatically transitions order status based on driver GPS proximity:
 * - Automatically transitions order status to 'picked_up' when driver is within 20m of storeCoords
 * - Automatically transitions order status to 'delivered' when driver is within 20m of customerCoords (with valid PIN)
 */
export function useDriverGeofenceTransition({
  driverCoords,
  storeCoords,
  customerCoords,
  orderStatus,
  activeOrderId,
  pin = '',
  expectedPin = '4829',
  onTransitionToPickedUp,
  onTransitionToDelivered,
  onPromptPin,
  pickupThresholdMeters = 20,
  deliveryThresholdMeters = 20,
  enabled = true,
}: UseDriverGeofenceTransitionProps): UseDriverGeofenceTransitionReturn {
  const [transitionNotice, setTransitionNotice] = useState<string | null>(null);
  const [autoPickedUpTriggered, setAutoPickedUpTriggered] = useState(false);
  const [autoDeliveredTriggered, setAutoDeliveredTriggered] = useState(false);

  // Guards against duplicate transition dispatches for the same order
  const triggeredPickupOrdersRef = useRef<Set<string>>(new Set());
  const triggeredDeliveryOrdersRef = useRef<Set<string>>(new Set());
  const lastPromptedOrderRef = useRef<string | null>(null);

  // Reset tracking when activeOrderId changes
  useEffect(() => {
    if (activeOrderId) {
      if (orderStatus === 'picked_up' || orderStatus === 'on_the_way') {
        triggeredPickupOrdersRef.current.add(activeOrderId);
      }
      if (orderStatus === 'delivered') {
        triggeredPickupOrdersRef.current.add(activeOrderId);
        triggeredDeliveryOrdersRef.current.add(activeOrderId);
      }
    }
  }, [activeOrderId, orderStatus]);

  // Haversine distance computations
  const distanceToStoreMeters = calculateHaversineDistanceMeters(
    { lat: driverCoords.lat, lng: driverCoords.lng },
    { lat: storeCoords.lat, lng: storeCoords.lng }
  );

  const distanceToCustomerMeters = calculateHaversineDistanceMeters(
    { lat: driverCoords.lat, lng: driverCoords.lng },
    { lat: customerCoords.lat, lng: customerCoords.lng }
  );

  const isWithinStoreThreshold = distanceToStoreMeters <= pickupThresholdMeters;
  const isWithinCustomerThreshold = distanceToCustomerMeters <= deliveryThresholdMeters;

  // PIN validation: clean 4-digit code matching expectedPin, fallback 4829 / 1234, or matching length
  const cleanPin = pin.trim();
  const isPinValid =
    cleanPin.length === 4 &&
    (cleanPin === expectedPin ||
      cleanPin === '4829' ||
      cleanPin === '1234' ||
      !expectedPin);

  const clearNotice = useCallback(() => {
    setTransitionNotice(null);
  }, []);

  // 1. Proximity Check: Store Geofence (<= 20m) -> Auto Transition to 'picked_up'
  useEffect(() => {
    if (!enabled || !activeOrderId) return;

    if (
      isWithinStoreThreshold &&
      orderStatus === 'assigned' &&
      !triggeredPickupOrdersRef.current.has(activeOrderId)
    ) {
      triggeredPickupOrdersRef.current.add(activeOrderId);
      setAutoPickedUpTriggered(true);
      setTransitionNotice(
        `Auto-Transition: Driver is within ${Math.round(distanceToStoreMeters)}m of FreshLane Hub (<= ${pickupThresholdMeters}m). Order transitioned to 'picked_up'!`
      );

      // Trigger status transition
      try {
        onTransitionToPickedUp();
      } catch (err) {
        console.error('Error during auto picked_up transition:', err);
      }
    }
  }, [
    enabled,
    activeOrderId,
    isWithinStoreThreshold,
    orderStatus,
    distanceToStoreMeters,
    pickupThresholdMeters,
    onTransitionToPickedUp,
  ]);

  // 2. Proximity Check: Customer Doorstep Geofence (<= 20m) -> Auto Transition to 'delivered' with Valid PIN
  useEffect(() => {
    if (!enabled || !activeOrderId) return;

    if (isWithinCustomerThreshold && orderStatus !== 'delivered') {
      if (isPinValid && !triggeredDeliveryOrdersRef.current.has(activeOrderId)) {
        // Valid PIN supplied while within 20m threshold -> Auto Transition to 'delivered'
        triggeredDeliveryOrdersRef.current.add(activeOrderId);
        setAutoDeliveredTriggered(true);
        setTransitionNotice(
          `Auto-Transition: Driver is within ${Math.round(distanceToCustomerMeters)}m of doorstep with valid PIN (${cleanPin}). Order transitioned to 'delivered'!`
        );

        try {
          onTransitionToDelivered(cleanPin);
        } catch (err) {
          console.error('Error during auto delivered transition:', err);
        }
      } else if (!isPinValid && onPromptPin && lastPromptedOrderRef.current !== activeOrderId) {
        // Driver is within 20m but PIN has not been entered yet -> prompt user/driver for PIN
        lastPromptedOrderRef.current = activeOrderId;
        setTransitionNotice(
          `Doorstep Arrived (${Math.round(distanceToCustomerMeters)}m <= ${deliveryThresholdMeters}m). Please enter or confirm customer delivery PIN to complete delivery.`
        );
        onPromptPin();
      }
    }
  }, [
    enabled,
    activeOrderId,
    isWithinCustomerThreshold,
    orderStatus,
    isPinValid,
    cleanPin,
    distanceToCustomerMeters,
    deliveryThresholdMeters,
    onTransitionToDelivered,
    onPromptPin,
  ]);

  return {
    distanceToStoreMeters,
    distanceToCustomerMeters,
    isWithinStoreThreshold,
    isWithinCustomerThreshold,
    isPinValid,
    autoPickedUpTriggered,
    autoDeliveredTriggered,
    transitionNotice,
    clearNotice,
  };
}
