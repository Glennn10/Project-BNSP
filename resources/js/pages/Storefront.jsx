import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowDown, ArrowLeft, ArrowRight, BookOpen, ChevronLeft, ChevronRight, Minus, Plus, Search, ShieldCheck, ShoppingBag, Sparkles, Trash2, Truck, X } from 'lucide-react';
import { BookCard, BookCardSkeleton, CoverImage, formatPrice } from '../components/BookCard';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { api, getErrorMessage } from '../lib/api';
import { payWithMidtrans } from '../lib/midtrans';

const CONTAINER = 'mx-auto max-w-7xl px-4 sm:px-6 lg:px-8';

function SectionHeading({ eyebrow, title, description, action }) {
    return (
        <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
            <div>
                {eyebrow && <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary-700">{eyebrow}</p>}
                <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-navy-900 sm:text-3xl">{title}</h2>
                {description && <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">{description}</p>}
            </div>
            {action}
        </div>
    );
}

async function startMidtransPayment(orderId, navigate, onPaymentReady = () => {}, onPaymentResult = () => {}) {
    try {
        const response = await api.post(`/transactions/${orderId}/payment`);
        const payment = response.data.data;
        onPaymentReady(payment);
        await payWithMidtrans(payment, {
            onSuccess: () => {
                onPaymentResult();
                toast.success('Pembayaran berhasil dikirim. Status akan diperbarui setelah konfirmasi Midtrans.');
                navigate('/orders');
            },
            onPending: () => {
                onPaymentResult();
                toast('Pembayaran menunggu konfirmasi Midtrans.');
                navigate('/orders');
            },
            onError: () => {
                onPaymentResult();
                toast.error('Pembayaran belum berhasil. Kamu dapat mencoba lagi dari riwayat pesanan.');
                navigate('/orders');
            },
            onClose: () => {
                onPaymentResult();
                toast('Pembayaran belum diselesaikan. Pesanan tetap tersimpan.');
                navigate('/orders');
            },
        });
    } catch (error) {
        toast.error(error.response ? getErrorMessage(error) : error.message);
        navigate('/orders');
    }
}

function Pagination({ page, lastPage, onChange }) {
    if (lastPage <= 1) {
        return null;
    }

    return (
        <div className="mt-9 flex items-center justify-center gap-2">
            <button type="button" disabled={page <= 1} onClick={() => onChange(page - 1)} className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 disabled:opacity-40" aria-label="Halaman sebelumnya">
                <ChevronLeft size={18} />
            </button>
            <span className="px-3 text-sm font-semibold text-slate-600">Halaman {page} dari {lastPage}</span>
            <button type="button" disabled={page >= lastPage} onClick={() => onChange(page + 1)} className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 disabled:opacity-40" aria-label="Halaman berikutnya">
                <ChevronRight size={18} />
            </button>
        </div>
    );
}

export function HomePage() {
    const [books, setBooks] = useState([]);
    const [genres, setGenres] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;

        Promise.all([
            api.get('/books', { params: { per_page: 8, sort: 'newest' } }),
            api.get('/genres', { params: { per_page: 10 } }),
        ])
            .then(([bookResponse, genreResponse]) => {
                if (mounted) {
                    setBooks(bookResponse.data.data.data);
                    setGenres(genreResponse.data.data.data);
                }
            })
            .catch((error) => toast.error(getErrorMessage(error)))
            .finally(() => {
                if (mounted) {
                    setLoading(false);
                }
            });

        return () => {
            mounted = false;
        };
    }, []);

    return (
        <>
            <section className={`${CONTAINER} pt-7 sm:pt-10`}>
                <div className="relative isolate overflow-hidden rounded-[2rem] bg-navy-900 px-6 py-12 text-white sm:px-12 sm:py-16 lg:px-16 lg:py-20">
                    <div className="absolute -right-20 -top-32 -z-10 h-96 w-96 rounded-full bg-primary-500/25 blur-3xl" />
                    <div className="absolute bottom-[-130px] right-[22%] -z-10 h-72 w-72 rounded-full bg-indigo-400/20 blur-3xl" />
                    <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
                        <div className="max-w-2xl">
                            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold text-primary-100">
                                <Sparkles size={14} /> Cerita baru, inspirasi tanpa batas
                            </span>
                            <h1 className="mt-6 text-4xl font-black leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">Temukan buku yang <span className="text-blue-300">mengubah cara</span> kamu melihat dunia.</h1>
                            <p className="mt-5 max-w-xl text-sm leading-7 text-slate-300 sm:text-base">Kurasi bacaan terbaik dari penulis Indonesia. Temukan kisah yang tepat untuk perjalananmu berikutnya.</p>
                            <div className="mt-8 flex flex-wrap gap-3">
                                <Link to="/books" className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3.5 text-sm font-extrabold text-navy-900 shadow-lg transition hover:-translate-y-0.5 hover:bg-primary-50">Jelajahi katalog <ArrowRight size={17} /></Link>
                                <a href="#featured" className="rounded-full border border-white/25 px-6 py-3.5 text-sm font-bold text-white transition hover:bg-white/10">Buku pilihan</a>
                            </div>
                            <div className="mt-9 flex flex-wrap gap-x-7 gap-y-3 text-xs font-medium text-slate-300">
                                <span className="inline-flex items-center gap-2"><ShieldCheck size={16} className="text-emerald-300" /> Transaksi aman</span>
                                <span className="inline-flex items-center gap-2"><Truck size={16} className="text-blue-300" /> Pilihan berkualitas</span>
                                <span className="inline-flex items-center gap-2"><BookOpen size={16} className="text-amber-300" /> Cerita Indonesia</span>
                            </div>
                        </div>
                        <div className="relative mx-auto hidden h-[350px] w-full max-w-[440px] items-center justify-center md:flex">
                            <div className="absolute h-64 w-64 rounded-full border border-white/10 bg-white/5" />
                            <div className="absolute h-80 w-80 rounded-full border border-white/10" />
                            <div className="absolute left-[8%] top-[15%] h-48 w-36 -rotate-12 rounded-2xl border border-white/20 bg-gradient-to-br from-blue-400 to-indigo-800 p-4 shadow-2xl">
                                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/80">Kisah pilihan</span>
                                <div className="mt-10 h-1 w-12 rounded bg-white/70" />
                                <div className="mt-2 h-1 w-20 rounded bg-white/40" />
                            </div>
                            <div className="absolute right-[8%] top-[7%] h-56 w-40 rotate-6 rounded-2xl border border-white/20 bg-gradient-to-br from-amber-300 to-rose-700 p-4 shadow-2xl">
                                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/80">Edisi terbaru</span>
                                <div className="mt-16 h-1 w-12 rounded bg-white/70" />
                                <div className="mt-2 h-1 w-20 rounded bg-white/40" />
                            </div>
                            <div className="absolute bottom-[4%] left-[28%] h-52 w-40 -rotate-2 rounded-2xl border border-white/20 bg-gradient-to-br from-emerald-300 to-teal-900 p-4 shadow-2xl">
                                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/80">Temukan dirimu</span>
                                <div className="mt-14 h-1 w-12 rounded bg-white/70" />
                                <div className="mt-2 h-1 w-20 rounded bg-white/40" />
                            </div>
                            <div className="absolute bottom-1 right-1 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 shadow-xl backdrop-blur">
                                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-300">Katalog terkurasi</p>
                                <p className="mt-1 text-xl font-black">{loading ? '—' : `${books.length}+ buku`}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {genres.length > 0 && (
                <section className={`${CONTAINER} pt-14`}>
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary-700">Jelajahi minatmu</p>
                            <h2 className="mt-2 text-xl font-extrabold text-navy-900">Kategori populer</h2>
                        </div>
                        <Link to="/books" className="text-sm font-bold text-primary-700 hover:text-primary-900">Semua kategori <ArrowRight size={15} className="ml-1 inline" /></Link>
                    </div>
                    <div className="mt-5 flex gap-3 overflow-x-auto pb-2">
                        {genres.map((genre) => (
                            <Link key={genre.id} to={`/books?genre_id=${genre.id}`} className="shrink-0 rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-primary-200 hover:bg-primary-50 hover:text-primary-700">{genre.name}</Link>
                        ))}
                    </div>
                </section>
            )}

            <section id="featured" className={`${CONTAINER} pt-14`}>
                <SectionHeading
                    eyebrow="Dari rak pilihan"
                    title="Temani harimu dengan cerita baru"
                    description="Pilihan bacaan yang disukai pembaca, siap menemani waktu luangmu."
                    action={<Link to="/books" className="hidden items-center gap-2 text-sm font-bold text-primary-700 sm:inline-flex">Lihat katalog <ArrowRight size={16} /></Link>}
                />
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
                    {loading
                        ? Array.from({ length: 8 }, (_, index) => <BookCardSkeleton key={index} />)
                        : books.map((book) => <BookCard key={book.id} book={book} />)}
                </div>
                {!loading && books.length === 0 && <p className="rounded-2xl bg-white p-8 text-center text-sm text-slate-500">Belum ada buku yang tersedia. Silakan kembali nanti.</p>}
            </section>

            <section className={`${CONTAINER} pt-16`}>
                <div className="grid gap-4 md:grid-cols-3">
                    {[
                        ['01', 'Pilihan berkualitas', 'Katalog dikurasi untuk pengalaman membaca yang lebih bermakna.'],
                        ['02', 'Belanja praktis', 'Cari, pilih, dan pesan buku dari perangkat apa pun.'],
                        ['03', 'Dukung penulis lokal', 'Kenali karya-karya menarik dari penulis Indonesia.'],
                    ].map(([number, title, copy]) => (
                        <div key={number} className="rounded-2xl border border-slate-200 bg-white p-6">
                            <span className="text-xs font-black tracking-[0.2em] text-primary-600">{number}</span>
                            <h3 className="mt-4 text-lg font-extrabold text-navy-900">{title}</h3>
                            <p className="mt-2 text-sm leading-6 text-slate-500">{copy}</p>
                        </div>
                    ))}
                </div>
            </section>
        </>
    );
}

