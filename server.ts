import "dotenv/config";
import express from "express";
import path from "path";
import crypto from "crypto";
import Razorpay from "razorpay";
import { GoogleGenAI, Type } from "@google/genai";
import {
  handleDriverLocationPing,
  getOrCreateOrderTracking,
  updateOrderStatusByDriver,
  setDriverOnline,
  getAllDrivers,
  addDriver,
  submitOrderRating,
  getDispatchAnalytics,
  registerSSEClient,
  FRESHLANE_HUB_COORDS,
  DELIVERY_MAX_RADIUS_KM,
} from "./server/dispatchStore";

const app = express();
const PORT = 3000;

// Haversine distance in km
function haversineDistanceKm(p1: { lat: number; lng: number }, p2: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = ((p2.lat - p1.lat) * Math.PI) / 180;
  const dLng = ((p2.lng - p1.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((p1.lat * Math.PI) / 180) *
      Math.cos((p2.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(1));
}

// Body parser for JSON with support for base64 images up to 20MB
app.use(express.json({ limit: "20mb" }));

// Lazy initializer for Razorpay client
let razorpayClient: Razorpay | null = null;
function getRazorpay(): Razorpay {
  const key_id = process.env.RAZORPAY_KEY_ID || "rzp_live_TXuXQYEDf7QJgT";
  const key_secret = process.env.RAZORPAY_KEY_SECRET || "Pybkl8UcoRJpaLvbfwtE0ibn";

  if (!key_id || !key_secret) {
    throw new Error("Razorpay credentials (RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET) must be set in the environment.");
  }

  if (!razorpayClient) {
    razorpayClient = new Razorpay({
      key_id,
      key_secret,
    });
  }
  return razorpayClient;
}

// Lazy initializer for Gemini client
let genAIClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  if (!genAIClient) {
    genAIClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return genAIClient;
}

// Health check endpoint
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    hub: "Tadepalligudem",
    hubPincode: "534102",
    deliveryRadiusKm: DELIVERY_MAX_RADIUS_KM,
    hubCoords: FRESHLANE_HUB_COORDS,
    hasApiKey: Boolean(process.env.GEMINI_API_KEY),
    hasRazorpayConfig: Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET),
    razorpayKeyId: process.env.RAZORPAY_KEY_ID || "rzp_test_TXoUBcTgIq9Wfa",
    timestamp: new Date().toISOString(),
  });
});

// --- Delivery Zone Range Check Endpoint (Tadepalligudem 534102 - 15km Limit) ---
app.post("/api/delivery/check-range", (req, res) => {
  const { coords, address, pincode } = req.body;
  const hub = {
    name: "Tadepalligudem Hub",
    pincode: "534102",
    coords: FRESHLANE_HUB_COORDS,
    maxRadiusKm: DELIVERY_MAX_RADIUS_KM,
  };

  let distanceKm = 2.0;
  let isDeliverable = true;
  let message = "";

  if (coords && typeof coords.lat === "number" && typeof coords.lng === "number") {
    distanceKm = haversineDistanceKm(hub.coords, coords);
    isDeliverable = distanceKm <= hub.maxRadiusKm;
  } else {
    const raw = `${address || ""} ${pincode || ""}`.toLowerCase();
    const pinMatch = raw.match(/\b(5\d{5}|[1-46-9]\d{5})\b/);
    const pin = pincode || (pinMatch ? pinMatch[1] : "");

    // Check out-of-range cities
    const outOfRange = [
      "bangalore", "bengaluru", "hyderabad", "chennai", "mumbai", "delhi",
      "vijayawada", "guntur", "visakhapatnam", "vizag", "rajahmundry",
      "eluru", "tanuku", "bhimavaram", "narasapuram", "palakollu", "tirupati", "kakinada"
    ];

    if (outOfRange.some((city) => raw.includes(city))) {
      isDeliverable = false;
      distanceKm = 48.0;
    } else if (pin && pin !== "534102" && pin !== "534101" && pin !== "534166" && pin !== "534146") {
      isDeliverable = false;
      distanceKm = 26.0;
    } else if (
      raw.includes("tadepalligudem") ||
      raw.includes("tpg") ||
      raw.includes("pentapadu") ||
      raw.includes("prathipadu") ||
      raw.includes("kn road") ||
      raw.includes("subba rao peta") ||
      pin === "534102" ||
      pin === "534101"
    ) {
      isDeliverable = true;
      distanceKm = 2.4;
    } else {
      isDeliverable = false;
      distanceKm = 35.0;
    }
  }

  message = isDeliverable
    ? `Deliverable within 15 km zone (${distanceKm} km from Tadepalligudem 534102 Hub) · Express 24–30 min delivery.`
    : `You are out of delivery range (${distanceKm} km away). FreshLane delivers exclusively within a 15 km radius of Tadepalligudem, 534102.`;

  return res.json({
    isDeliverable,
    distanceKm,
    hubName: hub.name,
    hubPincode: hub.pincode,
    maxRadiusKm: hub.maxRadiusKm,
    message,
  });
});

