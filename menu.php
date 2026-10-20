<?php
declare(strict_types=1);

/**
 * LUNAR — Celestial Dining Experience
 * Week 5 / Sprint 04: Procedural PHP & Server-Side Dynamic HTML Generation
 * 
 * Course PPT Reference: PEMROGRAMAN WEB -5-.pptx
 * - Slide 3: Procedural PHP (Input -> Process -> Output)
 * - Slide 4: Basic Syntax (<?php echo ... ?>)
 * - Slide 5: Variables ($siteTitle, $dishes, etc.)
 * - Slide 6: Conditionals (if/else for availability & featured items)
 * - Slide 7: Loops (foreach over categories and dishes)
 * - Slide 8: Functions (lunar_format_price, lunar_badge, lunar_filter_by_category)
 * - Slide 9: PHP Menghasilkan HTML (server-side dynamic rendering)
 * - Slide 10-13, 16: Sprint 04 Target & Checklist
 */

// -----------------------------------------------------------------------------
// 1. Procedural Helper Functions (Slide 8: Function PHP)
// -----------------------------------------------------------------------------

/**
 * Format a numeric price into a currency string.
 */
function lunar_format_price(float $amount, string $currency = '$'): string
{
    return $currency . number_format($amount, 2);
}

/**
 * Return an HTML badge string indicating availability status (Slide 6: Conditional).
 */
function lunar_availability_badge(bool $isAvailable): string
{
    if ($isAvailable) {
        return '<span class="badge badge-brass">AVAILABLE &middot; TABLE READY</span>';
    }
    return '<span class="badge badge-outline" style="color: var(--color-danger); border-color: var(--color-danger);">86&rsquo;D &middot; OUT OF STOCK</span>';
}

/**
 * Filter an array of dishes by category ID (Slide 7: Loop & Conditional).
 */
function lunar_filter_by_category(array $items, string $categoryId): array
{
    if ($categoryId === 'all') {
        return $items;
    }
    $filtered = [];
    foreach ($items as $item) {
        if (isset($item['category_id']) && $item['category_id'] === $categoryId) {
            $filtered[] = $item;
        }
    }
    return $filtered;
}

/**
 * Count available dishes.
 */
function lunar_count_available(array $items): int
{
    $count = 0;
    foreach ($items as $item) {
        if (!empty($item['is_available'])) {
            $count++;
        }
    }
    return $count;
}

// -----------------------------------------------------------------------------
// 2. Data Processing & Variables (Slides 5, 7, 11, 12: Variables & Data)
// -----------------------------------------------------------------------------

$pageTitle = "The Seasonal Menu (Procedural PHP)";
$siteTitle = "LUNAR — Celestial Dining Experience";
$currentCycle = "AUTUMN EQUINOX &middot; CYCLE VI";
$menuSubtitle = "An editorial tasting progression rendered dynamically with Procedural PHP (Sprint 04).";

// Load menu items and categories from authoritative local JSON fixtures
$menuItemsPath = __DIR__ . '/assets/data/menu-items.json';
$categoriesPath = __DIR__ . '/assets/data/categories.json';

$rawDishes = [];
if (file_exists($menuItemsPath)) {
    $json = file_get_contents($menuItemsPath);
    $rawDishes = json_decode($json, true) ?: [];
}

$rawCategories = [];
if (file_exists($categoriesPath)) {
    $catJson = file_get_contents($categoriesPath);
    $rawCategories = json_decode($catJson, true) ?: [];
}

// Fallback in-memory catalog if JSON files are missing
if (empty($rawDishes)) {
    $rawDishes = [
        [
            'id' => 'dish-01',
            'category_id' => 'appetizers',
            'name' => '[Sample Dish 01] Seared Diver Scallops',
            'description' => 'Cold-water scallops, fermented white asparagus jus, sea kelp infusion.',
            'price' => 38.00,
            'image_url' => 'https://images.unsplash.com/photo-1532550907401-a500c9a57435?auto=format&fit=crop&w=800&q=80',
            'dietary_tags' => ['GF', 'SIGNATURE'],
            'is_available' => true,
            'is_featured' => true,
            'prep_stage' => 'Stage 01 · Light to Saline'
        ]
    ];
}

