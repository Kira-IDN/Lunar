/**
 * LUNAR Global App Initializer (main.js)
 * Mounts the cart state listener, accessible slide-over drawer, toast alerts,
 * and handles asynchronous homepage featured dish loading with loading, success, empty, and error states.
 */

import { LunarState } from './state.js';
import { Toast } from './components/toast.js';
import { Drawer } from './components/cart-drawer.js';
import { HttpError, ParseError, NetworkError } from './utils/api.js';

async function initFeaturedDishes(gridEl, basePath = '') {
  if (!gridEl) return;

  function renderLoading() {
    gridEl.setAttribute('aria-busy', 'true');
    let skeletonHtml = '';
    for (let i = 0; i < 3; i++) {
      skeletonHtml += `
        <div class="skeleton-card" aria-hidden="true">
          <div class="skeleton-image"></div>
          <div class="skeleton-content">
            <div class="skeleton-line skeleton-line-title"></div>
            <div class="skeleton-line skeleton-line-desc"></div>
            <div class="skeleton-line skeleton-line-short"></div>
          </div>
        </div>
      `;
    }
    gridEl.innerHTML = `
      <div style="grid-column: 1 / -1; display: contents;" role="status" aria-live="polite" aria-label="Loading featured culinary selections">
        <span style="position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); border: 0;">
          Loading featured dishes...
        </span>
        ${skeletonHtml}
      </div>
    `;
  }

  function renderError(err) {
    gridEl.setAttribute('aria-busy', 'false');
    let explanation = 'Unable to load featured selections. Please verify your connection.';
    if (err instanceof HttpError) {
      explanation = `Server returned an error (${err.status} ${err.statusText || 'Error'}).`;
    } else if (err instanceof ParseError) {
      explanation = 'Received malformed menu catalog data.';
    } else if (err instanceof NetworkError) {
      explanation = 'Network request failed or timed out.';
    }

    gridEl.innerHTML = `
      <div class="async-error-state" style="grid-column: 1 / -1;" role="alert" aria-live="assertive">
        <span class="error-glyph" aria-hidden="true">&#x25D1;</span>
        <h3 class="error-title">Unable to Load Featured Selections</h3>
        <p class="error-message">${explanation}</p>
        <button type="button" class="btn btn-brass btn-retry" aria-label="Retry loading featured dishes">
          Retry Loading
        </button>
      </div>
    `;

    const retryBtn = gridEl.querySelector('.btn-retry');
    if (retryBtn) {
      retryBtn.addEventListener('click', () => load());
    }
  }

  function renderEmpty() {
    gridEl.setAttribute('aria-busy', 'false');
    gridEl.innerHTML = `
      <div class="async-empty-state" style="grid-column: 1 / -1;" role="status" aria-live="polite">
        <span class="empty-glyph" aria-hidden="true">&#x25CB;</span>
        <h3 class="empty-title">No Featured Dishes Currently Scheduled</h3>
        <p class="empty-message">Explore our complete catalog for seasonal offerings.</p>
        <a href="menu.html" class="btn btn-outline" style="margin-top: var(--space-md);">View Full Menu</a>
      </div>
    `;
  }

  function renderDishes(items) {
    gridEl.setAttribute('aria-busy', 'false');
    const featured = items.filter(i => i.is_featured);
    const toRender = featured.length > 0 ? featured.slice(0, 3) : items.slice(0, 3);

    if (toRender.length === 0) {
      renderEmpty();
      return;
    }

    gridEl.innerHTML = toRender.map(dish => {
      const is86 = !dish.is_available;
      const badgesHtml = Array.isArray(dish.dietary_tags)
        ? dish.dietary_tags.map(t => `<span class="badge ${t.includes('SIGNATURE') || t.includes('FEATURED') ? 'badge-brass' : 'badge-moonstone'}">${t}</span>`).join('')
        : '';

      return `
        <article class="dish-card ${is86 ? 'unavailable' : ''}" aria-label="${dish.name}">
          <div class="dish-image-wrap">
            <img 
              src="${dish.image_url}" 
              alt="${dish.name}" 
              width="600" 
              height="450" 
              loading="lazy"
            >
            <div class="dish-card-badges">
              ${badgesHtml}
              ${is86 ? '<span class="badge badge-outline" style="background: rgba(139,58,58,0.9); color: #fff;">86&rsquo;D</span>' : ''}
            </div>
          </div>
          <div class="dish-content">
            <div class="dish-header">
              <h3 class="dish-title">${dish.name}</h3>
              <span class="type-price">$${dish.price.toFixed(2)}</span>
            </div>
            <p class="dish-description">${dish.description}</p>
            <div class="dish-footer">
              <span class="type-meta">${is86 ? 'OUT OF STOCK' : dish.prep_stage || 'TABLE READY'}</span>
              <button 
                type="button" 
                class="btn btn-outline btn-sm" 
                data-add-item="${dish.id}"
                ${is86 ? 'disabled aria-disabled="true"' : ''}
              >
                ${is86 ? "86'd (Sold Out)" : 'Add to Cart'}
              </button>
            </div>
          </div>
        </article>
      `;
    }).join('');

    // Bind Add to Cart on freshly rendered cards
    gridEl.querySelectorAll('[data-add-item]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const itemId = e.currentTarget.getAttribute('data-add-item');
        const res = LunarState.addToCart(itemId);
        if (res.success) {
          Toast.show(res.message, 'success');
        } else {
          Toast.show(res.message, 'warning');
        }
      });
    });
  }

  async function load() {
    renderLoading();
    try {
      const items = await LunarState.loadMenu(basePath, true);
      renderDishes(items);
    } catch (err) {
      renderError(err);
    }
  }

  await load();
}

document.addEventListener('DOMContentLoaded', async () => {
  const basePath = '';

  // Initial badge update from cart state
  const details = LunarState.getCartDetails();
  Drawer.updateBadge(details.itemCount);

  // If on homepage with featured dishes grid, load dynamically
  const featuredGrid = document.getElementById('featured-dishes-grid');
  if (featuredGrid) {
    await initFeaturedDishes(featuredGrid, basePath);
  } else if (!LunarState.isMenuLoaded) {
    // For other pages, ensure menu loads in background if needed
    try {
      await LunarState.loadMenu(basePath);
      Drawer.updateBadge(LunarState.getCartDetails().itemCount);
    } catch (e) {
      console.warn('Background menu preload failed:', e);
    }
  }

  // Bind any static add-to-cart buttons outside the dynamic grid
  document.querySelectorAll('body:not(#menu-catalog-container):not(#featured-dishes-grid) [data-add-item]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const itemId = e.currentTarget.getAttribute('data-add-item');
      const res = LunarState.addToCart(itemId);
      if (res.success) {
        Toast.show(res.message, 'success');
      } else {
        Toast.show(res.message, 'warning');
      }
    });
  });
});

if (typeof window !== 'undefined') {
  window.initFeaturedDishes = initFeaturedDishes;
}

