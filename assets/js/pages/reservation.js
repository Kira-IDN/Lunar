/**
 * LUNAR Reservation Controller (reservation.js)
 * Client-side table slot selection, interactive manifest updates,
 * date validation, and accessible form error management.
 */

import { Toast } from '../components/toast.js';
import '../components/cart-drawer.js';

class ReservationPageController {
  constructor() {
    this.formEl = document.querySelector('.reservation-grid');
    this.dateInputEl = document.getElementById('reservation-date');
    this.partySelectEl = document.getElementById('party-size');
    this.slotButtons = document.querySelectorAll('.slot-btn:not(.unavailable)');
    this.tableCards = document.querySelectorAll('.table-card-option');

    // Summary elements
    this.summaryDateEl = document.querySelector('.summary-row:nth-of-type(1) .summary-val');
    this.summaryTimeEl = document.querySelector('.summary-row:nth-of-type(2) .summary-val');
    this.summaryPartyEl = document.querySelector('.summary-row:nth-of-type(3) .summary-val');
    this.summaryTableEl = document.querySelector('.summary-row:nth-of-type(4) .summary-val');

    this.selectedTime = '19:00';
    this.selectedTable = 'Table #02 (Celestial Nave)';

    this.init();
  }

  init() {
    this.enforceMinDate();
    this.bindSlotSelectors();
    this.bindTableSelectors();
    this.bindFormInputs();
    this.bindSubmission();
  }

  enforceMinDate() {
    if (!this.dateInputEl) return;
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const minDate = `${yyyy}-${mm}-${dd}`;
    this.dateInputEl.min = minDate;
    if (this.dateInputEl.value < minDate) {
      this.dateInputEl.value = minDate;
    }
  }

  bindSlotSelectors() {
    this.slotButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        this.slotButtons.forEach(b => {
          b.classList.remove('active');
          b.setAttribute('aria-checked', 'false');
        });
        btn.classList.add('active');
        btn.setAttribute('aria-checked', 'true');
        this.selectedTime = btn.textContent.trim();

        if (this.summaryTimeEl) {
          this.summaryTimeEl.textContent = `${this.selectedTime} – (90 Min Seating)`;
        }
      });
    });
  }

  bindTableSelectors() {
    this.tableCards.forEach(card => {
      card.addEventListener('click', () => {
        this.tableCards.forEach(c => {
          c.classList.remove('active');
          c.setAttribute('aria-checked', 'false');
        });
        card.classList.add('active');
        card.setAttribute('aria-checked', 'true');

        const title = card.querySelector('.type-h4');
        const meta = card.querySelector('.type-meta');
        this.selectedTable = `${meta ? meta.textContent.trim() : ''} (${title ? title.textContent.trim() : ''})`;

        if (this.summaryTableEl) {
          this.summaryTableEl.textContent = this.selectedTable;
        }
      });
    });
  }

  bindFormInputs() {
    if (this.dateInputEl) {
      this.dateInputEl.addEventListener('change', () => {
        if (this.summaryDateEl) {
          const d = new Date(this.dateInputEl.value + 'T00:00:00');
          if (!isNaN(d)) {
            const formatted = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
            this.summaryDateEl.textContent = formatted;
          }
        }
      });
    }

    if (this.partySelectEl) {
      this.partySelectEl.addEventListener('change', () => {
        if (this.summaryPartyEl) {
          const count = this.partySelectEl.value;
          this.summaryPartyEl.textContent = `${count} Guest${count > 1 ? 's' : ''}`;
        }
      });
    }
  }

  bindSubmission() {
    if (!this.formEl) return;

    this.formEl.addEventListener('submit', async (e) => {
      e.preventDefault();

      const nameInput = document.getElementById('guest-name');
      const emailInput = document.getElementById('guest-email');
      const phoneInput = document.getElementById('guest-phone');
      const requestsInput = document.getElementById('special-requests');

      if (!nameInput || nameInput.value.trim().length < 2) {
        Toast.show('Please provide your full legal name for the reservation book.', 'warning');
        if (nameInput) nameInput.focus();
        return;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailInput || !emailRegex.test(emailInput.value.trim())) {
        Toast.show('Please provide a valid email address to receive your reference token.', 'warning');
        if (emailInput) emailInput.focus();
        return;
      }

      if (!phoneInput || phoneInput.value.trim().length < 7) {
        Toast.show('Please provide a valid contact telephone number.', 'warning');
        if (phoneInput) phoneInput.focus();
        return;
      }

      // Check date is not in past
      const selectedDate = new Date(this.dateInputEl.value + 'T00:00:00');
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (selectedDate < today) {
        Toast.show('Reservation date cannot be in the past.', 'warning');
        this.dateInputEl.focus();
        return;
      }

      // Determine table ID from selected card
      let tableId = 2; // Default to Table #02
      const activeCard = document.querySelector('.table-card-option.active');
      if (activeCard) {
        const metaText = activeCard.querySelector('.type-meta') ? activeCard.querySelector('.type-meta').textContent : '';
        const match = metaText.match(/\d+/);
        if (match) {
          tableId = parseInt(match[0], 10);
        }
      }

      const submitBtn = this.formEl.querySelector('button[type="submit"]');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Confirming Reservation...';
      }

      try {
        // Generate simulated reference token (Course PPT Week 3 client-side simulation)
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let resRef = 'RES-';
        for (let i = 0; i < 8; i++) {
          resRef += chars.charAt(Math.floor(Math.random() * chars.length));
        }

        const simulatedReservation = {
          reference: resRef,
          createdAt: new Date().toISOString(),
          tableId: tableId,
          partySize: parseInt(this.partySelectEl ? this.partySelectEl.value : '2', 10) || 2,
          reservationDate: this.dateInputEl.value,
          startTime: this.selectedTime,
          customerName: nameInput.value.trim(),
          customerEmail: emailInput.value.trim(),
          customerPhone: phoneInput.value.trim(),
          specialRequests: requestsInput ? requestsInput.value.trim() : '',
          status: 'confirmed_simulated'
        };

        try {
          localStorage.setItem(`lunar_reservation_${resRef}`, JSON.stringify(simulatedReservation));
        } catch (storageErr) {
          console.warn('Could not cache simulated reservation:', storageErr);
        }

        // Honest notification conforming to Week 3 specifications
        Toast.show(`[SIMULATED RESERVATION] Client validation passed. Mock Reference: ${resRef}. Final table lock is verified server-side in Week 5.`, 'info', 4500);

        // Redirect to track page after confirmation
        setTimeout(() => {
          window.location.href = `track.html?ref=${resRef}&type=reservation`;
        }, 2000);

      } catch (err) {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Complete Table Reservation';
        }
        Toast.show(err.message || 'Unable to complete reservation.', 'error');
      }
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new ReservationPageController();
});