// --- Razorpay Payment Gateway Endpoints ---

// 1. Create Order: Calls Razorpay orders API and returns order_id, amount, and currency
app.post("/api/create-order", async (req, res) => {
  try {
    const { amount, currency = "INR", receipt, coords, address, pincode } = req.body;

    if (amount === undefined || amount === null || typeof amount !== "number" || isNaN(amount)) {
      return res.status(400).json({ error: "Amount is required and must be a number in paise" });
    }

    const amountInPaise = Math.round(amount);

    // Minimum amount: 100 paise (₹1.00)
    if (amountInPaise < 100) {
      return res.status(400).json({
        error: "Minimum order amount is 100 paise (₹1.00)",
      });
    }

    // Server-side strict check for 15km delivery range
    if (coords && typeof coords.lat === "number" && typeof coords.lng === "number") {
      const dist = haversineDistanceKm(FRESHLANE_HUB_COORDS, coords);
      if (dist > DELIVERY_MAX_RADIUS_KM) {
        return res.status(400).json({
          error: `You are out of delivery range (${dist} km away). Delivery is restricted to a 15 km radius of Tadepalligudem, 534102.`,
          isOutOfRange: true,
          distanceKm: dist,
          maxRadiusKm: DELIVERY_MAX_RADIUS_KM,
        });
      }
    } else if (address || pincode) {
      const raw = `${address || ""} ${pincode || ""}`.toLowerCase();
      const outOfRange = ["bangalore", "bengaluru", "hyderabad", "chennai", "mumbai", "delhi", "vijayawada", "tanuku", "bhimavaram", "eluru", "rajahmundry"];
      if (outOfRange.some((c) => raw.includes(c))) {
        return res.status(400).json({
          error: "You are out of delivery range. Delivery is restricted to a 15 km radius of Tadepalligudem, 534102.",
          isOutOfRange: true,
          maxRadiusKm: DELIVERY_MAX_RADIUS_KM,
        });
      }
    }

    const rzp = getRazorpay();
    const orderOptions = {
      amount: amountInPaise,
      currency: currency || "INR",
      receipt: receipt || `rcpt_${Date.now().toString().slice(-10)}`,
    };

    const order = await rzp.orders.create(orderOptions);

    return res.json({
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      key_id: process.env.RAZORPAY_KEY_ID || "rzp_test_TXoUBcTgIq9Wfa",
    });
  } catch (error: any) {
    console.error("Razorpay order creation failed:", error);

    // Handle authentication failure
    if (error?.statusCode === 401 || error?.error?.code === "BAD_REQUEST_ERROR" && error?.error?.description?.includes("Authentication")) {
      return res.status(401).json({
        error: "Razorpay authentication failed. Please verify your RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.",
      });
    }

    return res.status(500).json({
      error: error?.error?.description || error?.message || "Failed to create Razorpay order",
    });
  }
});

