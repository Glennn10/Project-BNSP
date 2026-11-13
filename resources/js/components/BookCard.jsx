import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag } from 'lucide-react';
import { useCart } from '../context/CartContext';

const FALLBACK_COVER = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 400 560%22%3E%3Crect width=%22400%22 height=%22560%22 fill=%22%23e2e8f0%22/%3E%3Cpath d=%22M145 180h110v170H145z%22 fill=%22%2394a3b8%22/%3E%3Cpath d=%22M165 210h70m-70 24h70m-70 24h52%22 stroke=%22%23e2e8f0%22 stroke-width=%228%22 stroke-linecap=%22round%22/%3E%3Ctext x=%22200%22 y=%22410%22 text-anchor=%22middle%22 font-family=%22Arial%22 font-size=%2220%22 fill=%22%23475569%22%3EBookSales%3C/text%3E%3C/svg%3E';

const COVER_THEMES = {
    fantasi: { start: '#172554', end: '#6d28d9', accent: '#c4b5fd', label: 'FANTASI' },
    'fiksi ilmiah': { start: '#082f49', end: '#0369a1', accent: '#67e8f9', label: 'FIKSI ILMIAH' },
    komedi: { start: '#7c2d12', end: '#c2410c', accent: '#fed7aa', label: 'KOMEDI' },
    novel: { start: '#064e3b', end: '#0f766e', accent: '#a7f3d0', label: 'NOVEL' },
    sejarah: { start: '#451a03', end: '#92400e', accent: '#fde68a', label: 'SEJARAH' },
};

function escapeSvgText(value) {
    return String(value || '').replace(/[&<>"']/g, (character) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&apos;',
    })[character]);
}

function wrapTitle(value) {
    const lines = [];
    let line = '';

    for (const word of String(value || 'BookSales').split(/\s+/)) {
        if (line && `${line} ${word}`.length > 18) {
            lines.push(line);
            line = word;
        } else {
            line = line ? `${line} ${word}` : word;
        }
    }

    if (line) {
        lines.push(line);
    }

    return lines.slice(0, 4);
}

function createBookCover(title, author, genre) {
    const theme = COVER_THEMES[String(genre || '').toLowerCase()] || {
        start: '#0f172a',
        end: '#1d4ed8',
        accent: '#bfdbfe',
        label: 'PILIHAN BACAAN',
    };
    const titleLines = wrapTitle(title)
        .map((line, index) => `<tspan x="38" dy="${index === 0 ? 0 : 38}">${escapeSvgText(line)}</tspan>`)
        .join('');
    const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 560">
            <defs>
                <linearGradient id="bg" x2="1" y2="1">
                    <stop stop-color="${theme.start}" />
                    <stop offset="1" stop-color="${theme.end}" />
                </linearGradient>
                <radialGradient id="glow">
                    <stop stop-color="${theme.accent}" stop-opacity=".45" />
                    <stop offset="1" stop-color="${theme.accent}" stop-opacity="0" />
                </radialGradient>
            </defs>
            <rect width="400" height="560" fill="url(#bg)" />
            <circle cx="300" cy="170" r="155" fill="url(#glow)" />
            <circle cx="320" cy="145" r="92" fill="none" stroke="${theme.accent}" stroke-opacity=".35" stroke-width="2" />
            <circle cx="320" cy="145" r="68" fill="none" stroke="${theme.accent}" stroke-opacity=".25" />
            <path d="M72 166 Q136 143 200 172 Q264 143 328 166 V270 Q264 247 200 276 Q136 247 72 270Z" fill="#ffffff" fill-opacity=".09" stroke="${theme.accent}" stroke-opacity=".82" stroke-width="3" />
            <path d="M200 172V276M96 191q46-14 82 0m-82 24q46-14 82 0m44-24q36-14 82 0m-82 24q36-14 82 0" fill="none" stroke="${theme.accent}" stroke-opacity=".75" stroke-width="3" stroke-linecap="round" />
            <text x="38" y="52" fill="${theme.accent}" font-family="Arial,sans-serif" font-size="15" font-weight="700" letter-spacing="2">${theme.label}</text>
            <text x="38" y="365" fill="#ffffff" font-family="Georgia,serif" font-size="29" font-weight="700">${titleLines}</text>
            <path d="M38 468h92" stroke="${theme.accent}" stroke-width="3" />
            <text x="38" y="500" fill="#ffffff" font-family="Arial,sans-serif" font-size="17">${escapeSvgText(author || 'Penulis BookSales')}</text>
            <text x="38" y="531" fill="${theme.accent}" font-family="Arial,sans-serif" font-size="11" letter-spacing="2">KOLEKSI BOOKSALES</text>
        </svg>`;

    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export function CoverImage({ src, alt, className = '', title, author, genre }) {
    const [failed, setFailed] = useState(false);
    const fallbackCover = title || author || genre
        ? createBookCover(title, author, genre)
        : FALLBACK_COVER;

    return (
        <img
            src={failed || !src ? fallbackCover : src}
            alt={alt}
            className={className}
            loading="lazy"
            onError={() => setFailed(true)}
        />
    );
}

export function BookCard({ book }) {
    const { addItem } = useCart();

    return (
        <article className="group overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-900/10">
            <Link to={`/books/${book.id}`} className="relative block overflow-hidden bg-slate-100">
                <CoverImage
                    src={book.cover_url || book.cover_photo}
                    alt={`Sampul buku ${book.title}`}
                    title={book.title}
                    author={book.author?.name}
                    genre={book.genre?.name}
                    className="aspect-[4/5] w-full bg-slate-100 p-2 object-contain transition duration-300"
                />
                <span className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-[11px] font-bold text-slate-700 shadow-sm backdrop-blur">{book.genre?.name || 'Pilihan'}</span>
            </Link>
            <div className="p-4 sm:p-5">
                <Link to={`/books/${book.id}`} className="line-clamp-2 min-h-12 text-[15px] font-bold leading-6 text-slate-900 transition hover:text-primary-700">{book.title}</Link>
                <p className="mt-1 truncate text-sm text-slate-500">{book.author?.name || 'Penulis BookSales'}</p>
                <div className="mt-4 flex items-end justify-between gap-2">
                    <div>
                        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Harga</p>
                        <p className="mt-0.5 text-base font-extrabold text-navy-900">{formatPrice(book.price)}</p>
                    </div>
                    <button
                        type="button"
                        disabled={book.stock < 1}
                        onClick={() => addItem(book)}
                        className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary-50 text-primary-700 transition hover:bg-primary-600 hover:text-white disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                        aria-label={book.stock > 0 ? `Tambah ${book.title} ke keranjang` : 'Stok habis'}
                    >
                        <ShoppingBag size={18} />
                    </button>
                </div>
                <p className={`mt-3 text-xs font-semibold ${book.stock > 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                    {book.stock > 0 ? `${book.stock} tersedia` : 'Stok habis'}
                </p>
            </div>
        </article>
    );
}

export function formatPrice(value) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0,
    }).format(Number(value) || 0);
}

export function BookCardSkeleton() {
    return (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="aspect-[4/5] animate-pulse bg-slate-200" />
            <div className="space-y-3 p-5">
                <div className="h-4 animate-pulse rounded bg-slate-200" />
                <div className="h-3 w-2/3 animate-pulse rounded bg-slate-100" />
                <div className="h-5 w-1/2 animate-pulse rounded bg-slate-200" />
            </div>
        </div>
    );
}
