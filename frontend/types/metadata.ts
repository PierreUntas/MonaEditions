/**
 * Shapes of the JSON documents the app stores on IPFS.
 *
 * Every field is optional on purpose. These documents are written by the app
 * but read back from a public gateway with no schema validation, and editions
 * created by earlier versions of the wizard carry fewer fields — so a reader
 * must treat each one as possibly absent rather than trust the shape.
 */

/** Metadata of an artwork edition, written by the creation wizard. */
export interface EditionMetadata {
    /** Mirrors `title`, for marketplaces that read the ERC-1155 `name`. */
    name?: string;
    /** Mirrors `images[0]`, for marketplaces that read a single `image`. */
    image?: string;
    title?: string;
    year?: number;
    description?: string;
    technique?: string;
    dimensions?: string;
    /** IPFS URIs of the artwork's photographs. */
    images?: string[];
    editionSize?: number;
    category?: string;
}

/** Metadata of an artist profile, written by the artist profile page. */
export interface ArtistMetadata {
    name?: string;
    location?: string;
    website?: string;
    bio?: string;
    /** IPFS URI of the artist's logo. */
    logo?: string;
    /** IPFS URIs of the portfolio photographs. */
    portfolio?: string[];
    exhibitions?: string[];
    socialMedia?: {
        instagram?: string;
        twitter?: string;
        facebook?: string;
    };
}

/** Metadata of a collector's review, written by the review form. */
export interface ReviewMetadata {
    rating?: number;
    comment?: string;
}
