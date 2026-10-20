<?php
declare(strict_types=1);

/**
 * LUNAR — Celestial Dining Experience
 * Week 6 / Sprint 05: Object-Oriented PHP Dynamic Catalog
 * 
 * Course PPT Reference: PEMROGRAMAN WEB -6-.pptx
 * - Slide 1: Procedural vs Object-Oriented PHP
 * - Slide 2: Class as blueprint, Object as instance
 * - Slide 3: Property & Method access with ->
 * - Slide 4: Constructor & Encapsulation
 * - Slide 5: Object -> PHP -> HTML output
 * - Slide 6-12: Sprint 05 Tasks, Architecture & Completion Checklist
 */

require_once __DIR__ . '/src/MenuItem.php';

// -----------------------------------------------------------------------------
// 1. Load Data & Instantiate Objects (Slides 2, 4, 7: Class -> Objects)
// -----------------------------------------------------------------------------

$menuItemsPath = __DIR__ . '/assets/data/menu-items.json';
$categoriesPath = __DIR__ . '/assets/data/categories.json';

$rawDishes = [];
if (file_exists($menuItemsPath)) {
    $rawDishes = json_decode(file_get_contents($menuItemsPath), true) ?: [];
}

$rawCategories = [];
if (file_exists($categoriesPath)) {
    $rawCategories = json_decode(file_get_contents($categoriesPath), true) ?: [];
}

// Instantiate MenuItem objects from array data (Slides 2 & 4: Constructor)
/** @var MenuItem[] $allMenuItems */
$allMenuItems = [];
foreach ($rawDishes as $dishData) {
    $allMenuItems[] = MenuItem::fromArray($dishData);
}

// -----------------------------------------------------------------------------
// 2. Filter & Aggregate with Object Methods (Slides 3, 8: Object Behavior)
// -----------------------------------------------------------------------------

$selectedCategory = isset($_GET['category']) ? trim((string)$_GET['category']) : 'all';

/** @var MenuItem[] $displayedItems */
$displayedItems = [];
$availableCount = 0;
$signatureCount = 0;

foreach ($allMenuItems as $item) {
    if ($item->isAvailable()) {
        $availableCount++;
    }
    if ($item->hasDietaryTag('SIGNATURE') || $item->hasDietaryTag('CHEF PICK')) {
        $signatureCount++;
    }

    if ($selectedCategory === 'all' || $item->getCategoryId() === $selectedCategory) {
        $displayedItems[] = $item;
    }
}

$totalItemsCount = count($allMenuItems);
$pageTitle = "The Seasonal Menu (Object-Oriented PHP)";
$currentCycle = "AUTUMN EQUINOX &middot; CYCLE VI";
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="LUNAR Culinary Catalog rendered dynamically using Object-Oriented PHP (Sprint 05).">
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

  <!-- Top Announcement Bar (Slide 5: Object -> PHP -> HTML) -->
  <aside class="announcement-bar" aria-label="Notice">
    <div class="announcement-bar-content">
      <span class="lunar-glyph" aria-hidden="true">◐</span>
      <span>
        <strong>[SPRINT 05 &middot; OBJECT-ORIENTED PHP]</strong> 
        <?= $totalItemsCount ?> instantiated <code>MenuItem</code> objects &bull; 
        <?= $availableCount ?> table-ready &bull; 
        <?= $signatureCount ?> signature selections
      </span>
    </div>
    <div class="announcement-bar-links">
      <span class="type-coordinates"><?= $currentCycle ?></span>
      <a href="menu.php" class="type-meta" style="text-decoration: underline;">&larr; View Procedural Version</a>
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
        <a href="menu.php" class="nav-link">Menu (PHP)</a>
        <a href="menu-oop.php" class="nav-link active" aria-current="page">Menu (OOP)</a>
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
        <span class="type-kicker">[SPRINT 05 &middot; OBJECT-ORIENTED PROGRAMMING]</span>
        <h1 id="menu-catalog-title" class="type-display" style="margin-top: var(--space-xs); margin-bottom: var(--space-sm);">
          The Celestial Culinary Catalog.
        </h1>
        <p class="type-lead" style="max-width: 720px;">
          An editorial tasting progression encapsulated in robust PHP objects with strict data models and encapsulated presentation behavior.
        </p>

        <!-- Category Filter Pills (Slide 3 & 7: Object filtering) -->
        <div class="menu-controls">
          <nav class="category-filter-bar" aria-label="Menu Category Filter">
            <a href="menu-oop.php" class="filter-pill <?= $selectedCategory === 'all' ? 'active' : '' ?>">All Offerings (<?= $totalItemsCount ?>)</a>
            <?php foreach ($rawCategories as $cat): ?>
              <?php if ($cat['id'] !== 'all'): ?>
                <?php 
                  $catCount = 0;
                  foreach ($allMenuItems as $mItem) {
                      if ($mItem->getCategoryId() === $cat['id']) {
                          $catCount++;
                      }
                  }
                ?>
                <a href="menu-oop.php?category=<?= urlencode($cat['id']) ?>" 
                   class="filter-pill <?= $selectedCategory === $cat['id'] ? 'active' : '' ?>">
                  <?= htmlspecialchars($cat['name']) ?> (<?= $catCount ?>)
                </a>
              <?php endif; ?>
            <?php endforeach; ?>
          </nav>
        </div>
      </div>
    </section>

    <!-- Menu Section (Slide 9 & 10: Generate Dynamic Content with Objects) -->
    <section class="menu-catalog-content" aria-labelledby="catalog-heading">
      <div class="container">
        <h2 id="catalog-heading" class="sr-only">Catalog Listings</h2>

        <?php if (empty($displayedItems)): ?>
          <div class="empty-state" style="padding: var(--space-3xl) 0; text-align: center;">
            <p class="type-lead">No culinary offerings found in this category.</p>
            <a href="menu-oop.php" class="btn btn-outline btn-sm">Reset Filter</a>
          </div>
        <?php else: ?>
          <div class="grid-3col">
            <?php 
              // Slide 3 & 9: Loop over objects and invoke methods via ->
              foreach ($displayedItems as $item): 
                echo $item->renderCard();
              endforeach; 
            ?>
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
          Celestial Dining Experience. Sprint 05 Object-Oriented PHP implementation with encapsulated <code>MenuItem</code> data models.
        </p>
      </div>
      <div class="footer-col">
        <span class="type-kicker">OBJECT DEMONSTRATION</span>
        <ul class="footer-links">
          <li>Class: <code>MenuItem</code></li>
          <li>Encapsulation: <code>private</code> properties</li>
          <li>Constructor: <code>__construct()</code></li>
          <li>Method: <code>renderCard()</code></li>
        </ul>
      </div>
      <div class="footer-col">
        <span class="type-kicker">COURSE MILESTONES</span>
        <ul class="footer-links">
          <li><a href="menu.html">Week 2/3/4: Vanilla JS Catalog</a></li>
          <li><a href="menu.php">Week 5: Procedural PHP</a></li>
          <li><a href="menu-oop.php">Week 6: Object-Oriented PHP (Active)</a></li>
        </ul>
      </div>
    </div>
    <div class="container footer-bottom">
      <p class="type-meta">&copy; <?= date('Y') ?> LUNAR Celestial Dining &middot; PEMROGRAMAN WEB Sprint 05 Demonstration</p>
    </div>
  </footer>

</body>
</html>