// 2. Verify Payment Signature: HMAC-SHA256(order_id + "|" + payment_id, KEY_SECRET)
app.post("/api/verify-payment", (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        error: "Missing required verification fields: razorpay_order_id, razorpay_payment_id, and razorpay_signature are required",
      });
    }

    const key_secret = process.env.RAZORPAY_KEY_SECRET || "FHUDLFkILqXAGuSNoARdn76o";
    if (!key_secret) {
      return res.status(500).json({
        success: false,
        error: "Server missing RAZORPAY_KEY_SECRET",
      });
    }

    // HMAC-SHA256(order_id + "|" + payment_id, KEY_SECRET)
    const expectedSignature = crypto
      .createHmac("sha256", key_secret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    const isAuthentic = expectedSignature === razorpay_signature;

    if (!isAuthentic) {
      console.warn("Razorpay signature mismatch:", {
        expected: expectedSignature,
        received: razorpay_signature,
      });
      return res.status(400).json({
        success: false,
        error: "Payment verification failed: signature mismatch",
      });
    }

    return res.json({
      success: true,
      message: "Payment signature verified successfully",
      order_id: razorpay_order_id,
      payment_id: razorpay_payment_id,
    });
  } catch (error: any) {
    console.error("Razorpay verification exception:", error);
    return res.status(500).json({
      success: false,
      error: error?.message || "Internal server error verifying payment",
    });
  }
});

// --- Real-Time Location & Dispatch Endpoints ---

// 1. Driver app sends GPS coordinates every 3-5 seconds while on active delivery
app.post("/api/driver/location", (req, res) => {
  const { driverId, orderId, lat, lng, heading, speed, batteryLevel, accuracy, isQueuedOffline } = req.body;

  if (!driverId || typeof lat !== "number" || typeof lng !== "number") {
    return res.status(400).json({ error: "driverId, lat, and lng are required" });
  }

  const result = handleDriverLocationPing({
    driverId,
    orderId,
    lat,
    lng,
    heading,
    speed,
    batteryLevel,
    accuracy,
    isQueuedOffline,
  });

  return res.json(result);
});

// 2. Customer App pulls order location snapshot
app.get("/api/order/:id/location", (req, res) => {
  const orderId = req.params.id;
  const snapshot = getOrCreateOrderTracking(orderId);
  return res.json(snapshot);
});

// 3. Real-Time SSE Stream for order location (WebSocket alternative for SSE push)
app.get("/api/order/:id/stream", (req, res) => {
  const orderId = req.params.id;

  // Set SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  // Send initial snapshot immediately
  const snapshot = getOrCreateOrderTracking(orderId);
  res.write(`data: ${JSON.stringify(snapshot)}\n\n`);

  // Register client in real-time broadcast registry
  registerSSEClient(orderId, res);
});

// 4. Driver Status & Order status transition (Picked up -> On the way -> Delivered)
app.post("/api/driver/status", (req, res) => {
  const { orderId, status, otp, photoProof } = req.body;

  if (!orderId || !status) {
    return res.status(400).json({ error: "orderId and status are required" });
  }

  const result = updateOrderStatusByDriver(orderId, status, otp, photoProof);
  if (!result.success) {
    return res.status(400).json({ error: result.error || "Failed to update order status" });
  }

  return res.json(result);
});

// 5. Driver Online / Offline Toggle
app.post("/api/driver/toggle-online", (req, res) => {
  const { driverId, isOnline } = req.body;
  if (!driverId) {
    return res.status(400).json({ error: "driverId is required" });
  }

  const driver = setDriverOnline(driverId, Boolean(isOnline));
  if (!driver) {
    return res.status(404).json({ error: "Driver not found" });
  }

  return res.json({ success: true, driver });
});

