/**
 * LUNAR Menu Page Controller (menu.js)
 * Dynamic rendering of culinary catalog from JSON fixtures,
 * live search, category filtering, stock availability guards, and cart integration.
 */

import { LunarState } from '../state.js';
import { Toast } from '../components/toast.js';
import { fetchJson, HttpError, ParseError, NetworkError } from '../utils/api.js';
import '../components/cart-drawer.js';

class MenuPageController {
  constructor() {
    this.categories = [];
    this.items = [];
    this.activeCategory = 'all';
    this.searchQuery = '';
    this.fulfillmentMode = 'dine-in';
    this.isLoading = false;
    this.error = null;

    this.categoryBarEl = document.querySelector('.category-filter-bar');
    this.searchInputEl = document.querySelector('.search-input');
    this.menuContainerEl = document.getElementById('menu-catalog-container');
    this.modeButtons = document.querySelectorAll('.mode-btn');

    this.bindControls();
    this.init();
  }

  async init() {
    await this.loadData();
  }

  renderLoading() {
    this.isLoading = true;
    this.error = null;

    if (this.categoryBarEl) {
      this.categoryBarEl.innerHTML = `
        <div class="skeleton-pill" aria-hidden="true"></div>
        <div class="skeleton-pill" aria-hidden="true"></div>
        <div class="skeleton-pill" aria-hidden="true"></div>
        <div class="skeleton-pill" aria-hidden="true"></div>
      `;
    }

    if (this.menuContainerEl) {
      this.menuContainerEl.setAttribute('aria-busy', 'true');
      let skeletonCards = '';
      for (let i = 0; i < 6; i++) {
        skeletonCards += `
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
      this.menuContainerEl.innerHTML = `
        <div class="skeleton-grid" role="status" aria-live="polite" aria-label="Loading culinary catalog">
          <span style="position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); border: 0;">
            Loading celestial menu offerings...
          </span>
          ${skeletonCards}
        </div>
      `;
    }
  }

  renderError(err) {
    this.isLoading = false;
    this.error = err;

    if (this.categoryBarEl) {
      this.categoryBarEl.innerHTML = '';
    }

    if (this.menuContainerEl) {
      this.menuContainerEl.setAttribute('aria-busy', 'false');

      let explanation = 'Unable to load menu offerings. Please check your connection and retry.';
      if (err instanceof HttpError) {
        explanation = `Server returned an error status (${err.status} ${err.statusText || 'Error'}). The menu resource could not be loaded.`;
      } else if (err instanceof ParseError) {
        explanation = 'The catalog response contained malformed or unexpected data.';
      } else if (err instanceof NetworkError) {
        explanation = 'Network request failed or timed out. Please verify your internet connection.';
      }

      this.menuContainerEl.innerHTML = `
        <div class="async-error-state" role="alert" aria-live="assertive">
          <span class="error-glyph" aria-hidden="true">&#x25D1;</span>
          <h2 class="error-title">Unable to Load Menu Catalog</h2>
          <p class="error-message">${explanation}</p>
          <div class="error-details">${err.url ? `Endpoint: ${err.url} &middot; ` : ''}${err.name}: ${err.message}</div>
          <button type="button" class="btn btn-brass btn-retry" aria-label="Retry loading menu catalog">
            Retry Loading Menu
          </button>
        </div>
      `;

      const retryBtn = this.menuContainerEl.querySelector('.btn-retry');
      if (retryBtn) {
        retryBtn.addEventListener('click', () => {
          this.loadData();
        });
      }
    }
  }

  renderEmptyCatalog() {
    this.isLoading = false;
    if (this.menuContainerEl) {
      this.menuContainerEl.setAttribute('aria-busy', 'false');
      this.menuContainerEl.innerHTML = `
        <div class="async-empty-state" role="status" aria-live="polite">
          <span class="empty-glyph" aria-hidden="true">&#x25CB;</span>
          <h2 class="empty-title">Curated Offerings Currently Empty</h2>
          <p class="empty-message">No culinary compositions are currently scheduled in this catalog manifest. Please check back shortly.</p>
          <button type="button" class="btn btn-outline btn-retry" style="margin-top: var(--space-md);">Refresh Catalog</button>
        </div>
      `;

      const retryBtn = this.menuContainerEl.querySelector('.btn-retry');
      if (retryBtn) {
        retryBtn.addEventListener('click', () => {
          this.loadData();
        });
      }
    }
  }

  async loadData() {
    this.renderLoading();
    try {
      const [catRes, items] = await Promise.all([
        fetchJson('assets/data/categories.json'),
        LunarState.loadMenu('', true)
      ]);

      if (!Array.isArray(catRes)) {
        throw new ParseError('Expected array of categories', null, 'assets/data/categories.json');
      }

      this.categories = catRes;
      this.items = items;
      this.isLoading = false;
      this.error = null;

      if (this.menuContainerEl) {
        this.menuContainerEl.setAttribute('aria-busy', 'false');
      }

      if (this.items.length === 0) {
        this.renderCategoryPills();
        this.renderEmptyCatalog();
      } else {
        this.renderCategoryPills();
        this.renderMenu();
      }
    } catch (e) {
      console.error('MenuPage: Failed to load menu data', e);
      this.renderError(e);
      Toast.show(`Failed to load menu: ${e.message}`, 'warning', 4000);
    }
  }

  renderCategoryPills() {
    if (!this.categoryBarEl) return;

    this.categoryBarEl.innerHTML = '';
    this.categories.forEach(cat => {
      const count = cat.id === 'all' 
        ? this.items.length 
        : this.items.filter(i => i.category_id === cat.id).length;

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `filter-pill ${cat.id === this.activeCategory ? 'active' : ''}`;
      btn.setAttribute('aria-pressed', cat.id === this.activeCategory ? 'true' : 'false');
      btn.setAttribute('data-category', cat.id);
      
      const countLabel = cat.id === 'all' ? `(${String(count).padStart(2, '0')})` : `(${String(count).padStart(2, '0')})`;
      btn.textContent = `${cat.name} ${countLabel}`;

      btn.addEventListener('click', () => {
        this.setCategory(cat.id);
      });

      this.categoryBarEl.appendChild(btn);
    });
  }

  setCategory(categoryId) {
    this.activeCategory = categoryId;
    this.categoryBarEl.querySelectorAll('.filter-pill').forEach(btn => {
      const isActive = btn.getAttribute('data-category') === categoryId;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
    this.renderMenu();
  }

  bindControls() {
    // Real-time search
    if (this.searchInputEl) {
      this.searchInputEl.addEventListener('input', (e) => {
        this.searchQuery = e.target.value.trim().toLowerCase();
        this.renderMenu();
      });

      this.searchInputEl.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          this.searchInputEl.value = '';
          this.searchQuery = '';
          this.renderMenu();
        }
      });
    }

    // Fulfillment mode buttons
    this.modeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        this.modeButtons.forEach(b => {
          b.classList.remove('active');
          b.setAttribute('aria-pressed', 'false');
        });
        btn.classList.add('active');
        btn.setAttribute('aria-pressed', 'true');
        this.fulfillmentMode = btn.textContent.toLowerCase().includes('dine') ? 'dine-in' : 'takeaway';
        Toast.show(`Fulfillment updated to ${btn.textContent.trim()}.`, 'info', 2000);
      });
    });
  }

  getFilteredItems() {
    return this.items.filter(item => {
      // Category match
      const matchesCategory = (this.activeCategory === 'all') || (item.category_id === this.activeCategory);

      // Search match (name, description, or dietary tags)
      if (!this.searchQuery) return matchesCategory;

      const inName = item.name.toLowerCase().includes(this.searchQuery);
      const inDesc = item.description.toLowerCase().includes(this.searchQuery);
      const inTags = Array.isArray(item.dietary_tags) && item.dietary_tags.some(tag => tag.toLowerCase().includes(this.searchQuery));

      return matchesCategory && (inName || inDesc || inTags);
    });
  }

  renderMenu() {
    if (!this.menuContainerEl) return;

    const filtered = this.getFilteredItems();

    // Handle Empty Search Results
    if (filtered.length === 0) {
      this.menuContainerEl.innerHTML = `
        <div class="cart-empty-state" style="padding: var(--space-4xl) var(--space-md); text-align: center;">
          <span class="lunar-glyph" style="font-size: 2.5rem; color: var(--color-moonstone);" aria-hidden="true">&#x25CB;</span>
          <h2 class="type-h2" style="margin-top: var(--space-sm); margin-bottom: var(--space-xs);">No Celestial Dishes Found</h2>
          <p class="type-lead" style="max-width: 500px; margin: 0 auto var(--space-lg) auto;">
            No offerings match &ldquo;${this.searchQuery}&rdquo; in ${this.getCategoryName(this.activeCategory)}.
          </p>
          <button type="button" class="btn btn-brass btn-reset-filters">
            Clear Search &amp; Show All Dishes
          </button>
        </div>
      `;

      this.menuContainerEl.querySelector('.btn-reset-filters').addEventListener('click', () => {
        this.resetFilters();
      });
      return;
    }

    // If filtering by specific category or searching, render as matching list or grouped
    const categoriesToRender = (this.activeCategory === 'all')
      ? this.categories.filter(c => c.id !== 'all')
      : this.categories.filter(c => c.id === this.activeCategory);

    let html = '';

    categoriesToRender.forEach(cat => {
      const catItems = filtered.filter(i => i.category_id === cat.id);
      if (catItems.length === 0) return;

      html += `
        <section class="menu-category-section" aria-labelledby="cat-${cat.id}">
          <div class="category-header">
            <h2 id="cat-${cat.id}" class="category-title">${cat.name}</h2>
            <span class="category-meta">${cat.description}</span>
          </div>

          <div class="grid-3col">
            ${catItems.map(item => this.renderDishCard(item)).join('')}
          </div>
        </section>
      `;
    });

    this.menuContainerEl.innerHTML = html;

    // Attach Add to Cart event listeners
    this.menuContainerEl.querySelectorAll('.btn-add-cart').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const itemId = e.currentTarget.getAttribute('data-id');
        const result = LunarState.addToCart(itemId);
        if (result.success) {
          Toast.show(result.message, 'success');
        } else {
          Toast.show(result.message, 'warning');
        }
      });
    });
  }

  renderDishCard(item) {
    const is86 = !item.is_available;
    const badgesHtml = Array.isArray(item.dietary_tags) 
      ? item.dietary_tags.map(tag => `<span class="badge ${tag.includes('SIGNATURE') || tag.includes('CHEF') ? 'badge-brass' : 'badge-moonstone'}">${tag}</span>`).join('')
      : '';

    return `
      <article class="dish-card ${is86 ? 'unavailable' : ''}" aria-label="${item.name}">
        <div class="dish-image-wrap">
          <img 
            src="${item.image_url}" 
            alt="${item.name}" 
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
            <h3 class="dish-title">${item.name}</h3>
            <span class="type-price">$${item.price.toFixed(2)}</span>
          </div>
          <p class="dish-description">${item.description}</p>
          <div class="dish-footer">
            <span class="type-meta">${is86 ? 'OUT OF STOCK' : 'AVAILABLE &middot; TABLE READY'}</span>
            <button 
              type="button" 
              class="btn btn-outline btn-sm btn-add-cart" 
              data-id="${item.id}"
              ${is86 ? 'disabled aria-disabled="true"' : ''}
              aria-label="${is86 ? `${item.name} is unavailable` : `Add ${item.name} to order`}"
            >
              ${is86 ? 'Unavailable' : 'Add to Cart'}
            </button>
          </div>
        </div>
      </article>
    `;
  }

  getCategoryName(id) {
    const found = this.categories.find(c => c.id === id);
    return found ? found.name : 'All Offerings';
  }

  resetFilters() {
    this.searchQuery = '';
    if (this.searchInputEl) this.searchInputEl.value = '';
    this.setCategory('all');
  }
}

// Instantiate on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  window.LunarMenuController = new MenuPageController();
});
