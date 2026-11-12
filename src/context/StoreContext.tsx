"use client";

import { Suspense } from "react";
import { usePathname } from "next/navigation";
import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";

export interface CartItem {
  id: string;
  name: string;
  price: number;
  image: string;
  category: string;
  size?: string;
  quantity: number;
}

export interface WishlistItem {
  id: string;
  name: string;
  price: number;
  image: string;
  category: string;
}

interface StoreContextValue {
  cart: CartItem[];
  wishlist: WishlistItem[];
  isBagOpen: boolean;
  isWishlistOpen: boolean;
  isStoreModalOpen: boolean;
  isSearchOpen: boolean;
  toastMessage: string | null;
  setBagOpen: (open: boolean) => void;
  setWishlistOpen: (open: boolean) => void;
  setStoreModalOpen: (open: boolean) => void;
  setSearchOpen: (open: boolean) => void;
  addToCart: (item: Omit<CartItem, "quantity">, openDrawer?: boolean) => void;
  addBundleToCart: (items: Omit<CartItem, "quantity">[], lookName: string) => void;
  removeFromCart: (id: string, size?: string) => void;
  updateQuantity: (id: string, delta: number, size?: string) => void;
  clearCart: () => void;
  toggleWishlist: (item: WishlistItem) => void;
  isWishlisted: (id: string) => boolean;
  cartCount: number;
  cartSubtotal: number;
  showToast: (msg: string) => void;
  syncAuth: () => void;
}