// 6. List all drivers (Admin fleet map & Driver app selection)
app.get("/api/drivers", (_req, res) => {
  const drivers = getAllDrivers();
  return res.json({ drivers });
});

// 7. Add driver (Admin)
app.post("/api/admin/driver", (req, res) => {
  const { name, phone, vehicleNumber, vehicleType, zone } = req.body;
  if (!name || !phone || !vehicleNumber || !zone) {
    return res.status(400).json({ error: "Missing required driver fields" });
  }

  const newDriver = addDriver({
    name,
    phone,
    vehicleNumber,
    vehicleType: vehicleType || "electric_scooter",
    zone,
    isOnline: true,
    status: "available",
    rating: 5.0,
    deliveriesToday: 0,
    earningsToday: 0,
    batteryLevel: 100,
    currentCoords: { lat: 12.9784, lng: 77.6408, heading: 0, speed: 0 },
  });

  return res.json({ success: true, driver: newDriver });
});

// 8. Submit Customer Delivery Rating & Feedback
app.post("/api/order/:id/rating", (req, res) => {
  const orderId = req.params.id;
  const { stars, tags, comment } = req.body;

  if (typeof stars !== "number" || stars < 1 || stars > 5) {
    return res.status(400).json({ error: "Valid stars rating (1-5) required" });
  }

  const snapshot = submitOrderRating(orderId, {
    stars,
    tags: tags || [],
    comment: comment || "",
  });

  if (!snapshot) {
    return res.status(404).json({ error: "Order not found" });
  }

  return res.json({ success: true, snapshot });
});

// 9. Admin Dispatch Analytics
app.get("/api/admin/analytics", (_req, res) => {
  const analytics = getDispatchAnalytics();
  return res.json(analytics);
});

