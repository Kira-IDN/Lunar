<?php
declare(strict_types=1);

/**
 * LUNAR — Celestial Dining Experience
 * Week 6 / Sprint 05: Object-Oriented PHP (Class, Encapsulation, Constructor & Methods)
 * 
 * Course PPT Reference: PEMROGRAMAN WEB -6-.pptx
 * - Slide 1: From Procedural to Object-Oriented PHP
 * - Slide 2: Class, Object, Property (data) & Method (behavior)
 * - Slide 3: Property & Method access with ->
 * - Slide 4: Constructor (__construct) & Encapsulation (private properties, public getters)
 * - Slide 5: Object -> PHP -> HTML Dynamic Output
 * - Slide 6-12: Sprint 05 Tasks, Architecture & Completion Checklist
 */
class MenuItem
{
    /**
     * Encapsulation: Private properties (Slide 4 & Slide 10)
     * Data can only be accessed through public methods and getters.
     */
    private string $id;
    private string $name;
    private string $categoryId;
    private float $price;
    private string $description;
    private string $imageUrl;
    private array $dietaryTags;
    private bool $isAvailable;
    private bool $isFeatured;
    private string $prepStage;

    /**
     * Constructor: Initializes object state upon instantiation (Slide 4)
     */
    public function __construct(
        string $id,
        string $name,
        string $categoryId,
        float $price,
        string $description,
        string $imageUrl = '',
        array $dietaryTags = [],
        bool $isAvailable = true,
        bool $isFeatured = false,
        string $prepStage = ''
    ) {
        $this->id = $id;
        $this->name = $name;
        $this->categoryId = $categoryId;
        $this->price = $price;
        $this->description = $description;
        $this->imageUrl = $imageUrl;
        $this->dietaryTags = $dietaryTags;
        $this->isAvailable = $isAvailable;
        $this->isFeatured = $isFeatured;
        $this->prepStage = $prepStage;
    }

    /**
     * Factory method to instantiate MenuItem from an associative array
     */
    public static function fromArray(array $data): self
    {
        return new self(
            (string)($data['id'] ?? uniqid('dish-')),
            (string)($data['name'] ?? 'Untitled Dish'),
            (string)($data['category_id'] ?? 'appetizers'),
            (float)($data['price'] ?? 0.0),
            (string)($data['description'] ?? ''),
            (string)($data['image_url'] ?? ''),
            (array)($data['dietary_tags'] ?? []),
            !empty($data['is_available']),
            !empty($data['is_featured']),
            (string)($data['prep_stage'] ?? '')
        );
    }

    // -------------------------------------------------------------------------
    // Public Getters (Slide 4: Safe Access via Getters)
    // -------------------------------------------------------------------------

    public function getId(): string
    {
        return $this->id;
    }

    public function getName(): string
    {
        return $this->name;
    }

    public function getCategoryId(): string
    {
        return $this->categoryId;
    }

    public function getPrice(): float
    {
        return $this->price;
    }

    public function getDescription(): string
    {
        return $this->description;
    }

    public function getImageUrl(): string
    {
        return $this->imageUrl;
    }

    public function getDietaryTags(): array
    {
        return $this->dietaryTags;
    }

    public function isAvailable(): bool
    {
        return $this->isAvailable;
    }

    public function isFeatured(): bool
    {
        return $this->isFeatured;
    }

    public function getPrepStage(): string
    {
        return $this->prepStage;
    }

    // -------------------------------------------------------------------------
    // Business Methods (Slide 3 & 8: Object Behavior)
    // -------------------------------------------------------------------------

    /**
     * Format the price with a currency prefix.
     */
    public function getFormattedPrice(string $currency = '$'): string
    {
        return $currency . number_format($this->price, 2);
    }

    /**
     * Check if item has a specific dietary tag.
     */
    public function hasDietaryTag(string $tag): bool
    {
        return in_array(strtoupper($tag), array_map('strtoupper', $this->dietaryTags), true);
    }

    /**
     * Get a descriptive availability status text.
     */
    public function getStatusText(): string
    {
        return $this->isAvailable ? 'Available &middot; Table Ready' : '86&rsquo;D &middot; Out of Stock';
    }

    // -------------------------------------------------------------------------
    // Dynamic HTML Generation (Slide 5, 9, 10: Object -> PHP -> HTML)
    // -------------------------------------------------------------------------

    /**
     * Render the dish card semantic HTML representation.
     */
    public function renderCard(): string
    {
        $safeName = htmlspecialchars($this->name);
        $safeDesc = htmlspecialchars($this->description);
        $safeImg = htmlspecialchars($this->imageUrl);
        $safeStage = htmlspecialchars($this->prepStage ?: 'Available');
        $formattedPrice = htmlspecialchars($this->getFormattedPrice());
        $cardClass = $this->isAvailable ? 'dish-card' : 'dish-card unavailable';

        // Badges HTML
        $badgesHtml = '';
        foreach ($this->dietaryTags as $tag) {
            $safeTag = htmlspecialchars((string)$tag);
            $badgeVariant = ($tag === 'SIGNATURE' || $tag === 'CHEF PICK') ? 'badge-brass' : 'badge-moonstone';
            $badgesHtml .= '<span class="badge ' . $badgeVariant . '">' . $safeTag . '</span> ';
        }

        // Action button HTML
        if ($this->isAvailable) {
            $footerMeta = '<span class="type-meta">' . $safeStage . '</span>';
            $actionBtn = '<a href="checkout.html" class="btn btn-outline btn-sm">Add to Cart</a>';
        } else {
            $footerMeta = '<span class="type-meta" style="color: var(--color-danger);">TEMPORARILY UNAVAILABLE</span>';
            $actionBtn = '<button type="button" class="btn btn-outline btn-sm" disabled aria-disabled="true">Unavailable</button>';
        }

        return <<<HTML
<article class="{$cardClass}" aria-label="{$safeName}">
  <div class="dish-image-wrap">
    <img src="{$safeImg}" alt="{$safeName}" width="600" height="450" loading="lazy">
    <div class="dish-card-badges">
      {$badgesHtml}
    </div>
  </div>
  <div class="dish-content">
    <div class="dish-header">
      <h3 class="dish-title">{$safeName}</h3>
      <span class="type-price">{$formattedPrice}</span>
    </div>
    <p class="dish-description">{$safeDesc}</p>
    <div class="dish-footer">
      {$footerMeta}
      {$actionBtn}
    </div>
  </div>
</article>
HTML;
    }
}