const StoreContext = createContext<StoreContextValue | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  // Start empty on server + first client render (no hydration mismatch), then hydrate from localStorage.
  const [cart, setCart] = useState<CartItem[]>([]);
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const hydrated = useRef(false);
  const [ready, setReady] = useState(false);
  const authedSync = useRef(false); // we've started syncing for the signed-in user
  const serverLoaded = useRef(false); // server copy merged in — only now is it safe to push
  useEffect(() => {
    try {
      const c = localStorage.getItem("krishara.cart");
      const w = localStorage.getItem("krishara.wishlist");
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (c) setCart(JSON.parse(c));
      if (w) setWishlist(JSON.parse(w));
    } catch {
      /* storage unavailable or corrupt — start fresh */
    }
    hydrated.current = true;
    setReady(true);
  }, []);

  // Cross-device sync. The `krishara_auth` cookie is only a hint that a session exists.
  const syncAuth = useCallback(() => {
    if (!ready) return;
    const authed = document.cookie.split("; ").includes("krishara_auth=1");
    if (authed && !authedSync.current) {
      authedSync.current = true;
      fetch("/api/cart")
        .then((r) => (r.ok ? r.json() : null))
        .then((server: { cart?: CartItem[]; wishlist?: WishlistItem[] } | null) => {
          if (!server) { authedSync.current = false; return; }
          setCart((local) => {
            const m = new Map<string, CartItem>();
            for (const it of [...(server.cart ?? []), ...local]) {
              const k = `${it.id}|${it.size ?? ""}`;
              const prev = m.get(k);
              m.set(k, prev ? { ...it, quantity: Math.min(10, Math.max(prev.quantity, it.quantity)) } : it);
            }
            return [...m.values()];
          });
          setWishlist((local) => {
            const m = new Map<string, WishlistItem>();
            for (const it of [...(server.wishlist ?? []), ...local]) m.set(it.id, it);
            return [...m.values()];
          });
          serverLoaded.current = true;
        })
        .catch(() => { authedSync.current = false; });
    } else if (!authed && authedSync.current) {
      // Signed out: don't leave the previous person's bag on a shared device.
      authedSync.current = false;
      serverLoaded.current = false;
      setCart([]);
      setWishlist([]);
    }
  }, [ready]);
  useEffect(() => { syncAuth(); }, [syncAuth]);

  // Push changes to the server (debounced) once the server copy has been merged.
  useEffect(() => {
    if (!ready || !authedSync.current || !serverLoaded.current) return;
    const t = setTimeout(() => {
      fetch("/api/cart", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ cart, wishlist }) }).catch(() => {});
    }, 700);
    return () => clearTimeout(t);
  }, [cart, wishlist, ready]);
  useEffect(() => {
    if (!hydrated.current) return;
    try {
      localStorage.setItem("krishara.cart", JSON.stringify(cart));
      localStorage.setItem("krishara.wishlist", JSON.stringify(wishlist));
    } catch {
      /* ignore quota/private-mode errors */
    }
  }, [cart, wishlist]);
  const [isBagOpen, setBagOpen] = useState(false);
  const [isWishlistOpen, setWishlistOpen] = useState(false);
  const [isStoreModalOpen, setStoreModalOpen] = useState(false);
  const [isSearchOpen, setSearchOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 2800);
  }, []);

  const addToCart = useCallback(
    (item: Omit<CartItem, "quantity">, openDrawer = false) => {
      setCart((prev) => {
        const idx = prev.findIndex(
          (c) => c.id === item.id && (c.size || "") === (item.size || "")
        );
        if (idx > -1) {
          const updated = [...prev];
          updated[idx] = { ...updated[idx], quantity: updated[idx].quantity + 1 };
          return updated;
        }
        return [...prev, { ...item, quantity: 1 }];
      });
      if (openDrawer) {
        setBagOpen(true);
      } else {
        showToast(`Added "${item.name}" to your bag`);
      }
    },
    [showToast]
  );

  const addBundleToCart = useCallback(
    (items: Omit<CartItem, "quantity">[], lookName: string) => {
      setCart((prev) => {
        const next = [...prev];
        for (const item of items) {
          const discountedPrice = Math.round(item.price * 0.9);
          const idx = next.findIndex((c) => c.id === item.id);
          if (idx > -1) {
            next[idx] = { ...next[idx], quantity: next[idx].quantity + 1 };
          } else {
            next.push({ ...item, price: discountedPrice, quantity: 1 });
          }
        }
        return next;
      });
      setBagOpen(true);
      showToast(`Added "${lookName}" full look (10% bundle off)`);
    },
    [showToast]
  );

  const removeFromCart = useCallback((id: string, size?: string) => {
    setCart((prev) =>
      prev.filter((c) => !(c.id === id && (c.size || "") === (size || "")))
    );
  }, []);

  const updateQuantity = useCallback((id: string, delta: number, size?: string) => {
    setCart((prev) =>
      prev
        .map((c) => {
          if (c.id === id && (c.size || "") === (size || "")) {
            return { ...c, quantity: c.quantity + delta };
          }
          return c;
        })
        .filter((c) => c.quantity > 0)
    );
  }, []);

  const clearCart = useCallback(() => setCart([]), []);

  const toggleWishlist = useCallback(
    (item: WishlistItem) => {
      setWishlist((prev) => {
        const exists = prev.some((w) => w.id === item.id);
        if (exists) {
          showToast(`Removed "${item.name}" from wishlist`);
          return prev.filter((w) => w.id !== item.id);
        }
        showToast(`Saved "${item.name}" to wishlist`);
        return [...prev, item];
      });
    },
    [showToast]
  );

  const isWishlisted = useCallback(
    (id: string) => wishlist.some((w) => w.id === id),
    [wishlist]
  );

  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);
  const cartSubtotal = cart.reduce(
    (acc, item) => acc + item.price * item.quantity,
    0
  );

  return (
    <StoreContext.Provider
      value={{
        cart,
        wishlist,
        isBagOpen,
        isWishlistOpen,
        isStoreModalOpen,
        isSearchOpen,
        toastMessage,
        setBagOpen,
        setWishlistOpen,
        setStoreModalOpen,
        setSearchOpen,
        addToCart,
        addBundleToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        toggleWishlist,
        isWishlisted,
        cartCount,
        cartSubtotal,
        showToast,
        syncAuth,
      }}
    >
      <Suspense fallback={null}><RouteSync /></Suspense>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) {
    throw new Error("useStore must be used within StoreProvider");
  }
  return ctx;
}

export function formatINR(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}


/** Re-checks sign-in state after every client navigation (login/logout are navigations, not reloads). */
function RouteSync() {
  const pathname = usePathname();
  const { syncAuth } = useStore();
  useEffect(() => { syncAuth(); }, [pathname, syncAuth]);
  return null;
}
