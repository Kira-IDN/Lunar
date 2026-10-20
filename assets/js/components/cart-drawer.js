/**
 * LUNAR Cart Drawer Component (cart-drawer.js)
 * Accessible slide-over cart drawer with quantity adjustments,
 * authoritative cost summaries, and keyboard/focus management.
 */

import { LunarState } from '../state.js';
import { Toast } from './toast.js';

class CartDrawer {
  constructor() {
    this.isOpen = false;
    this.drawerEl = null;
    this.overlayEl = null;
    this.previousFocusedEl = null;
    this.init();
  }

  init() {
    if (typeof document === 'undefined') return;

    // Build the drawer markup if not present
    let overlay = document.getElementById('lunar-cart-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'lunar-cart-overlay';
      overlay.className = 'cart-drawer-overlay';
      overlay.setAttribute('aria-hidden', 'true');

      overlay.innerHTML = `
        <div class="cart-drawer" role="dialog" aria-modal="true" aria-labelledby="cart-drawer-title">
          <div class="cart-drawer-header">
            <div>
              <span class="type-kicker">[ORDER MANIFEST]</span>
              <h2 id="cart-drawer-title" class="type-h3" style="margin-top: 2px;">Your Selection</h2>
            </div>
            <button type="button" class="cart-drawer-close" aria-label="Close order manifest">&times;</button>
          </div>

          <div class="cart-drawer-body" id="cart-drawer-items">
            <!-- Rendered dynamically -->
          </div>

          <div class="cart-drawer-footer" id="cart-drawer-footer">
            <!-- Rendered dynamically -->
          </div>
        </div>
      `;

      document.body.appendChild(overlay);
    }

    this.overlayEl = overlay;
    this.drawerEl = overlay.querySelector('.cart-drawer');

    // Event bindings
    const closeBtn = overlay.querySelector('.cart-drawer-close');
    closeBtn.addEventListener('click', () => this.close());
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) this.close();
    });

    // Close on Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.close();
      }
    });

    // Accessible Focus Trap: Cycle focus within drawer while open
    this.drawerEl.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        const focusable = Array.from(this.drawerEl.querySelectorAll(
          'button:not([disabled]), [href]:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )).filter(el => el.offsetParent !== null);

        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first || !this.drawerEl.contains(document.activeElement)) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last || !this.drawerEl.contains(document.activeElement)) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    });

    // Listen to state changes
    LunarState.subscribe((details) => {
      this.updateBadge(details.itemCount);
      if (this.isOpen) {
        this.renderItems(details);
      }
    });

    // Bind header cart buttons across the page
    this.bindCartButtons();

    // Initial badge update
    this.updateBadge(LunarState.getCartDetails().itemCount);
  }

  bindCartButtons() {
    const cartBtns = document.querySelectorAll('a[href="checkout.html"], button.header-cart-btn, [data-action="open-cart"]');
    cartBtns.forEach(btn => {
      // Intercept click to open drawer instead of direct navigation
      btn.addEventListener('click', (e) => {
        // Allow ctrl/cmd click to navigate normally
        if (e.metaKey || e.ctrlKey) return;
        e.preventDefault();
        this.open();
      });
    });
  }

  updateBadge(count) {
    const badges = document.querySelectorAll('.header-actions .badge-brass, .header-cart-count');
    badges.forEach(badge => {
      badge.textContent = count;
      badge.setAttribute('aria-label', `${count} items in cart`);
    });
  }

  open() {
    this.previousFocusedEl = document.activeElement;
    this.isOpen = true;
    this.overlayEl.classList.add('is-open');
    this.overlayEl.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    const details = LunarState.getCartDetails();
    this.renderItems(details);

    // Focus close button for accessibility
    const closeBtn = this.drawerEl.querySelector('.cart-drawer-close');
    if (closeBtn) {
      closeBtn.focus();
      setTimeout(() => {
        if (this.isOpen && closeBtn) closeBtn.focus();
      }, 50);
    }
  }

  close() {
    this.isOpen = false;
    this.overlayEl.classList.remove('is-open');
    this.overlayEl.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';

    if (this.previousFocusedEl && typeof this.previousFocusedEl.focus === 'function') {
      this.previousFocusedEl.focus();
    }
  }

  renderItems(details) {
    const itemsContainer = this.drawerEl.querySelector('#cart-drawer-items');
    const footerContainer = this.drawerEl.querySelector('#cart-drawer-footer');

    if (!details.items || details.items.length === 0) {
      itemsContainer.innerHTML = `
        <div class="cart-empty-state">
          <span class="lunar-glyph" style="font-size: 2rem; color: var(--color-moonstone);" aria-hidden="true">&#x25CB;</span>
          <p class="type-lead" style="margin-top: var(--space-sm); font-size: 1.1rem;">Your order manifest is empty.</p>
          <p class="type-small" style="color: var(--color-ink-muted);">Browse our seasonal catalog to add dishes.</p>
          <a href="menu.html" class="btn btn-outline btn-sm" style="margin-top: var(--space-md);">Explore Menu</a>
        </div>
      `;
      footerContainer.innerHTML = '';
      return;
    }

    // Render item rows
    let html = `<ul class="cart-items-list" aria-label="Selected Dishes">`;
    details.items.forEach(item => {
      const isUnavailable = !item.is_available;
      html += `
        <li class="cart-item-row" data-id="${item.id}" ${isUnavailable ? 'style="opacity: 0.85;"' : ''}>
          <div class="cart-item-info">
            <strong class="cart-item-name">
              ${item.name}
              ${isUnavailable ? '<span class="badge" style="background: var(--color-ink); color: #fff; font-size: 0.68rem; padding: 2px 5px; margin-left: 4px;">[OUT OF STOCK / 86\'D]</span>' : ''}
            </strong>
            <span class="type-mono" style="font-size: 0.85rem; color: var(--color-brass); font-weight: 600;">
              $${item.price.toFixed(2)}
            </span>
            ${item.notes ? `<span class="cart-item-notes">${item.notes}</span>` : ''}
          </div>

          <div class="cart-item-controls">
            <div class="qty-stepper" role="group" aria-label="Quantity for ${item.name}">
              <button type="button" class="qty-btn btn-decrement" aria-label="Decrease quantity of ${item.name}">&minus;</button>
              <span class="qty-value" aria-live="polite">${item.quantity}</span>
              <button type="button" class="qty-btn btn-increment" ${isUnavailable ? 'disabled style="opacity: 0.4; cursor: not-allowed;"' : ''} aria-label="Increase quantity of ${item.name}">&#x2B;</button>
            </div>
            <button type="button" class="btn-remove-item" aria-label="Remove ${item.name} from cart">&times;</button>
          </div>
        </li>
      `;
    });
    html += `</ul>`;
    itemsContainer.innerHTML = html;

    // Attach row events
    itemsContainer.querySelectorAll('.cart-item-row').forEach(row => {
      const id = row.getAttribute('data-id');
      const item = details.items.find(i => i.id === id);

      row.querySelector('.btn-decrement').addEventListener('click', () => {
        LunarState.updateQuantity(id, item.quantity - 1);
      });

      const incBtn = row.querySelector('.btn-increment');
      if (incBtn && !incBtn.disabled) {
        incBtn.addEventListener('click', () => {
          LunarState.updateQuantity(id, item.quantity + 1);
        });
      }

      row.querySelector('.btn-remove-item').addEventListener('click', () => {
        LunarState.removeFromCart(id);
        Toast.show(`Removed ${item.name} from order.`, 'info');
      });
    });

    // Render footer with authoritative subtotal
    footerContainer.innerHTML = `
      <div class="cart-summary-line">
        <span class="summary-label">Authoritative Subtotal</span>
        <span class="type-mono" style="font-size: 1.15rem; font-weight: 700; color: var(--color-ink);">$${details.subtotal.toFixed(2)}</span>
      </div>
      <p class="type-micro" style="color: var(--color-ink-muted); margin-top: 4px; margin-bottom: var(--space-md);">
        Taxes &amp; service charges are disabled (0.00%) pending client confirmation.
      </p>

      ${details.hasUnavailableItems ? `
        <div class="cart-warning-alert" role="alert" style="background: rgba(184, 139, 89, 0.15); border: 1px solid var(--color-brass); padding: var(--space-xs) var(--space-sm); font-size: 0.8rem; margin-bottom: var(--space-sm); color: var(--color-ink); border-radius: 2px;">
          &bull; One or more dishes in your cart are currently out of stock (86'd). Please remove them to proceed.
        </div>
      ` : ''}

      <div style="display: flex; flex-direction: column; gap: var(--space-xs);">
        ${details.hasUnavailableItems ? `
          <button type="button" class="btn btn-brass" disabled style="width: 100%; opacity: 0.6; cursor: not-allowed;" aria-disabled="true">
            Resolve Out-of-Stock Items to Checkout
          </button>
        ` : `
          <a href="checkout.html" class="btn btn-brass" style="width: 100%; text-align: center;">
            Proceed to Order Checkout &rarr;
          </a>
        `}
        <button type="button" class="btn btn-text btn-sm btn-clear-cart" style="align-self: center; color: var(--color-ink-muted);">
          Clear Entire Order
        </button>
      </div>
    `;

    footerContainer.querySelector('.btn-clear-cart').addEventListener('click', () => {
      if (confirm('Are you sure you want to clear your current order manifest?')) {
        LunarState.clearCart();
        Toast.show('Order manifest cleared.', 'info');
      }
    });
  }
}

export const Drawer = new CartDrawer();
if (typeof window !== 'undefined') {
  window.LunarDrawer = Drawer;
}
