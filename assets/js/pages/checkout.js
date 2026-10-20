/**
 * LUNAR Checkout Controller (checkout.js)
 * Authoritative cart rendering, client-side input validation,
 * simulated sandbox payment settlement, and redirect to order tracking.
 */

import { LunarState } from '../state.js';
import { Toast } from '../components/toast.js';
import '../components/cart-drawer.js';

class CheckoutPageController {
  constructor() {
    this.tableBodyEl = document.querySelector('.order-review-table tbody');
    this.costCardEl = document.querySelector('.checkout-cost-card');
    this.formEl = document.querySelector('.checkout-grid');
    this.submitBtnEl = this.costCardEl ? this.costCardEl.querySelector('button[type="submit"]') : null;
    this.idempotencyEl = this.costCardEl ? this.costCardEl.querySelector('code') : null;
    this.modeCards = document.querySelectorAll('.payment-method-card[tabindex]');
    this.fulfillmentMode = 'dine-in';

    this.idempotencyKey = this.generateIdempotencyKey();
    this.init();
  }

  generateIdempotencyKey() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'IDEM-';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  async init() {
    if (!LunarState.isMenuLoaded) {
      try {
        await LunarState.loadMenu();
      } catch (err) {
        console.warn('Checkout: Menu preload failed:', err);
      }
    }

    if (this.idempotencyEl) {
      this.idempotencyEl.textContent = this.idempotencyKey;
    }

    this.bindModeSelector();
    this.renderOrderTable();
    this.bindForm();

    LunarState.subscribe(() => {
      this.renderOrderTable();
    });
  }

  bindModeSelector() {
    const modeCards = document.querySelectorAll('.payment-method-card');
    modeCards.forEach(card => {
      card.addEventListener('click', () => {
        // Mode cards for fulfillment or payment
        const parent = card.parentElement;
        if (parent) {
          parent.querySelectorAll('.payment-method-card').forEach(c => c.classList.remove('active'));
          card.classList.add('active');
        }
      });
    });
  }

