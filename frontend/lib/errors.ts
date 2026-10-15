/**
 * Error helpers shared by the API routes and the client pages.
 *
 * The routes all answer the same way — a JSON body carrying a machine-readable
 * message plus an HTTP status — so the status travels on the error itself.
 * `HttpError` is how our own code sets it; `getErrorStatus` also understands
 * the `statusCode` that the Stripe SDK uses, so a route can hand back a
 * meaningful status whether the failure came from us or from a provider.
 */

/** An error carrying the HTTP status the API route should answer with. */
export class HttpError extends Error {
    readonly status: number;

    constructor(message: string, status: number) {
        super(message);
        this.name = 'HttpError';
        this.status = status;
    }
}

function asRecord(err: unknown): Record<string, unknown> | null {
    return typeof err === 'object' && err !== null ? (err as Record<string, unknown>) : null;
}

/** Message of an unknown throwable, falling back to a generic code. */
export function getErrorMessage(err: unknown, fallback = 'internal_error'): string {
    if (err instanceof Error && err.message) return err.message;
    if (typeof err === 'string' && err) return err;
    const message = asRecord(err)?.message;
    return typeof message === 'string' && message ? message : fallback;
}

/**
 * HTTP status an unknown throwable asks for: our own `HttpError.status`, then
 * Stripe's `statusCode`, then a bare `status` property.
 */
export function getErrorStatus(err: unknown, fallback = 500): number {
    if (err instanceof HttpError) return err.status;
    const record = asRecord(err);
    for (const key of ['statusCode', 'status'] as const) {
        const value = record?.[key];
        if (typeof value === 'number' && value >= 400 && value <= 599) return value;
    }
    return fallback;
}

/**
 * Machine-readable error code, when the thrower provides one: Stripe uses
 * `code` (e.g. `resource_missing`), Postgres uses it for SQLSTATE values
 * (e.g. `23505`, unique violation).
 */
export function getErrorCode(err: unknown): string | undefined {
    const code = asRecord(err)?.code;
    return typeof code === 'string' ? code : undefined;
}
