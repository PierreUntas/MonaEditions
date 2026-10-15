/**
 * Reading a wallet or email address off a Privy user.
 *
 * Privy exposes a login's accounts in two places: `user.wallet` for the
 * embedded wallet it provisions itself, and `user.linkedAccounts` for
 * everything the user connected (external wallets, email, …). Every caller
 * needs the same answer — "which address is this user?" — so the lookup lives
 * here once instead of being spelled out at each call site.
 *
 * The parameter types describe only the fields we read, which keeps these
 * helpers usable with both the client SDK (`@privy-io/react-auth`) and the
 * server SDK (`@privy-io/server-auth`) without coupling to either's User type.
 */

import type { Address } from 'viem';

/** A 20-byte hex address, as Privy hands it to us before validation. */
const ADDRESS_PATTERN = /^0x[0-9a-fA-F]{40}$/;

/** One entry of `user.linkedAccounts`, narrowed to the fields we use. */
export interface PrivyLinkedAccount {
    type: string;
    address?: string;
    /** CAIP-2 chain the wallet is on, e.g. `eip155:8453`. Wallet accounts only. */
    chainId?: string;
}

/** The parts of a Privy user these helpers read. */
export interface PrivyUserLike {
    wallet?: { address?: string; chainId?: string } | null;
    linkedAccounts?: readonly PrivyLinkedAccount[];
}

/** First linked account of the given kind, if the user has one. */
export function findLinkedAccount(
    user: PrivyUserLike | null | undefined,
    type: string,
): PrivyLinkedAccount | undefined {
    return user?.linkedAccounts?.find((account) => account.type === type);
}

/** Address of the first linked account of the given kind, or null. */
export function findLinkedAccountAddress(
    user: PrivyUserLike | null | undefined,
    type: string,
): string | null {
    return findLinkedAccount(user, type)?.address ?? null;
}

/**
 * The wallet that identifies this user on-chain.
 *
 * Prefers the embedded Privy wallet so the address matches the one the app
 * actually signs transactions with, then falls back to any linked wallet.
 */
export function getPrivyWallet(
    user: PrivyUserLike | null | undefined,
): { address?: string; chainId?: string } | undefined {
    return user?.wallet ?? findLinkedAccount(user, 'wallet');
}

/**
 * Address of {@link getPrivyWallet} as a viem `Address`, or undefined when no
 * wallet is linked.
 *
 * Privy types the address as a plain string, so it is checked against the hex
 * address shape here rather than asserted blindly — anything else is treated
 * as no wallet, which is what the callers already handle.
 */
export function getPrivyWalletAddress(
    user: PrivyUserLike | null | undefined,
): Address | undefined {
    const address = getPrivyWallet(user)?.address;
    return address && ADDRESS_PATTERN.test(address) ? (address as Address) : undefined;
}