export function CatalogPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const resultsRef = useRef(null);
    const [books, setBooks] = useState([]);
    const [genres, setGenres] = useState([]);
    const [authors, setAuthors] = useState([]);
    const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, total: 0 });
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState(searchParams.get('search') || '');
    const currentQuery = searchParams.toString();

    useEffect(() => {
        setSearch(searchParams.get('search') || '');
    }, [currentQuery]);

    useEffect(() => {
        let mounted = true;
        Promise.all([
            api.get('/genres', { params: { per_page: 50 } }),
            api.get('/authors', { params: { per_page: 50 } }),
        ])
            .then(([genreResponse, authorResponse]) => {
                if (mounted) {
                    setGenres(genreResponse.data.data.data);
                    setAuthors(authorResponse.data.data.data);
                }
            })
            .catch((error) => toast.error(getErrorMessage(error)));

        return () => {
            mounted = false;
        };
    }, []);

    useEffect(() => {
        let mounted = true;
        setLoading(true);
        api.get('/books', { params: { ...Object.fromEntries(searchParams.entries()), per_page: 8 } })
            .then((response) => {
                if (mounted) {
                    setBooks(response.data.data.data);
                    setPagination(response.data.data);
                }
            })
            .catch((error) => {
                if (mounted) {
                    toast.error(getErrorMessage(error));
                }
            })
            .finally(() => {
                if (mounted) {
                    setLoading(false);
                }
            });

        return () => {
            mounted = false;
        };
    }, [currentQuery]);

    function updateFilter(key, value) {
        const next = new URLSearchParams(searchParams);
        if (value) {
            next.set(key, value);
        } else {
            next.delete(key);
        }
        if (key !== 'page') {
            next.delete('page');
        }
        setSearchParams(next);
    }

    function changePage(page) {
        updateFilter('page', String(page));
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function submitSearch(event) {
        event.preventDefault();
        updateFilter('search', search.trim());
    }

    return (
        <section className={`${CONTAINER} py-10 sm:py-14`}>
            <div className="mb-8 rounded-3xl bg-gradient-to-r from-navy-900 to-primary-800 px-6 py-8 text-white sm:px-10 sm:py-10">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-200">Temukan bacaan berikutnya</p>
                <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Katalog buku</h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-100">Saring koleksi berdasarkan genre, penulis, dan rentang harga untuk menemukan buku yang paling cocok.</p>
            </div>

            <div className="grid gap-8 lg:grid-cols-[250px_1fr]">
                <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                        <h2 className="font-extrabold text-navy-900">Filter buku</h2>
                        <button type="button" onClick={() => setSearchParams({})} className="text-xs font-bold text-primary-700 hover:text-primary-900">Reset</button>
                    </div>
                    <form onSubmit={submitSearch} className="mt-5">
                        <label className="text-xs font-bold text-slate-600" htmlFor="catalog-search">Cari buku</label>
                        <div className="mt-2 flex rounded-xl border border-slate-200 px-3 focus-within:border-primary-300 focus-within:ring-4 focus-within:ring-primary-100">
                            <Search size={16} className="my-auto text-slate-400" />
                            <input id="catalog-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Judul atau penulis" className="w-full border-0 bg-transparent px-2 py-2.5 text-sm outline-none focus:ring-0" />
                        </div>
                    </form>

                    <label className="mt-5 block text-xs font-bold text-slate-600" htmlFor="genre-filter">Genre</label>
                    <select id="genre-filter" value={searchParams.get('genre_id') || ''} onChange={(event) => updateFilter('genre_id', event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm focus:border-primary-400 focus:ring-primary-100">
                        <option value="">Semua genre</option>
                        {genres.map((genre) => <option key={genre.id} value={genre.id}>{genre.name}</option>)}
                    </select>

                    <label className="mt-5 block text-xs font-bold text-slate-600" htmlFor="author-filter">Penulis</label>
                    <select id="author-filter" value={searchParams.get('author_id') || ''} onChange={(event) => updateFilter('author_id', event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm focus:border-primary-400 focus:ring-primary-100">
                        <option value="">Semua penulis</option>
                        {authors.map((author) => <option key={author.id} value={author.id}>{author.name}</option>)}
                    </select>

                    <div className="mt-5 grid grid-cols-2 gap-3">
                        <label className="text-xs font-bold text-slate-600">Harga min.
                            <input type="number" min="0" value={searchParams.get('min_price') || ''} onChange={(event) => updateFilter('min_price', event.target.value)} placeholder="0" className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal focus:border-primary-400 focus:ring-primary-100" />
                        </label>
                        <label className="text-xs font-bold text-slate-600">Harga maks.
                            <input type="number" min="0" value={searchParams.get('max_price') || ''} onChange={(event) => updateFilter('max_price', event.target.value)} placeholder="∞" className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal focus:border-primary-400 focus:ring-primary-100" />
                        </label>
                    </div>
                </aside>

                <div>
                    <div ref={resultsRef} className="mb-5 flex flex-wrap items-center justify-between gap-3">
                        <p className="text-sm text-slate-500">{loading ? 'Memuat katalog...' : `${pagination.total} buku ditemukan`}</p>
                        <label className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                            <ArrowDown size={16} />
                            <select value={searchParams.get('sort') || 'newest'} onChange={(event) => updateFilter('sort', event.target.value === 'newest' ? '' : event.target.value)} className="rounded-lg border-slate-200 bg-white py-2 pl-3 pr-8 text-sm focus:border-primary-400 focus:ring-primary-100">
                                <option value="newest">Terbaru</option>
                                <option value="price_asc">Harga termurah</option>
                                <option value="price_desc">Harga termahal</option>
                                <option value="title_asc">Nama A–Z</option>
                            </select>
                        </label>
                    </div>
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
                        {loading
                            ? Array.from({ length: 8 }, (_, index) => <BookCardSkeleton key={index} />)
                            : books.map((book) => <BookCard key={book.id} book={book} />)}
                    </div>
                    {!loading && books.length === 0 && <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center"><BookOpen className="mx-auto text-slate-300" size={34} /><p className="mt-3 font-bold text-slate-700">Buku tidak ditemukan</p><p className="mt-1 text-sm text-slate-500">Coba ubah kata kunci atau filter pencarian.</p></div>}
                    <Pagination page={pagination.current_page} lastPage={pagination.last_page} onChange={changePage} />
                </div>
            </div>
        </section>
    );
}

export function BookDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { addItem } = useCart();
    const [book, setBook] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;
        api.get(`/books/${id}`)
            .then((response) => {
                if (mounted) {
                    setBook(response.data.data);
                }
            })
            .catch((error) => {
                if (mounted) {
                    toast.error(getErrorMessage(error));
                    navigate('/books', { replace: true });
                }
            })
            .finally(() => {
                if (mounted) {
                    setLoading(false);
                }
            });

        return () => {
            mounted = false;
        };
    }, [id, navigate]);

    if (loading) {
        return <div className={`${CONTAINER} py-14`}><div className="grid animate-pulse gap-8 md:grid-cols-2"><div className="aspect-[4/5] rounded-3xl bg-slate-200" /><div className="space-y-5"><div className="h-8 rounded bg-slate-200" /><div className="h-5 rounded bg-slate-100" /><div className="h-40 rounded bg-slate-100" /></div></div></div>;
    }

    if (!book) {
        return null;
    }

    function buyNow() {
        addItem(book);
        navigate('/cart');
    }

    return (
        <section className={`${CONTAINER} py-10 sm:py-14`}>
            <Link to="/books" className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-primary-700"><ArrowLeft size={16} /> Kembali ke katalog</Link>
            <div className="mt-7 grid gap-8 md:grid-cols-[0.85fr_1.15fr] lg:gap-14">
                <div className="mx-auto w-full max-w-md overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-lg shadow-slate-900/5">
                    <CoverImage src={book.cover_url || book.cover_photo} alt={`Sampul buku ${book.title}`} title={book.title} author={book.author?.name} genre={book.genre?.name} className="aspect-[4/5] w-full bg-slate-100 p-4 object-contain" />
                </div>
                <div className="py-2">
                    <div className="flex flex-wrap gap-2">
                        <span className="rounded-full bg-primary-50 px-3 py-1.5 text-xs font-bold text-primary-700">{book.genre?.name || 'Buku pilihan'}</span>
                        <span className={`rounded-full px-3 py-1.5 text-xs font-bold ${book.stock > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>{book.stock > 0 ? `${book.stock} tersedia` : 'Stok habis'}</span>
                    </div>
                    <h1 className="mt-5 text-3xl font-black leading-tight tracking-tight text-navy-900 sm:text-4xl">{book.title}</h1>
                    <p className="mt-3 text-lg font-semibold text-slate-500">{book.author?.name || 'Penulis BookSales'}</p>
                    <p className="mt-6 text-3xl font-black text-primary-700">{formatPrice(book.price)}</p>
                    <div className="mt-7 border-y border-slate-200 py-6">
                        <h2 className="font-extrabold text-navy-900">Tentang buku ini</h2>
                        <p className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-600">{book.description || 'Belum ada sinopsis untuk buku ini.'}</p>
                    </div>
                    {book.author?.bio && <div className="mt-6 rounded-2xl bg-white p-5"><p className="text-xs font-bold uppercase tracking-wide text-slate-400">Tentang penulis</p><p className="mt-2 font-bold text-navy-900">{book.author.name}</p><p className="mt-1 text-sm leading-6 text-slate-500">{book.author.bio}</p></div>}
                    <div className="mt-7 flex flex-wrap gap-3">
                        <button type="button" disabled={book.stock < 1} onClick={() => addItem(book)} className="inline-flex items-center justify-center gap-2 rounded-xl border border-primary-200 bg-white px-6 py-3.5 text-sm font-extrabold text-primary-700 transition hover:bg-primary-50 disabled:cursor-not-allowed disabled:opacity-50"><ShoppingBag size={17} /> Tambah ke keranjang</button>
                        <button type="button" disabled={book.stock < 1} onClick={buyNow} className="rounded-xl bg-navy-900 px-7 py-3.5 text-sm font-extrabold text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:bg-slate-400">Beli sekarang</button>
                    </div>
                </div>
            </div>
        </section>
    );
}

export function CartPage() {
    const { items, total, changeQuantity, removeItem } = useCart();

    if (!items.length) {
        return (
            <section className={`${CONTAINER} py-16`}>
                <div className="mx-auto max-w-lg rounded-3xl border border-slate-200 bg-white px-6 py-14 text-center shadow-sm">
                    <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-primary-50 text-primary-700"><ShoppingBag size={28} /></span>
                    <h1 className="mt-5 text-2xl font-black text-navy-900">Keranjangmu masih kosong</h1>
                    <p className="mt-2 text-sm text-slate-500">Temukan bacaan yang menarik dan tambahkan ke keranjang.</p>
                    <Link to="/books" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-navy-900 px-6 py-3 text-sm font-bold text-white hover:bg-primary-700">Jelajahi buku <ArrowRight size={16} /></Link>
                </div>
            </section>
        );
    }

    return (
        <section className={`${CONTAINER} py-10 sm:py-14`}>
            <SectionHeading eyebrow="Hampir jadi milikmu" title="Keranjang belanja" description={`${items.length} pilihan buku ada di keranjangmu.`} />
            <div className="grid items-start gap-8 lg:grid-cols-[1fr_350px]">
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                    {items.map((item) => (
                        <div key={item.book_id} className="flex gap-4 border-b border-slate-100 p-4 last:border-b-0 sm:gap-5 sm:p-6">
                            <CoverImage src={item.cover_url} alt={`Sampul buku ${item.title}`} title={item.title} author={item.author} genre={item.genre} className="h-28 w-20 shrink-0 rounded-xl bg-slate-100 p-1 object-contain sm:h-32 sm:w-24" />
                            <div className="min-w-0 flex-1">
                                <Link to={`/books/${item.book_id}`} className="line-clamp-2 font-extrabold text-navy-900 hover:text-primary-700">{item.title}</Link>
                                <p className="mt-1 text-sm text-slate-500">{item.author}</p>
                                <p className="mt-3 font-extrabold text-primary-700">{formatPrice(item.price)}</p>
                                <div className="mt-3 flex items-center justify-between gap-3">
                                    <div className="inline-flex items-center rounded-lg border border-slate-200">
                                        <button type="button" onClick={() => changeQuantity(item.book_id, item.quantity - 1)} className="grid h-8 w-8 place-items-center text-slate-500 hover:text-primary-700" aria-label="Kurangi jumlah"><Minus size={14} /></button>
                                        <span className="min-w-8 text-center text-sm font-bold">{item.quantity}</span>
                                        <button type="button" onClick={() => changeQuantity(item.book_id, item.quantity + 1)} disabled={item.quantity >= item.stock} className="grid h-8 w-8 place-items-center text-slate-500 hover:text-primary-700 disabled:opacity-40" aria-label="Tambah jumlah"><Plus size={14} /></button>
                                    </div>
                                    <button type="button" onClick={() => removeItem(item.book_id)} className="inline-flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-rose-600"><Trash2 size={15} /> Hapus</button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                <aside className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h2 className="text-lg font-extrabold text-navy-900">Ringkasan pesanan</h2>
                    <div className="mt-5 flex justify-between text-sm text-slate-500"><span>Subtotal</span><span className="font-semibold text-slate-800">{formatPrice(total)}</span></div>
                    <div className="mt-4 flex justify-between border-t border-slate-100 pt-4 text-base font-extrabold text-navy-900"><span>Total</span><span>{formatPrice(total)}</span></div>
                    <Link to="/checkout" className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-primary-600 px-5 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-primary-600/20 transition hover:bg-primary-700">Proses pesanan <ArrowRight size={17} /></Link>
                    <p className="mt-3 text-center text-xs leading-5 text-slate-400">Total akhir akan dikonfirmasi kembali saat pesanan diproses.</p>
                    <Link to="/books" className="mt-5 block text-center text-sm font-bold text-primary-700 hover:text-primary-900">Lanjut belanja</Link>
                </aside>
            </div>
        </section>
    );
}

export function CheckoutPage() {
    const { items, total, clearCart } = useCart();
    const navigate = useNavigate();
    const [submitting, setSubmitting] = useState(false);
    const [orderPlaced, setOrderPlaced] = useState(false);

    useEffect(() => {
        if (!items.length && !submitting && !orderPlaced) {
            navigate('/cart', { replace: true });
        }
    }, [items.length, navigate, orderPlaced, submitting]);

    async function placeOrder() {
        setSubmitting(true);

        try {
            const response = await api.post('/transactions', {
                items: items.map((item) => ({ book_id: item.book_id, quantity: item.quantity })),
            });
            setOrderPlaced(true);
            clearCart();
            await startMidtransPayment(response.data.data.id, navigate);
        } catch (error) {
            toast.error(getErrorMessage(error));
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <section className={`${CONTAINER} py-10 sm:py-14`}>
            <SectionHeading eyebrow="Konfirmasi" title="Checkout pesanan" description="Periksa kembali buku pilihanmu sebelum membuat pesanan." />
            <div className="mx-auto grid max-w-5xl items-start gap-8 lg:grid-cols-[1fr_340px]">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
                    <h2 className="font-extrabold text-navy-900">Buku yang dipesan</h2>
                    <div className="mt-5 divide-y divide-slate-100">
                        {items.map((item) => (
                            <div key={item.book_id} className="flex justify-between gap-4 py-4 first:pt-0 last:pb-0">
                                <div><p className="font-bold text-slate-800">{item.title}</p><p className="mt-1 text-sm text-slate-500">{item.quantity} × {formatPrice(item.price)}</p></div>
                                <p className="shrink-0 font-bold text-navy-900">{formatPrice(item.quantity * item.price)}</p>
                            </div>
                        ))}
                    </div>
                    <div className="mt-6 rounded-xl bg-amber-50 p-4 text-sm leading-6 text-amber-900">Pembayaran diproses melalui Midtrans. Status pesanan akan berubah setelah server menerima konfirmasi pembayaran.</div>
                </div>
                <aside className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h2 className="text-lg font-extrabold text-navy-900">Ringkasan</h2>
                    <div className="mt-5 flex justify-between text-sm text-slate-500"><span>Total buku</span><span>{items.reduce((sum, item) => sum + item.quantity, 0)}</span></div>
                    <div className="mt-4 flex justify-between border-t border-slate-100 pt-4 text-base font-extrabold text-navy-900"><span>Total pesanan</span><span>{formatPrice(total)}</span></div>
                    <button onClick={placeOrder} type="button" disabled={submitting || !items.length} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-navy-900 px-5 py-3.5 text-sm font-extrabold text-white transition hover:bg-primary-700 disabled:cursor-wait disabled:opacity-60">{submitting ? 'Memproses...' : 'Buat pesanan & bayar'} <ArrowRight size={17} /></button>
                    <Link to="/cart" className="mt-4 flex items-center justify-center gap-2 text-sm font-semibold text-slate-500 hover:text-primary-700"><ArrowLeft size={15} /> Kembali ke keranjang</Link>
                </aside>
            </div>
        </section>
    );
}

export function LoginPage() {
    const { user, signIn } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [form, setForm] = useState({ email: '', password: '' });
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (user) {
            navigate(user.role === 'admin' ? '/admin' : (location.state?.from?.pathname || '/'), { replace: true });
        }
    }, [user, navigate, location.state]);

    async function submit(event) {
        event.preventDefault();
        setBusy(true);

        try {
            const loggedInUser = await signIn(form);
            toast.success('Selamat datang kembali.');
            navigate(loggedInUser.role === 'admin' ? '/admin' : (location.state?.from?.pathname || '/'), { replace: true });
        } catch (error) {
            toast.error(getErrorMessage(error));
        } finally {
            setBusy(false);
        }
    }

    return (
        <AuthShell title="Selamat datang kembali" subtitle="Masuk ke akunmu untuk melanjutkan menjelajahi bacaan pilihan.">
            <form onSubmit={submit} className="space-y-4">
                <FormField label="Email" type="email" autoComplete="email" value={form.email} onChange={(value) => setForm({ ...form, email: value })} placeholder="nama@email.com" />
                <FormField label="Kata sandi" type="password" autoComplete="current-password" value={form.password} onChange={(value) => setForm({ ...form, password: value })} placeholder="Masukkan kata sandi" />
                <button disabled={busy} className="mt-2 w-full rounded-xl bg-navy-900 px-5 py-3.5 text-sm font-extrabold text-white transition hover:bg-primary-700 disabled:opacity-60">{busy ? 'Memproses...' : 'Masuk'}</button>
            </form>
            <p className="mt-6 text-center text-sm text-slate-500">Belum punya akun? <Link to="/register" className="font-bold text-primary-700 hover:text-primary-900">Daftar sekarang</Link></p>
        </AuthShell>
    );
}

export function RegisterPage() {
    const { user, register } = useAuth();
    const navigate = useNavigate();
    const [busy, setBusy] = useState(false);
    const [form, setForm] = useState({ name: '', email: '', password: '', password_confirmation: '' });

    useEffect(() => {
        if (user) {
            navigate(user.role === 'admin' ? '/admin' : '/', { replace: true });
        }
    }, [user, navigate]);

    async function submit(event) {
        event.preventDefault();
        setBusy(true);

        try {
            await register(form);
            toast.success('Akun berhasil dibuat. Selamat datang!');
            navigate('/', { replace: true });
        } catch (error) {
            toast.error(getErrorMessage(error));
        } finally {
            setBusy(false);
        }
    }

    return (
        <AuthShell title="Mulai petualangan membaca" subtitle="Buat akun gratis dan simpan semua pesananmu di satu tempat.">
            <form onSubmit={submit} className="space-y-4">
                <FormField label="Nama lengkap" autoComplete="name" value={form.name} onChange={(value) => setForm({ ...form, name: value })} placeholder="Nama kamu" />
                <FormField label="Email" type="email" autoComplete="email" value={form.email} onChange={(value) => setForm({ ...form, email: value })} placeholder="nama@email.com" />
                <FormField label="Kata sandi" type="password" autoComplete="new-password" value={form.password} onChange={(value) => setForm({ ...form, password: value })} placeholder="Minimal 8 karakter" />
                <FormField label="Konfirmasi kata sandi" type="password" autoComplete="new-password" value={form.password_confirmation} onChange={(value) => setForm({ ...form, password_confirmation: value })} placeholder="Ulangi kata sandi" />
                <button disabled={busy} className="mt-2 w-full rounded-xl bg-navy-900 px-5 py-3.5 text-sm font-extrabold text-white transition hover:bg-primary-700 disabled:opacity-60">{busy ? 'Memproses...' : 'Buat akun'}</button>
            </form>
            <p className="mt-6 text-center text-sm text-slate-500">Sudah punya akun? <Link to="/login" className="font-bold text-primary-700 hover:text-primary-900">Masuk</Link></p>
        </AuthShell>
    );
}

function FormField({ label, type = 'text', value, onChange, placeholder, autoComplete }) {
    return (
        <label className="block text-sm font-bold text-slate-700">
            {label}
            <input
                type={type}
                value={value}
                onChange={(event) => onChange(event.target.value)}
                placeholder={placeholder}
                autoComplete={autoComplete}
                required
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-normal outline-none transition placeholder:text-slate-400 focus:border-primary-400 focus:ring-4 focus:ring-primary-100/70"
            />
        </label>
    );
}

function AuthShell({ title, subtitle, children }) {
    return (
        <section className={`${CONTAINER} flex min-h-[65vh] items-center justify-center py-12`}>
            <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-900/5 sm:p-9">
                <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary-50 text-primary-700"><BookOpen size={25} /></div>
                <h1 className="mt-5 text-center text-2xl font-black tracking-tight text-navy-900">{title}</h1>
                <p className="mt-2 text-center text-sm leading-6 text-slate-500">{subtitle}</p>
                <div className="mt-7">{children}</div>
            </div>
        </section>
    );
}

const STATUS_STYLES = {
    pending: 'bg-amber-50 text-amber-800 ring-amber-200',
    paid: 'bg-blue-50 text-blue-800 ring-blue-200',
    completed: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
    cancelled: 'bg-rose-50 text-rose-800 ring-rose-200',
};

function StatusBadge({ status }) {
    const labels = { pending: 'Menunggu', paid: 'Dibayar', completed: 'Selesai', cancelled: 'Dibatalkan' };
    return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold capitalize ring-1 ring-inset ${STATUS_STYLES[status] || 'bg-slate-50 text-slate-600 ring-slate-200'}`}>{labels[status] || status}</span>;
}

export function OrderHistoryPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const [orders, setOrders] = useState([]);
    const [page, setPage] = useState({ current_page: 1, last_page: 1 });
    const [drafts, setDrafts] = useState({});
    const [loading, setLoading] = useState(true);
    const [payingOrderId, setPayingOrderId] = useState(null);
    const [orderRefreshKey, setOrderRefreshKey] = useState(0);
    const currentPage = searchParams.get('page') || '1';

    useEffect(() => {
        let mounted = true;
        setLoading(true);
        api.get('/my-transactions', { params: { page: currentPage } })
            .then((response) => {
                if (mounted) {
                    const paginator = response.data.data;
                    setOrders(paginator.data);
                    setPage(paginator);
                    setDrafts(Object.fromEntries(paginator.data.map((order) => [
                        order.id,
                        order.items.map((item) => ({ book_id: item.book_id, title: item.title, quantity: item.quantity })),
                    ])));
                }
            })
            .catch((error) => {
                if (mounted) {
                    toast.error(getErrorMessage(error));
                }
            })
            .finally(() => {
                if (mounted) {
                    setLoading(false);
                }
            });

        return () => {
            mounted = false;
        };
    }, [currentPage, orderRefreshKey]);

    async function saveOrder(order) {
        const items = drafts[order.id] || [];

        if (!items.length) {
            toast.error('Pesanan harus memiliki minimal satu buku.');
            return;
        }

        try {
            const response = await api.put(`/transactions/${order.id}`, { items });
            setOrders((current) => current.map((item) => item.id === order.id ? response.data.data : item));
            setDrafts((current) => ({
                ...current,
                [order.id]: response.data.data.items.map((item) => ({
                    book_id: item.book_id,
                    title: item.title,
                    quantity: item.quantity,
                })),
            }));
            toast.success('Perubahan pesanan berhasil disimpan.');
        } catch (error) {
            toast.error(getErrorMessage(error));
        }
    }

    function changeDraft(orderId, itemIndex, quantity) {
        setDrafts((current) => ({
            ...current,
            [orderId]: current[orderId].map((item, index) => index === itemIndex ? { ...item, quantity: Math.max(1, quantity) } : item),
        }));
    }

    function removeDraft(orderId, itemIndex) {
        setDrafts((current) => ({
            ...current,
            [orderId]: current[orderId].filter((_, index) => index !== itemIndex),
        }));
    }

    return (
        <section className={`${CONTAINER} py-10 sm:py-14`}>
            <SectionHeading eyebrow="Akun pembaca" title="Riwayat pesanan" description="Pantau status pembayaran dan kelola pesanan yang masih pending." />
            {loading ? (
                <div className="space-y-4">{Array.from({ length: 3 }, (_, index) => <div key={index} className="h-36 animate-pulse rounded-2xl bg-slate-200" />)}</div>
            ) : orders.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center"><BookOpen className="mx-auto text-slate-300" size={32} /><p className="mt-3 font-bold text-slate-700">Belum ada pesanan</p><Link to="/books" className="mt-4 inline-flex text-sm font-bold text-primary-700">Temukan buku <ArrowRight size={15} className="ml-1" /></Link></div>
            ) : (
                <div className="space-y-4">
                    {orders.map((order) => (
                        <article key={order.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
                                <div><p className="text-xs font-semibold text-slate-400">Nomor pesanan</p><p className="mt-1 font-extrabold text-navy-900">{order.order_number}</p></div>
                                <div className="flex items-center gap-3"><StatusBadge status={order.status} /><span className="hidden text-xs text-slate-400 sm:inline">{new Date(order.created_at).toLocaleDateString('id-ID', { dateStyle: 'medium' })}</span></div>
                            </div>
                            <div className="space-y-3 px-5 py-4 sm:px-6">
                                {(order.status === 'pending' && !order.snap_token ? (drafts[order.id] || []) : order.items).map((item, index) => (
                                    <div key={`${order.id}-${index}`} className="flex flex-wrap items-center justify-between gap-3">
                                        <div><p className="text-sm font-bold text-slate-800">{item.title}</p><p className="mt-1 text-xs text-slate-500">{item.quantity} buku</p></div>
                                        {order.status === 'pending' && !order.snap_token && (
                                            <div className="flex items-center gap-1">
                                                <button type="button" onClick={() => changeDraft(order.id, index, item.quantity - 1)} className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 text-slate-600 hover:text-primary-700" aria-label="Kurangi jumlah"><Minus size={14} /></button>
                                                <span className="w-7 text-center text-sm font-bold">{item.quantity}</span>
                                                <button type="button" onClick={() => changeDraft(order.id, index, item.quantity + 1)} className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 text-slate-600 hover:text-primary-700" aria-label="Tambah jumlah"><Plus size={14} /></button>
                                                <button type="button" onClick={() => removeDraft(order.id, index)} className="ml-2 grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600" aria-label="Hapus buku dari pesanan"><X size={15} /></button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/70 px-5 py-4 sm:px-6">
                                <div><p className="text-xs text-slate-500">Total</p><p className="mt-0.5 font-extrabold text-navy-900">{formatPrice(order.total_amount)}</p></div>
                                {order.status === 'pending' && (
                                    <div className="flex flex-wrap gap-2">
                                        {!order.snap_token && <button type="button" onClick={() => saveOrder(order)} className="rounded-lg bg-slate-200 px-4 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-300">Simpan perubahan</button>}
                                        <button
                                            type="button"
                                            disabled={payingOrderId === order.id}
                                            onClick={() => {
                                                setPayingOrderId(order.id);
                                                void startMidtransPayment(order.id, navigate, (payment) => {
                                                    setOrders((current) => current.map((item) => item.id === order.id ? { ...item, snap_token: payment.snap_token } : item));
                                                }, () => setOrderRefreshKey((current) => current + 1)).finally(() => setPayingOrderId(null));
                                            }}
                                            className="rounded-lg bg-primary-600 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-primary-700 disabled:cursor-wait disabled:opacity-60"
                                        >
                                            {payingOrderId === order.id ? 'Menyiapkan pembayaran...' : 'Bayar dengan Midtrans'}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </article>
                    ))}
                    <Pagination page={page.current_page} lastPage={page.last_page} onChange={(nextPage) => setSearchParams({ page: String(nextPage) })} />
                </div>
            )}
        </section>
    );
}

export function NotFoundPage() {
    return (
        <section className={`${CONTAINER} flex min-h-[60vh] flex-col items-center justify-center py-14 text-center`}>
            <span className="text-7xl font-black tracking-tighter text-primary-100">404</span>
            <h1 className="mt-3 text-2xl font-black text-navy-900">Halaman tidak ditemukan</h1>
            <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">Halaman yang kamu cari mungkin sudah dipindahkan atau alamatnya tidak tepat.</p>
            <Link to="/" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-navy-900 px-5 py-3 text-sm font-bold text-white hover:bg-primary-700"><ArrowLeft size={16} /> Kembali ke beranda</Link>
        </section>
    );
}