// Active category filter via GET parameter (Slide 3: Input -> Process -> Output)
$selectedCategory = isset($_GET['category']) ? trim((string)$_GET['category']) : 'all';
$displayedDishes = lunar_filter_by_category($rawDishes, $selectedCategory);
$totalDishesCount = count($rawDishes);
$availableCount = lunar_count_available($rawDishes);
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="LUNAR Culinary Catalog rendered server-side with Procedural PHP.">
  <title><?= htmlspecialchars($pageTitle) ?> &middot; LUNAR</title>

  <!-- Google Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,600&family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=Space+Grotesk:wght@500;600&display=swap" rel="stylesheet">

  <!-- Core Stylesheets -->
  <link rel="stylesheet" href="assets/css/variables.css">
  <link rel="stylesheet" href="assets/css/reset.css">
  <link rel="stylesheet" href="assets/css/typography.css">
  <link rel="stylesheet" href="assets/css/layout.css">
  <link rel="stylesheet" href="assets/css/components.css">
  <link rel="stylesheet" href="assets/css/responsive.css">
  <link rel="stylesheet" href="assets/css/pages/menu.css">
</head>
<body>

  <!-- Top Announcement Bar (Slide 9: Dynamic PHP Variables in HTML) -->
  <aside class="announcement-bar" aria-label="Notice">
    <div class="announcement-bar-content">
      <span class="lunar-glyph" aria-hidden="true">◐</span>
      <span><strong>[SPRINT 04 &middot; PROCEDURAL PHP]</strong> Server-rendered dynamic catalog &bull; <?= $totalDishesCount ?> total offerings (<?= $availableCount ?> available)</span>
    </div>
    <div class="announcement-bar-links">
      <span class="type-coordinates"><?= $currentCycle ?></span>
      <a href="menu-oop.php" class="type-meta" style="text-decoration: underline;">View OOP Version &rarr;</a>
    </div>
  </aside>

  <!-- Primary Site Header -->
  <header class="site-header">
    <div class="container header-inner">
      <a href="index.html" class="brand-link" aria-label="LUNAR Homepage">
        <span class="brand-title">LUNAR</span>
        <span class="brand-tagline">Celestial Dining</span>
      </a>

      <nav class="main-nav" aria-label="Main Navigation">
        <a href="index.html" class="nav-link">Home</a>
        <a href="menu.html" class="nav-link">Menu (Static)</a>
        <a href="menu.php" class="nav-link active" aria-current="page">Menu (PHP)</a>
        <a href="menu-oop.php" class="nav-link">Menu (OOP)</a>
        <a href="story.html" class="nav-link">Our Story</a>
        <a href="reservation.html" class="nav-link">Reservations</a>
        <a href="track.html" class="nav-link">Order Lookup</a>
      </nav>

      <div class="header-actions">
        <a href="checkout.html" class="btn btn-outline btn-sm" aria-label="View Cart">
          <span>Cart</span>
          <span class="badge badge-brass" id="cart-nav-badge">0</span>
        </a>
        <a href="reservation.html" class="btn btn-brass btn-sm">Reserve Table</a>
      </div>
    </div>
  </header>

  <main id="main-content">

    <!-- Menu Masthead -->
    <section class="menu-hero" aria-labelledby="menu-catalog-title">
      <div class="container">
        <span class="type-kicker">[SPRINT 04 &middot; SERVER-SIDE PROCEDURAL GENERATION]</span>
        <h1 id="menu-catalog-title" class="type-display" style="margin-top: var(--space-xs); margin-bottom: var(--space-sm);">
          The Celestial Culinary Catalog.
        </h1>
        <p class="type-lead" style="max-width: 720px;">
          <?= htmlspecialchars($menuSubtitle) ?>
        </p>

        <!-- Category Filter Pills (Slide 7: Loop over categories) -->
        <div class="menu-controls">
          <nav class="category-filter-bar" aria-label="Menu Category Filter">
            <a href="menu.php" class="filter-pill <?= $selectedCategory === 'all' ? 'active' : '' ?>">All Offerings (<?= $totalDishesCount ?>)</a>
            <?php foreach ($rawCategories as $cat): ?>
              <?php if ($cat['id'] !== 'all'): ?>
                <?php 
                  $catDishes = lunar_filter_by_category($rawDishes, $cat['id']);
                  $catCount = count($catDishes);
                ?>
                <a href="menu.php?category=<?= urlencode($cat['id']) ?>" 
                   class="filter-pill <?= $selectedCategory === $cat['id'] ? 'active' : '' ?>">
                  <?= htmlspecialchars($cat['name']) ?> (<?= $catCount ?>)
                </a>
              <?php endif; ?>
            <?php endforeach; ?>
          </nav>
        </div>
      </div>
    </section>

    <!-- Menu Section (Slide 13: Dynamic Server-Side Content) -->
    <section class="menu-catalog-content" aria-labelledby="catalog-heading">
      <div class="container">
        <h2 id="catalog-heading" class="sr-only">Catalog Listings</h2>

        <?php if (empty($displayedDishes)): ?>
          <div class="empty-state" style="padding: var(--space-3xl) 0; text-align: center;">
            <p class="type-lead">No culinary offerings found in this category.</p>
            <a href="menu.php" class="btn btn-outline btn-sm">Reset Filter</a>
          </div>
        <?php else: ?>
          <div class="grid-3col">
            <?php 
              // Slide 7: Loop (foreach) over dish items
              foreach ($displayedDishes as $dish): 
                $isAvailable = !empty($dish['is_available']);
                $formattedPrice = lunar_format_price((float)$dish['price']);
                $cardClass = $isAvailable ? 'dish-card' : 'dish-card unavailable';
            ?>
              <!-- Dish Card (Slide 6 & 9: Conditionals and Dynamic HTML) -->
              <article class="<?= $cardClass ?>" aria-label="<?= htmlspecialchars($dish['name']) ?>">
                <div class="dish-image-wrap">
                  <img 
                    src="<?= htmlspecialchars($dish['image_url']) ?>" 
                    alt="<?= htmlspecialchars($dish['name']) ?>" 
                    width="600" 
                    height="450"
                    loading="lazy"
                  >
                  <div class="dish-card-badges">
                    <?php if (!empty($dish['dietary_tags'])): ?>
                      <?php foreach ($dish['dietary_tags'] as $tag): ?>
                        <span class="badge <?= $tag === 'SIGNATURE' || $tag === 'CHEF PICK' ? 'badge-brass' : 'badge-moonstone' ?>">
                          <?= htmlspecialchars($tag) ?>
                        </span>
                      <?php endforeach; ?>
                    <?php endif; ?>
                  </div>
                </div>

                <div class="dish-content">
                  <div class="dish-header">
                    <h3 class="dish-title"><?= htmlspecialchars($dish['name']) ?></h3>
                    <span class="type-price"><?= htmlspecialchars($formattedPrice) ?></span>
                  </div>

                  <p class="dish-description">
                    <?= htmlspecialchars($dish['description']) ?>
                  </p>

                  <div class="dish-footer">
                    <?php if ($isAvailable): ?>
                      <span class="type-meta"><?= htmlspecialchars(($dish['prep_stage'] ?? '') ?: 'Available') ?></span>
                      <a href="checkout.html" class="btn btn-outline btn-sm">Add to Cart</a>
                    <?php else: ?>
                      <span class="type-meta" style="color: var(--color-danger);">TEMPORARILY UNAVAILABLE</span>
                      <button type="button" class="btn btn-outline btn-sm" disabled aria-disabled="true">Unavailable</button>
                    <?php endif; ?>
                  </div>
                </div>
              </article>
            <?php endforeach; ?>
          </div>
        <?php endif; ?>

      </div>
    </section>

  </main>

  <!-- Primary Site Footer -->
  <footer class="site-footer">
    <div class="container footer-grid">
      <div class="footer-col">
        <span class="brand-title">LUNAR</span>
        <p class="type-body-sm" style="margin-top: var(--space-xs); max-width: 320px;">
          Celestial Dining Experience. Sprint 04 Procedural PHP dynamic server-side implementation.
        </p>
      </div>
      <div class="footer-col">
        <span class="type-kicker">CURATED PROGRESSIONS</span>
        <ul class="footer-links">
          <li><a href="menu.php?category=appetizers">Stage 01: Light to Saline</a></li>
          <li><a href="menu.php?category=mains">Stage 02: Savory &amp; Smoke</a></li>
          <li><a href="menu.php?category=desserts">Stage 03: Bitter &amp; Sweet</a></li>
          <li><a href="menu.php?category=beverages">Stage 04: Nocturne Elixirs</a></li>
        </ul>
      </div>
      <div class="footer-col">
        <span class="type-kicker">COURSE MILESTONES</span>
        <ul class="footer-links">
          <li><a href="menu.html">Week 2/3/4: Vanilla JS Catalog</a></li>
          <li><a href="menu.php">Week 5: Procedural PHP (Active)</a></li>
          <li><a href="menu-oop.php">Week 6: Object-Oriented PHP</a></li>
        </ul>
      </div>
    </div>
    <div class="container footer-bottom">
      <p class="type-meta">&copy; <?= date('Y') ?> LUNAR Celestial Dining &middot; PEMROGRAMAN WEB Sprint 04 Demonstration</p>
    </div>
  </footer>

</body>
</html>