  renderOrderTable() {
    const details = LunarState.getCartDetails();
    if (!this.tableBodyEl) return;

    if (!details.items || details.items.length === 0) {
      this.tableBodyEl.innerHTML = `
        <tr>
          <td colspan="4" style="text-align: center; padding: var(--space-2xl) 0;">
            <p class="type-lead" style="margin-bottom: var(--space-xs);">No items in your order manifest.</p>
            <p class="type-small" style="color: var(--color-ink-muted); margin-bottom: var(--space-md);">Please select dishes from our seasonal catalog before checking out.</p>
            <a href="menu.html" class="btn btn-brass btn-sm">Explore Menu</a>
          </td>
        </tr>
      `;

      this.updateCostCard(details, true);
      return;
    }

    let warningBanner = document.getElementById('checkout-stock-warning');
    if (details.hasUnavailableItems) {
      if (!warningBanner) {
        warningBanner = document.createElement('div');
        warningBanner.id = 'checkout-stock-warning';
        warningBanner.setAttribute('role', 'alert');
        warningBanner.style.cssText = 'background: rgba(184, 139, 89, 0.15); border: 1px solid var(--color-brass); padding: var(--space-sm); margin-bottom: var(--space-md); font-size: 0.88rem; color: var(--color-ink); border-radius: 2px;';
        warningBanner.innerHTML = '<strong>Stock Notice:</strong> One or more dishes in your cart are currently out of stock (86\'d). Please remove them before proceeding.';
        const tableEl = this.tableBodyEl.closest('table');
        if (tableEl && tableEl.parentElement) {
          tableEl.parentElement.insertBefore(warningBanner, tableEl);
        }
      }
    } else if (warningBanner) {
      warningBanner.remove();
    }

    let rowsHtml = '';
    details.items.forEach(item => {
      const isUnavailable = !item.is_available;
      rowsHtml += `
        <tr data-id="${item.id}" ${isUnavailable ? 'style="opacity: 0.85;"' : ''}>
          <td>
            <div class="order-item-desc">
              <strong class="order-item-title">
                ${item.name}
                ${isUnavailable ? '<span class="badge" style="background: var(--color-ink); color: #fff; font-size: 0.68rem; padding: 2px 5px; margin-left: 6px;">[OUT OF STOCK / 86\'D]</span>' : ''}
              </strong>
              ${item.notes ? `<span class="type-small" style="color: var(--color-ink-muted);">Notes: ${item.notes}</span>` : ''}
            </div>
          </td>
          <td style="text-align: center;">
            <div class="qty-stepper" style="margin: 0 auto;">
              <button type="button" class="qty-btn btn-chk-dec" data-id="${item.id}" aria-label="Decrease &minus;">&minus;</button>
              <span class="qty-value">${item.quantity}</span>
              <button type="button" class="qty-btn btn-chk-inc" data-id="${item.id}" ${isUnavailable ? 'disabled style="opacity: 0.4; cursor: not-allowed;"' : ''} aria-label="Increase &#x2B;">&#x2B;</button>
            </div>
          </td>
          <td style="text-align: right;" class="type-mono">$${item.price.toFixed(2)}</td>
          <td style="text-align: right; font-weight: 600;" class="type-mono">$${item.subtotal.toFixed(2)}</td>
        </tr>
      `;
    });

    this.tableBodyEl.innerHTML = rowsHtml;

    // Attach quantity event handlers
    this.tableBodyEl.querySelectorAll('.btn-chk-dec').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        const item = details.items.find(i => i.id === id);
        if (item) LunarState.updateQuantity(id, item.quantity - 1);
      });
    });

    this.tableBodyEl.querySelectorAll('.btn-chk-inc').forEach(btn => {
      if (!btn.disabled) {
        btn.addEventListener('click', (e) => {
          const id = e.currentTarget.getAttribute('data-id');
          const item = details.items.find(i => i.id === id);
          if (item) LunarState.updateQuantity(id, item.quantity + 1);
        });
      }
    });

    this.updateCostCard(details, false);
  }

  updateCostCard(details, isEmpty) {
    if (!this.costCardEl) return;

    const subtotalEl = this.costCardEl.querySelector('.cost-row:nth-of-type(1) .summary-val');
    const totalEl = this.costCardEl.querySelector('.cost-row-total span:nth-of-type(2)');

    if (subtotalEl) subtotalEl.textContent = `$${details.subtotal.toFixed(2)}`;
    if (totalEl) totalEl.textContent = `$${details.total.toFixed(2)}`;

    if (this.submitBtnEl) {
      if (isEmpty) {
        this.submitBtnEl.disabled = true;
        this.submitBtnEl.textContent = 'Cart is Empty ($0.00)';
      } else if (details.hasUnavailableItems) {
        this.submitBtnEl.disabled = true;
        this.submitBtnEl.textContent = 'Remove Out-of-Stock Items to Pay';
      } else {
        this.submitBtnEl.disabled = false;
        this.submitBtnEl.textContent = `Authorize Simulated Payment ($${details.total.toFixed(2)})`;
      }
    }
  }

  bindForm() {
    if (!this.formEl) return;

    this.formEl.addEventListener('submit', async (e) => {
      e.preventDefault();

      const details = LunarState.getCartDetails();
      if (!details.items || details.items.length === 0) {
        Toast.show('Cannot submit checkout with an empty order manifest.', 'warning');
        return;
      }

      if (details.hasUnavailableItems) {
        Toast.show('Cannot submit checkout: some dishes in your order are out of stock (86\'d). Please remove them.', 'warning');
        return;
      }

      // Validate inputs
      const nameInput = document.getElementById('customer-name');
      const phoneInput = document.getElementById('customer-phone');
      const emailInput = document.getElementById('customer-email');
      const tableInput = document.getElementById('table-number');
      const notesInput = document.getElementById('order-notes');

      if (nameInput && nameInput.value.trim().length < 2) {
        nameInput.focus();
        Toast.show('Please enter your full name for order pickup / service.', 'warning');
        return;
      }

      if (phoneInput && phoneInput.value.trim().length < 7) {
        phoneInput.focus();
        Toast.show('Please provide a valid contact phone number for operational updates.', 'warning');
        return;
      }

      try {
        // Authorize simulated settlement (Course PPT Week 3 client-side simulation)
        if (this.submitBtnEl) {
          this.submitBtnEl.disabled = true;
          this.submitBtnEl.textContent = 'Processing Simulated Settlement...';
        }

        // Generate simulated reference token
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let orderRef = 'LNR-';
        for (let i = 0; i < 8; i++) {
          orderRef += chars.charAt(Math.floor(Math.random() * chars.length));
        }

        // Persist simulated order in client-side storage for tracking page demonstration
        const simulatedOrder = {
          reference: orderRef,
          createdAt: new Date().toISOString(),
          customerName: nameInput ? nameInput.value.trim() : 'Guest',
          customerPhone: phoneInput ? phoneInput.value.trim() : '',
          customerEmail: emailInput ? emailInput.value.trim() : '',
          fulfillmentMode: this.fulfillmentMode,
          tableNumber: tableInput && tableInput.value ? tableInput.value : '02',
          notes: notesInput ? notesInput.value.trim() : '',
          items: details.items.map(item => ({
            id: item.id,
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            subtotal: item.subtotal
          })),
          subtotal: details.subtotal,
          serviceTax: details.serviceTax,
          total: details.total,
          status: 'placed',
          paymentStatus: 'paid_simulated'
        };

        try {
          localStorage.setItem(`lunar_order_${orderRef}`, JSON.stringify(simulatedOrder));
        } catch (storageErr) {
          console.warn('Could not cache simulated order:', storageErr);
        }

        // Clear client cart
        LunarState.clearCart();

        // Honest notification conforming to Week 3 & Week 4 client specifications
        Toast.show(`[SIMULATED PAYMENT] Sandbox settlement complete. Ref: ${orderRef}. Not persisted to server database (Simulated Payment Sandbox).`, 'info', 4500);

        // Redirect to track page after confirmation
        setTimeout(() => {
          window.location.href = `track.html?ref=${orderRef}&confirmed=1`;
        }, 2000);

      } catch (err) {
        if (this.submitBtnEl) {
          this.submitBtnEl.disabled = false;
          this.submitBtnEl.textContent = `Authorize Simulated Payment ($${details.total.toFixed(2)})`;
        }
        Toast.show(err.message || 'Payment settlement error. Please retry.', 'error');
      }
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new CheckoutPageController();
});
