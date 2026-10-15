/**
 * Server-side authentication helpers for API routes.
 *
 * Verifies a Privy access token from the Authorization header, returns the
 * caller's wallet address. Privy issues these tokens after email/SMS auth and
 * keeps them refreshed for the client SDK; we just validate them server-side.
 */

import { PrivyClient } from '@privy-io/server-auth';
import { NextRequest } from 'next/server';
import { HttpError } from './errors';
import { findLinkedAccountAddress, getPrivyWalletAddress } from './privy-user';

let _privy: PrivyClient | null = null;

function getPrivy(): PrivyClient {
    if (_privy) return _privy;
    const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
    const appSecret = process.env.PRIVY_APP_SECRET;
    if (!appId || !appSecret) {
        throw new Error('NEXT_PUBLIC_PRIVY_APP_ID and PRIVY_APP_SECRET must be configured');
    }
    _privy = new PrivyClient(appId, appSecret);
    return _privy;
}

export interface AuthContext {
    walletAddress: string;
    email: string | null;
    userId: string;
}

/**
 * Extracts and validates the Privy session from the request.
 * Throws a NextResponse-friendly Error with status hint on failure.
 */
export async function requireAuth(req: NextRequest): Promise<AuthContext> {
    const authHeader = req.headers.get('authorization') || '';
    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    if (!match) {
        throw new HttpError('missing_bearer_token', 401);
    }
    const token = match[1];

    let verified;
    try {
        verified = await getPrivy().verifyAuthToken(token);
    } catch {
        throw new HttpError('invalid_token', 401);
    }

    const userId = verified.userId;
    const user = await getPrivy().getUserById(userId);

    // Wallet detection: align with the rest of the app, which uses
    //   user.wallet ?? linkedAccounts.find(type === 'wallet')
    // We prefer the embedded Privy wallet (user.wallet) when present so the
    // off-chain DB key matches the address the frontend actually uses for
    // on-chain transactions, then fall back to any other linked wallet.
    const walletAddress = getPrivyWalletAddress(user);

    if (!walletAddress) {
        throw new HttpError('no_wallet_linked', 403);
    }

    // Locate the email account if any (Privy email login)
    const email = findLinkedAccountAddress(user, 'email');

    return {
        walletAddress: walletAddress.toLowerCase(),
        email,
        userId,
    };
}
