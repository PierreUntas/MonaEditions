/**
 * Shapes returned by the registry's view functions.
 *
 * The ABIs in `config/contracts.ts` are plain JSON rather than `as const`, so
 * viem cannot infer these; the call sites assert them instead. Keeping the
 * shapes here means a contract change is reflected in one place.
 *
 * Note how the two forms differ, because it is easy to get wrong: Solidity
 * returns `getArtworkEdition` as unnamed values, which viem decodes into an
 * array, while `Artist` and `Review` are structs with named components, which
 * viem decodes into objects — their fields must be read by name, not by index.
 */

import type { Address, Hex } from 'viem';

/** `ArtworkRegistry.getArtist` — the `Artist` struct. */
export interface RegistryArtist {
    authorized: boolean;
    /** IPFS CID of the artist's metadata, empty until the artist fills a profile. */
    metadata: string;
}

/** `ArtworkRegistry.getArtworkEdition` — `(metadata, merkleRoot, disabled)`. */
export type RegistryEdition = readonly [metadata: string, merkleRoot: Hex, disabled: boolean];

/** `ArtworkRegistry.getEditionReviews` — the `Review` struct. */
export interface RegistryReview {
    collector: Address;
    /** 1 to 5 stars. */
    rating: number;
    editionId: bigint;
    /** IPFS CID of the review's text. */
    metadata: string;
}
