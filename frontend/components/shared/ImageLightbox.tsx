'use client';

/**
 * Fullscreen viewer for a set of artwork photographs.
 *
 * The page below shows an image fitted into the layout; this shows it as
 * large as the viewport allows, which is what someone looking at the detail
 * of a print or a weave actually needs. It stays a viewer, not a gallery:
 * no transitions, no chrome beyond what is needed to move and leave.
 *
 * Closes on Escape, on the backdrop, or on the close button; arrow keys move
 * between images. The page behind it is locked while it is open so a scroll
 * gesture does not drift the layout underneath.
 */

import { useCallback, useEffect, useRef } from 'react';
import Image from 'next/image';

interface ImageLightboxProps {
    /** Absolute image URLs, in display order. */
    images: string[];
    /** Index currently shown; the parent owns it so the page stays in step. */
    index: number;
    onIndexChange: (index: number) => void;
    onClose: () => void;
    /** Alt text for the image at a given position. */
    altFor: (index: number) => string;
    labels: {
        close: string;
        previous: string;
        next: string;
    };
}

export default function ImageLightbox({
    images,
    index,
    onIndexChange,
    onClose,
    altFor,
    labels,
}: ImageLightboxProps) {
    const dialogRef = useRef<HTMLDivElement>(null);
    const hasSeveral = images.length > 1;

    const go = useCallback(
        (delta: number) => {
            if (!hasSeveral) return;
            onIndexChange((index + delta + images.length) % images.length);
        },
        [hasSeveral, index, images.length, onIndexChange],
    );

    // Keyboard: leave with Escape, move with the arrow keys.
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
            else if (e.key === 'ArrowLeft') go(-1);
            else if (e.key === 'ArrowRight') go(1);
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [go, onClose]);

    // Hold the page still behind the viewer, and give it back the scrollbar
    // width so the layout does not jump as it opens.
    useEffect(() => {
        const { body } = document;
        const previousOverflow = body.style.overflow;
        const previousPadding = body.style.paddingRight;
        const scrollbar = window.innerWidth - document.documentElement.clientWidth;
        body.style.overflow = 'hidden';
        if (scrollbar > 0) body.style.paddingRight = `${scrollbar}px`;
        return () => {
            body.style.overflow = previousOverflow;
            body.style.paddingRight = previousPadding;
        };
    }, []);

    // Move focus into the viewer so Escape and the arrow keys reach it even
    // when the click that opened it came from a thumbnail.
    useEffect(() => {
        dialogRef.current?.focus();
    }, []);

    const current = images[index];
    if (!current) return null;

    return (
        <div
            ref={dialogRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label={altFor(index)}
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
            // A deliberately theme-independent scrim: `--bg-inverse` flips with
            // the theme, which would put an artwork against white in dark mode.
            // A viewer should show the work against neutral dark either way.
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#0c0a09]/95 backdrop-blur-sm outline-none"
        >
            {/* The controls carry their own dark backing: they sit over the
                artwork, which may be white at the edges — opacity alone would
                leave them invisible on a light photograph. */}
            {/* Close */}
            <button
                type="button"
                onClick={onClose}
                aria-label={labels.close}
                className="absolute top-4 right-4 z-10 flex h-10 w-10 items-center justify-center border border-white/25 bg-black/40 text-white opacity-80 backdrop-blur-sm transition-opacity duration-200 hover:opacity-100 cursor-pointer"
            >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <path d="M2 2l12 12M14 2L2 14" stroke="currentColor" strokeWidth="1.25" />
                </svg>
            </button>

            {hasSeveral && (
                <>
                    <button
                        type="button"
                        onClick={() => go(-1)}
                        aria-label={labels.previous}
                        className="absolute left-2 md:left-4 z-10 flex h-12 w-12 items-center justify-center bg-black/40 text-white opacity-80 backdrop-blur-sm transition-opacity duration-200 hover:opacity-100 cursor-pointer"
                    >
                        <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
                            <path d="M14 3L6 11l8 8" stroke="currentColor" strokeWidth="1.25" />
                        </svg>
                    </button>
                    <button
                        type="button"
                        onClick={() => go(1)}
                        aria-label={labels.next}
                        className="absolute right-2 md:right-4 z-10 flex h-12 w-12 items-center justify-center bg-black/40 text-white opacity-80 backdrop-blur-sm transition-opacity duration-200 hover:opacity-100 cursor-pointer"
                    >
                        <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
                            <path d="M8 3l8 8-8 8" stroke="currentColor" strokeWidth="1.25" />
                        </svg>
                    </button>
                </>
            )}

            {/* The image itself — `fill` against a padded box so it scales to
                the viewport without needing its natural dimensions. */}
            <div className="relative h-full w-full p-10 md:p-16">
                <Image
                    key={current}
                    src={current}
                    alt={altFor(index)}
                    fill
                    sizes="100vw"
                    priority
                    className="object-contain"
                />
            </div>

            {hasSeveral && (
                <span className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 px-3 py-1 text-[11px] font-medium tracking-[0.15em] text-white backdrop-blur-sm">
                    {index + 1} / {images.length}
                </span>
            )}
        </div>
    );
}
