/**
 * LUNAR Tracking & Order Progression Controller (track.js)
 * Near-real-time polling of order and reservation lifecycle state.
 * Decoupled operational fulfillment vs. financial settlement indicators.
 */

import { Toast } from '../components/toast.js';

class TrackPageController {
  constructor() {
    this.formEl = document.querySelector('.track-lookup-form');
    this.inputEl = document.querySelector('.track-lookup-input');
    this.statusBannerEl = document.querySelector('.status-banner');
    this.stepperEl = document.querySelector('.status-stepper');
    this.timelineCardEl = document.querySelector('.pipeline-card');
    this.manifestCardEl = document.querySelector('.track-header-box:nth-of-type(1)');
    this.auditCardEl = document.querySelector('.track-header-box:nth-of-type(2)');

    this.pollInterval = 8000;
    this.timerId = null;
    this.currentRef = this.getRefFromUrl();

    this.init();
  }

  getRefFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get('ref') || 'LNR-8X9K2M7P';
  }

  init() {
    if (this.inputEl && this.currentRef) {
      this.inputEl.value = this.currentRef;
    }

    this.bindForm();
    this.displayStatus();
  }

  bindForm() {
    if (!this.formEl) return;
    this.formEl.addEventListener('submit', (e) => {
      e.preventDefault();
      const val = this.inputEl.value.trim().toUpperCase();
      if (!val) {
        Toast.show('Please enter a valid reference code.', 'warning');
        return;
      }
      this.currentRef = val;
      const url = new URL(window.location);
      url.searchParams.set('ref', val);
      window.history.pushState({}, '', url);
      this.displayStatus();
    });
  }

  displayStatus() {
    if (!this.currentRef) return;

    if (this.currentRef.startsWith('RES-')) {
      this.displayReservationStatus();
    } else {
      this.displayOrderStatus();
    }
  }

  displayOrderStatus() {
    // 1. Look up cached simulated order
    let order = null;
    try {
      const stored = localStorage.getItem(`lunar_order_${this.currentRef}`);
      if (stored) {
        order = JSON.parse(stored);
      }
    } catch (e) {
      // Ignore
    }

    if (!order) {
      // Clean simulated fallback representation for demonstration
      order = {
        order_reference: this.currentRef,
        order_status: 'in_kitchen',
        order_type: 'dine_in',
        payment_status: 'paid',
        customer_name: 'Celestial Patron (Simulated)',
        table_number: 'Table #02 (Celestial Nave)',
        total_amount: '92.00',
        created_at: new Date().toISOString().replace('T', ' ').substring(0, 19),
        items: [
          { name: '[Sample Dish 01] Seared Diver Scallops', quantity: 1, subtotal: '38.00', notes: 'Stage 01 Saline' },
          { name: '[Sample Dish 04] Aged Heritage Duck', quantity: 1, subtotal: '54.00', notes: 'Stage 02 Hearth' }
        ]
      };
    } else {
      // Format stored order to match rendering expectation
      order.order_reference = order.reference;
      order.order_status = order.status || 'placed';
      order.order_type = order.fulfillmentMode === 'takeaway' ? 'takeaway' : 'dine_in';
      order.payment_status = 'paid';
      order.customer_name = order.customerName;
      order.total_amount = order.total.toFixed(2);
      order.created_at = (order.createdAt || new Date().toISOString()).replace('T', ' ').substring(0, 19);
      order.table_number = `Table #${order.tableNumber || '02'}`;
    }

    this.renderOrder(order);
  }

  displayReservationStatus() {
    let r = null;
    try {
      const stored = localStorage.getItem(`lunar_reservation_${this.currentRef}`);
      if (stored) {
        r = JSON.parse(stored);
      }
    } catch (e) {
      // Ignore
    }

    if (!r) {
      r = {
        reservation_code: this.currentRef,
        customer_name: 'Honored Guest (Simulated)',
        table_number: 'Table #02',
        location: 'Celestial Nave',
        reservation_date: new Date().toISOString().substring(0, 10),
        start_time: '19:00',
        end_time: '20:30',
        party_size: 2,
        status: 'confirmed'
      };
    } else {
      r.reservation_code = r.reference;
      r.customer_name = r.customerName;
      r.table_number = `Table #${r.tableId || '02'}`;
      r.location = 'Celestial Dining Room';
      r.reservation_date = r.reservationDate;
      r.start_time = r.startTime;
      r.end_time = '90 Min Seating';
      r.party_size = r.partySize;
      r.status = 'confirmed';
    }

    const opBadge = document.querySelector('.status-banner .badge');
    if (opBadge) {
      opBadge.className = 'badge badge-confirmed';
      opBadge.textContent = 'CONFIRMED (SIMULATED)';
    }

    const auditBox = document.querySelectorAll('.grid-2col .track-header-box')[1];
    if (auditBox) {
      auditBox.innerHTML = `
        <span class="type-kicker">SIMULATED RESERVATION AUDIT</span>
        <h3 class="type-h3" style="margin-top: 2px; margin-bottom: var(--space-md);">Booking Manifest</h3>
        <div class="summary-row">
          <span class="summary-label">Booking Reference</span>
          <span class="type-mono" style="font-weight: 600;">${r.reservation_code}</span>
        </div>
        <div class="summary-row">
          <span class="summary-label">Guest</span>
          <span class="summary-val">${r.customer_name}</span>
        </div>
        <div class="summary-row">
          <span class="summary-label">Table</span>
          <span class="summary-val">${r.table_number} (${r.location})</span>
        </div>
        <div class="summary-row">
          <span class="summary-label">Date &amp; Seating</span>
          <span class="summary-val">${r.reservation_date} &middot; ${r.start_time} - ${r.end_time}</span>
        </div>
        <div class="summary-row">
          <span class="summary-label">Party Size</span>
          <span class="summary-val">${r.party_size} Guests</span>
        </div>
        <div class="summary-row">
          <span class="summary-label">Status</span>
          <span class="summary-val" style="color: var(--color-brass); font-weight: 600;">CONFIRMED (Client-Side Simulation)</span>
        </div>
      `;
    }
  }

  renderOrder(order) {
    // 1. Operational status
    const opBadge = document.querySelector('.status-banner .badge');
    const opDesc = document.querySelector('.status-banner .status-metric:nth-child(1) .type-small');
    if (opBadge) {
      opBadge.className = `badge badge-${order.order_status}`;
      opBadge.textContent = order.order_status.toUpperCase().replace(/_/g, ' ');
    }
    if (opDesc) {
      opDesc.textContent = `Fulfillment: ${order.order_type === 'dine_in' ? 'Dine-In' : 'Takeaway'}`;
    }

    // 2. Financial status
    const finBadge = document.querySelector('.status-banner .status-metric:nth-child(2) .badge');
    const finDesc = document.querySelector('.status-banner .status-metric:nth-child(2) .type-micro');
    if (finBadge) {
      finBadge.className = `badge badge-${order.payment_status === 'paid' ? 'served' : 'pending'}`;
      finBadge.textContent = order.payment_status.toUpperCase();
    }
    if (finDesc) {
      finDesc.innerHTML = `Order Ref: <code>${order.order_reference}</code> &middot; Recalculated Total: $${parseFloat(order.total_amount).toFixed(2)}`;
    }

    // 3. Pipeline Stepper
    if (this.stepperEl) {
      const stages = order.order_type === 'takeaway'
        ? ['placed', 'confirmed', 'in_kitchen', 'ready_for_pickup', 'picked_up', 'completed']
        : ['placed', 'confirmed', 'in_kitchen', 'ready_to_serve', 'served', 'completed'];

      const currentIndex = stages.indexOf(order.order_status);
      this.stepperEl.innerHTML = stages.map((st, idx) => {
        let cls = 'step-node';
        let glyph = idx + 1;
        if (idx < currentIndex) {
          cls += ' completed';
          glyph = '&#x2713;';
        } else if (idx === currentIndex) {
          cls += ' active';
        }
        const label = st.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        return `
          <div class="${cls}">
            <span class="step-dot" aria-hidden="true">${glyph}</span>
            <span class="step-label">${label}</span>
          </div>
        `;
      }).join('');
    }

    // 4. Itemized manifest
    const manifestBox = document.querySelectorAll('.grid-2col .track-header-box')[0];
    if (manifestBox && order.items && order.items.length > 0) {
      let itemsHtml = order.items.map(item => `
        <div class="tasting-item">
          <div class="tasting-title-wrap">
            <span class="tasting-title">${item.quantity} &times; ${item.name}</span>
            ${item.notes ? `<span class="tasting-desc">${item.notes}</span>` : ''}
          </div>
          <span class="type-mono" style="font-weight: 600;">$${parseFloat(item.subtotal).toFixed(2)}</span>
        </div>
      `).join('');

      itemsHtml += `
        <div class="border-rule" style="margin: var(--space-md) 0;"></div>
        <div style="display: flex; justify-content: space-between; font-weight: 700;">
          <span>Total Settled (Taxes &amp; Fees Disabled: 0.00%)</span>
          <span class="type-mono" style="color: var(--color-brass);">$${parseFloat(order.total_amount).toFixed(2)}</span>
        </div>
      `;

      const titleEl = manifestBox.querySelector('.type-h3');
      if (titleEl) {
        manifestBox.innerHTML = `
          <span class="type-kicker">ITEMIZED TICKET MANIFEST</span>
          <h3 class="type-h3" style="margin-top: 2px; margin-bottom: var(--space-md);">Ordered Selections</h3>
          ${itemsHtml}
        `;
      }
    }

    // 5. Metadata box
    const auditBox = document.querySelectorAll('.grid-2col .track-header-box')[1];
    if (auditBox) {
      auditBox.innerHTML = `
        <span class="type-kicker">RESERVATION / ORDER AUDIT</span>
        <h3 class="type-h3" style="margin-top: 2px; margin-bottom: var(--space-md);">Metadata &amp; Verification</h3>
        <div class="summary-row">
          <span class="summary-label">Order Reference Token</span>
          <span class="type-mono" style="font-weight: 600;">${order.order_reference}</span>
        </div>
        <div class="summary-row">
          <span class="summary-label">Guest</span>
          <span class="summary-val">${order.customer_name}</span>
        </div>
        <div class="summary-row">
          <span class="summary-label">Fulfillment Mode</span>
          <span class="summary-val">${order.order_type === 'dine_in' ? `Dine-In (${order.table_number || 'Table Assigned'})` : 'Takeaway Pickup'}</span>
        </div>
        <div class="summary-row">
          <span class="summary-label">Payment Status</span>
          <span class="summary-val">${order.payment_status.toUpperCase()} (Sandbox Verified)</span>
        </div>
        <div class="summary-row">
          <span class="summary-label">Timestamp</span>
          <span class="summary-val">${order.created_at} UTC</span>
        </div>
      `;
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new TrackPageController();
});
