/**
 * Categories mapping - English (for storage) to French (for display)
 */

export const CATEGORIES_EN = [
    'Painting',
    'Drawing',
    'Sculpture',
    'Photography',
    'Digital Art',
    'Print',
    'Textile',
    'Ceramics',
    'Mixed Media',
    'Installation',
    'Video',
    'Other'
] as const;

export type CategoryKey = typeof CATEGORIES_EN[number];

export const CATEGORIES_FR: Record<CategoryKey, string> = {
    'Painting': 'Peinture',
    'Drawing': 'Dessin',
    'Sculpture': 'Sculpture',
    'Photography': 'Photographie',
    'Digital Art': 'Art Numérique',
    'Print': 'Estampe',
    'Textile': 'Textile',
    'Ceramics': 'Céramique',
    'Mixed Media': 'Technique Mixte',
    'Installation': 'Installation',
    'Video': 'Vidéo',
    'Other': 'Autre'
};

/**
 * Get French label for a category
 */
export function getCategoryLabel(categoryEn: string): string {
    return CATEGORIES_FR[categoryEn as CategoryKey] || categoryEn;
}

/**
 * Get English key from French label
 */
export function getCategoryKey(categoryFr: string): string {
    const entry = Object.entries(CATEGORIES_FR).find(([_, fr]) => fr === categoryFr);
    return entry ? entry[0] : categoryFr;
}
