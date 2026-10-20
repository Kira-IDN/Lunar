/**
 * LUNAR Client State Store (state.js)
 * Vanilla JavaScript state model for cart management and authoritative price calculations.
 * 
 * Rules:
 * - Authoritative prices derive strictly from menu fixtures, never trusted blindly from storage.
 * - LocalStorage is wrapped with resilient error handling.
 * - Broadcasts updates via subscribers and custom DOM event 'lunar:cart-updated'.
 */

import { fetchJson, ParseError } from './utils/api.js';

const STORAGE_KEY = 'lunar_cart_v1';

class StateStore {
  constructor() {
    this.cart = [];
    this.menuItems = [];
    this.listeners = [];
    this.isMenuLoaded = false;
    this.menuLoadingState = 'idle'; // 'idle' | 'loading' | 'success' | 'error'
    this.menuError = null;
    this.loadCart();
  }

  /**
   * Load authoritative menu items from JSON fixture asynchronously
   * @param {string} [basePath='']
   * @param {boolean} [forceRefresh=false]
   */
  async loadMenu(basePath = '', forceRefresh = false) {
    if (this.isMenuLoaded && !forceRefresh) {
      return this.menuItems;
    }

    this.menuLoadingState = 'loading';
    this.menuError = null;
    this.notify();

    try {
      const items = await fetchJson(`${basePath}assets/data/menu-items.json`);

      if (!Array.isArray(items)) {
        throw new ParseError('Menu manifest payload must be an array', null, `${basePath}assets/data/menu-items.json`);
      }
      this.menuItems = items;
      this.isMenuLoaded = true;
      this.menuLoadingState = 'success';
      this.menuError = null;
      this.notify();
      return this.menuItems;
    } catch (err) {
      console.warn('LUNAR State: Unable to load menu items.', err);
      this.isMenuLoaded = false;
      this.menuLoadingState = 'error';
      this.menuError = err;
      this.notify();
      throw err;
    }
  }

  /**
   * Safe check for localStorage availability (handles incognito or restricted storage)
   */
  isStorageAvailable() {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return false;
      const testKey = '__lunar_storage_test__';
      window.localStorage.setItem(testKey, '1');
      window.localStorage.removeItem(testKey);
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * Find an item in the authoritative menu fixture
   */
  getItemById(id) {
    return this.menuItems.find(item => item.id === id) || null;
  }

  /**
   * Load cart state from localStorage with corruption and non-finite quantity resilience
   */
  loadCart() {
    if (!this.isStorageAvailable()) {
      this.cart = [];
      return;
    }

    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        this.cart = [];
        return;
      }
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        // Validate each entry has a valid string id and finite positive integer quantity (capped at 99)
        this.cart = parsed.filter(item => 
          item && 
          typeof item.id === 'string' && 
          Number.isFinite(item.quantity) && 
          item.quantity > 0
        ).map(item => ({
          id: item.id,
          quantity: Math.min(99, Math.max(1, Math.floor(item.quantity))),
          notes: typeof item.notes === 'string' ? item.notes.slice(0, 200) : ''
        }));
      } else {
        this.cart = [];
      }
    } catch (e) {
      console.warn('LUNAR State: Corrupted cart data in localStorage, resetting safely.', e);
      this.cart = [];
    }
  }

  /**
   * Save cart state to localStorage safely with quota error catching
   */
  saveCart() {
    if (!this.isStorageAvailable()) return;

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.cart));
    } catch (e) {
      console.warn('LUNAR State: Unable to persist cart to localStorage (storage full/restricted).', e);
    }
  }

  /**
   * Add an item to the cart
   * Validates menu availability if menu is loaded
   */
  addToCart(itemId, quantity = 1, notes = '') {
    const item = this.getItemById(itemId);
    if (item && !item.is_available) {
      return { success: false, message: `${item.name} is currently out of stock (86'd).` };
    }

    const qty = Math.max(1, Math.floor(quantity));
    const existing = this.cart.find(entry => entry.id === itemId);

    if (existing) {
      existing.quantity += qty;
      if (notes) existing.notes = notes;
    } else {
      this.cart.push({ id: itemId, quantity: qty, notes: notes || '' });
    }

    this.saveCart();
    this.notify();
    return { 
      success: true, 
      message: `Added ${item ? item.name : 'dish'} to your order.`,
      item: item
    };
  }

  /**
   * Update quantity of a cart entry (0 removes the item)
   */
  updateQuantity(itemId, quantity) {
    const qty = Math.floor(quantity);
    if (qty <= 0) {
      this.removeFromCart(itemId);
      return;
    }

    const entry = this.cart.find(item => item.id === itemId);
    if (entry) {
      entry.quantity = qty;
      this.saveCart();
      this.notify();
    }
  }

  /**
   * Remove an item from the cart
   */
  removeFromCart(itemId) {
    this.cart = this.cart.filter(item => item.id !== itemId);
    this.saveCart();
    this.notify();
  }

  /**
   * Clear all items in the cart
   */
  clearCart() {
    this.cart = [];
    this.saveCart();
    this.notify();
  }

  /**
   * Derive authoritative cart breakdown with prices from the menu fixture
   * Handles orphan items and flags items that have become unavailable.
   */
  getCartDetails() {
    let subtotal = 0;
    let itemCount = 0;
    let hasUnavailableItems = false;
    const items = [];

    for (const entry of this.cart) {
      const dish = this.getItemById(entry.id);
      if (!dish) {
        // Orphan item ID in cart not present in authoritative menu manifest
        continue;
      }

      const isAvailable = Boolean(dish.is_available);
      if (!isAvailable) {
        hasUnavailableItems = true;
      }

      const itemSubtotal = dish.price * entry.quantity;
      subtotal += itemSubtotal;
      itemCount += entry.quantity;

      items.push({
        id: dish.id,
        name: dish.name,
        price: dish.price,
        quantity: entry.quantity,
        subtotal: itemSubtotal,
        is_available: isAvailable,
        image_url: dish.image_url,
        notes: entry.notes,
        dietary_tags: dish.dietary_tags
      });
    }

    return {
      items,
      itemCount,
      hasUnavailableItems,
      subtotal: Number(subtotal.toFixed(2)),
      // Taxes & fees explicitly set to 0.00 until client policy confirmation
      taxAmount: 0.00,
      serviceCharge: 0.00,
      total: Number(subtotal.toFixed(2))
    };
  }

  /**
   * Subscribe to cart updates
   */
  subscribe(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  /**
   * Notify all subscribers and dispatch DOM event
   */
  notify() {
    const details = this.getCartDetails();
    for (const listener of this.listeners) {
      try {
        listener(details);
      } catch (e) {
        console.error('LUNAR State subscriber error:', e);
      }
    }

    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      document.dispatchEvent(new CustomEvent('lunar:cart-updated', { 
        detail: details 
      }));
    }
  }
}

// Global Singleton for Week 3 vanilla scripting
export const LunarState = new StateStore();
if (typeof window !== 'undefined') {
  window.LunarState = LunarState;
}
