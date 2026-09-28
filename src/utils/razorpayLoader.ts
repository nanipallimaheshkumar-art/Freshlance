/**
 * FreshLane Razorpay SDK Dynamic On-Demand Loader
 * Defers loading checkout.razorpay.com/v1/checkout.js until the user reaches the checkout stage,
 * saving ~220 KiB of network payload on initial page load.
 */

let razorpayScriptPromise: Promise<boolean> | null = null;

export function loadRazorpaySdk(): Promise<boolean> {
  if (typeof window === 'undefined') {
    return Promise.resolve(false);
  }

  // If already available on window object
  if (typeof (window as any).Razorpay === 'function') {
    return Promise.resolve(true);
  }

  // Return ongoing loading promise if in progress
  if (razorpayScriptPromise) {
    return razorpayScriptPromise;
  }

  razorpayScriptPromise = new Promise<boolean>((resolve) => {
    // Check if script tag is already in DOM
    const existingScript = document.querySelector<HTMLScriptElement>('script[src*="checkout.razorpay.com"]');
    if (existingScript) {
      if (typeof (window as any).Razorpay === 'function') {
        resolve(true);
        return;
      }
      existingScript.addEventListener('load', () => resolve(true), { once: true });
      existingScript.addEventListener('error', () => {
        razorpayScriptPromise = null;
        resolve(false);
      }, { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.defer = true;
    script.crossOrigin = 'anonymous';

    script.onload = () => {
      resolve(true);
    };

    script.onerror = (err) => {
      console.warn('[FreshLane] Unable to fetch Razorpay Checkout script dynamically:', err);
      razorpayScriptPromise = null;
      resolve(false);
    };

    document.head.appendChild(script);
  });

  return razorpayScriptPromise;
}

export function isRazorpayLoaded(): boolean {
  return typeof window !== 'undefined' && typeof (window as any).Razorpay === 'function';
}