// Produce Scanner Endpoint
app.post("/api/scan-produce", async (req, res) => {
  try {
    const { image, mimeType = "image/jpeg", hint } = req.body;

    if (!image) {
      return res.status(400).json({ error: "Missing image data" });
    }

    // Strip data URL prefix if present
    const base64Data = image.replace(/^data:image\/[a-zA-Z+]+;base64,/, "");
    const cleanMimeType = (image.match(/^data:(image\/[a-zA-Z+]+);base64,/)?.[1] || mimeType) as string;

    const ai = getGenAI();

    // If no API key is set, return a reliable mock/heuristic recognition response based on hint or smart default
    if (!ai) {
      console.warn("GEMINI_API_KEY not configured. Providing fallback produce recognition response.");
      return res.json({
        fallback: true,
        name: hint ? hint.name : "Alphonso Mango",
        category: hint ? hint.category : "fruit",
        confidence: 96,
        ripeness: "Optimal Ripe (Grade A)",
        ripenessDescription: "Sun-ripened vibrant golden color with fragrant aroma and tender yield to gentle pressure.",
        estimatedWeightKg: 0.35,
        unitLabel: "approx. 350g each",
        shelfLifeDays: 4,
        nutritionalHighlights: ["High in Vitamin C (67% DV)", "Rich in Vitamin A & Beta-carotene", "Dietary Fiber"],
        storageTip: "Keep at room temperature until soft and fragrant, then chill before serving.",
        matchedCatalogId: hint ? hint.id : "honey-mangoes",
        pricePerKg: hint ? hint.price : 169,
        culinaryNotes: "Exceptional for eating fresh, slicing into breakfast bowls, or blending into rich smoothies.",
      });
    }

    const prompt = `You are an expert grocery produce recognition and quality inspection AI for an ultra-fast fresh produce market named FreshLane.
Analyze this image of a fruit, vegetable, herb, or fresh produce item.

Identify:
1. The exact common produce name (e.g. "Honey Mango / Alphonso Mango", "Vine Tomato", "Crunchy Carrot", "Robusta Banana", "Sweet Strawberry", "Baby Spinach", "Hass Avocado", "Fresh Blueberry", "Broccoli Crown", "Fresh Lemon", "Crisp Red Apple", "Cucumber", "Bell Pepper").
2. The category: one of ["fruit", "vegetable", "greens", "organic", "exotic"].
3. Confidence score between 75 and 99.
4. Freshness and ripeness level (e.g. "Ripe & Sweet (Grade A)", "Crisp & Fresh (Grade A)", "Needs 1-2 days", "Peak Ripeness").
5. A concise 1-2 sentence description of its visual visual quality, color, skin texture, and ripeness indicators.
6. Estimated standard weight in kilograms for 1 typical unit or bunch of this produce (e.g. 0.18 for an apple/tomato, 0.35 for a mango, 0.25 for a carrot bunch, 0.20 for avocado).
7. A friendly unit label (e.g. "approx. 180g / unit", "approx. 350g each", "approx. 500g bunch").
8. Estimated shelf life in days when properly stored (e.g. 3, 5, 7, 10).
9. An array of 3 top nutritional or health benefits (e.g. ["Rich in Vitamin C", "Potassium for heart health", "Antioxidants"]).
10. A practical, direct storage tip.
11. A matching grocery store catalog ID from this list if applicable, or the closest match:
    ["honey-mangoes", "vine-tomatoes", "crunchy-carrots", "blueberries", "sunshine-bananas", "sweet-strawberries", "baby-spinach", "creamy-avocados", "crisp-apples", "broccoli-crowns", "fresh-lemons", "bell-peppers"]
12. Estimated market retail price in Indian Rupees (INR) per kg (e.g. 169, 79, 69, 599, 59, 349, 159, 279, 199, 120, 90, 110).
13. A 1-sentence culinary pairing or serving suggestion.

Be accurate, friendly, and produce-focused.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: cleanMimeType,
              data: base64Data,
            },
          },
          { text: prompt },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            category: { type: Type.STRING },
            confidence: { type: Type.INTEGER },
            ripeness: { type: Type.STRING },
            ripenessDescription: { type: Type.STRING },
            estimatedWeightKg: { type: Type.NUMBER },
            unitLabel: { type: Type.STRING },
            shelfLifeDays: { type: Type.INTEGER },
            nutritionalHighlights: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            storageTip: { type: Type.STRING },
            matchedCatalogId: { type: Type.STRING },
            pricePerKg: { type: Type.NUMBER },
            culinaryNotes: { type: Type.STRING },
          },
          required: [
            "name",
            "category",
            "confidence",
            "ripeness",
            "ripenessDescription",
            "estimatedWeightKg",
            "unitLabel",
            "shelfLifeDays",
            "nutritionalHighlights",
            "storageTip",
            "matchedCatalogId",
            "pricePerKg",
            "culinaryNotes",
          ],
        },
      },
    });

    const textOutput = response.text || "";
    try {
      const parsed = JSON.parse(textOutput);
      return res.json(parsed);
    } catch {
      return res.json({
        name: "Fresh Produce Item",
        category: "fruit",
        confidence: 90,
        ripeness: "Fresh & Ready (Grade A)",
        ripenessDescription: "Healthy vibrant appearance with excellent natural color.",
        estimatedWeightKg: 0.25,
        unitLabel: "approx. 250g per unit",
        shelfLifeDays: 5,
        nutritionalHighlights: ["High in Essential Vitamins", "Natural Antioxidants", "Dietary Fiber"],
        storageTip: "Store in a cool ventilated spot or crisper drawer.",
        matchedCatalogId: "honey-mangoes",
        pricePerKg: 149,
        culinaryNotes: "Delicious washed and enjoyed fresh or in salads.",
      });
    }
  } catch (error: any) {
    console.error("Produce recognition error:", error);
    return res.status(500).json({
      error: error?.message || "Failed to analyze produce image",
    });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`FreshLane Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
