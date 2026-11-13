import { useState } from 'react';
import { Link, Navigate, Outlet, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { BookOpen, LogOut, Search, ShoppingBag, UserRound } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from './context/AuthContext';
import { useCart } from './context/CartContext';
import { getErrorMessage } from './lib/api';
import { AdminDashboard } from './pages/AdminDashboard';
import {
    BookDetailPage,
    CartPage,
    CatalogPage,
    CheckoutPage,
    HomePage,
    LoginPage,
    NotFoundPage,
    OrderHistoryPage,
    RegisterPage,
} from './pages/Storefront';

function PageLoader() {
    return (
        <div className="flex min-h-[50vh] items-center justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-100 border-t-primary-600" aria-label="Memuat" />
        </div>
    );
}

function ProtectedRoute({ role, children }) {
    const { user, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return <PageLoader />;
    }

    if (!user) {
        return <Navigate to="/login" replace state={{ from: location }} />;
    }

    if (role && user.role !== role) {
        return <Navigate to="/" replace />;
    }

    return children;
}

function Header() {
    const { user, signOut } = useAuth();
    const { count } = useCart();
    const navigate = useNavigate();
    const [search, setSearch] = useState('');
    const [menuOpen, setMenuOpen] = useState(false);

    async function handleSignOut() {
        try {
            await signOut();
            navigate('/');
        } catch (error) {
            toast.error(getErrorMessage(error));
            navigate('/');
        }
    }

    function submitSearch(event) {
        event.preventDefault();
        navigate(`/books${search.trim() ? `?search=${encodeURIComponent(search.trim())}` : ''}`);
        setMenuOpen(false);
    }

    return (
        <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
            <div className="mx-auto flex h-[76px] max-w-7xl items-center gap-5 px-4 sm:px-6 lg:px-8">
                <Link to="/" className="flex shrink-0 items-center gap-2.5" aria-label="BookSales beranda">
                    <span className="grid h-10 w-10 place-items-center rounded-2xl bg-navy-900 text-white shadow-lg shadow-slate-900/15">
                        <BookOpen size={20} strokeWidth={2.2} />
                    </span>
                    <span className="text-xl font-extrabold tracking-tight text-navy-900">Book<span className="text-primary-600">Sales</span></span>
                </Link>

                <nav className="hidden items-center gap-7 pl-5 text-sm font-semibold text-slate-600 lg:flex">
                    <Link className="transition hover:text-primary-700" to="/">Beranda</Link>
                    <Link className="transition hover:text-primary-700" to="/books">Katalog</Link>
                    {user?.role === 'customer' && <Link className="transition hover:text-primary-700" to="/orders">Pesanan Saya</Link>}
                    {user?.role === 'admin' && <Link className="transition hover:text-primary-700" to="/admin">Dashboard</Link>}
                </nav>

                <form onSubmit={submitSearch} className="ml-auto hidden max-w-sm flex-1 items-center rounded-full border border-slate-200 bg-slate-50 px-4 focus-within:border-primary-300 focus-within:bg-white focus-within:ring-4 focus-within:ring-primary-100/70 md:flex">
                    <Search size={17} className="shrink-0 text-slate-400" />
                    <input
                        aria-label="Cari buku"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Cari judul atau penulis..."
                        className="w-full border-0 bg-transparent px-3 py-2.5 text-sm outline-none placeholder:text-slate-400 focus:ring-0"
                    />
                </form>

                <div className="ml-auto flex items-center gap-2 md:ml-0">
                    <Link to="/cart" className="relative grid h-11 w-11 place-items-center rounded-full text-slate-600 transition hover:bg-slate-100 hover:text-navy-900" aria-label={`Keranjang, ${count} item`}>
                        <ShoppingBag size={20} />
                        {count > 0 && <span className="absolute right-0 top-0 grid min-h-5 min-w-5 place-items-center rounded-full bg-primary-600 px-1 text-[10px] font-bold text-white">{count}</span>}
                    </Link>
                    {user ? (
                        <div className="hidden items-center gap-2 sm:flex">
                            <span className="grid h-9 w-9 place-items-center rounded-full bg-primary-50 text-sm font-bold text-primary-700">{user.name?.slice(0, 1).toUpperCase()}</span>
                            <span className="hidden max-w-28 truncate text-sm font-semibold text-slate-700 xl:block">{user.name}</span>
                            <button onClick={handleSignOut} type="button" className="grid h-10 w-10 place-items-center rounded-full text-slate-500 transition hover:bg-rose-50 hover:text-rose-600" aria-label="Keluar">
                                <LogOut size={18} />
                            </button>
                        </div>
                    ) : (
                        <Link to="/login" className="hidden rounded-full bg-navy-900 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-primary-700 sm:inline-flex">Masuk</Link>
                    )}
                    <button className="grid h-10 w-10 place-items-center rounded-full text-slate-600 hover:bg-slate-100 lg:hidden" onClick={() => setMenuOpen((open) => !open)} aria-label="Buka menu">
                        <UserRound size={20} />
                    </button>
                </div>
            </div>

            {menuOpen && (
                <div className="border-t border-slate-100 bg-white px-4 py-4 shadow-lg lg:hidden">
                    <form onSubmit={submitSearch} className="mb-4 flex items-center rounded-xl border border-slate-200 bg-slate-50 px-3">
                        <Search size={17} className="text-slate-400" />
                        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari buku..." className="w-full border-0 bg-transparent px-3 py-3 text-sm outline-none focus:ring-0" />
                    </form>
                    <nav className="flex flex-col gap-1 text-sm font-semibold text-slate-700">
                        <Link onClick={() => setMenuOpen(false)} className="rounded-lg px-3 py-2.5 hover:bg-slate-50" to="/">Beranda</Link>
                        <Link onClick={() => setMenuOpen(false)} className="rounded-lg px-3 py-2.5 hover:bg-slate-50" to="/books">Katalog Buku</Link>
                        {user?.role === 'customer' && <Link onClick={() => setMenuOpen(false)} className="rounded-lg px-3 py-2.5 hover:bg-slate-50" to="/orders">Pesanan Saya</Link>}
                        {user?.role === 'admin' && <Link onClick={() => setMenuOpen(false)} className="rounded-lg px-3 py-2.5 hover:bg-slate-50" to="/admin">Dashboard Admin</Link>}
                        {user ? (
                            <button onClick={handleSignOut} className="rounded-lg px-3 py-2.5 text-left text-rose-600 hover:bg-rose-50" type="button">Keluar</button>
                        ) : (
                            <Link onClick={() => setMenuOpen(false)} className="rounded-lg px-3 py-2.5 text-primary-700 hover:bg-primary-50" to="/login">Masuk / Daftar</Link>
                        )}
                    </nav>
                </div>
            )}
        </header>
    );
}

function Footer() {
    return (
        <footer className="mt-20 bg-navy-900 text-white">
            <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr] lg:px-8">
                <div>
                    <Link to="/" className="flex items-center gap-2 text-xl font-extrabold"><BookOpen size={22} /> BookSales</Link>
                    <p className="mt-4 max-w-sm text-sm leading-6 text-slate-300">Ruang kecil untuk menemukan cerita besar. Temukan buku pilihan dan nikmati pengalaman membaca yang lebih dekat.</p>
                </div>
                <div>
                    <h2 className="text-sm font-bold text-white">Jelajahi</h2>
                    <div className="mt-4 flex flex-col gap-3 text-sm text-slate-300">
                        <Link className="hover:text-white" to="/">Beranda</Link>
                        <Link className="hover:text-white" to="/books">Semua Buku</Link>
                        <Link className="hover:text-white" to="/orders">Pesanan Saya</Link>
                    </div>
                </div>
                <div>
                    <h2 className="text-sm font-bold text-white">Tentang BookSales</h2>
                    <p className="mt-4 text-sm leading-6 text-slate-300">Pilihan bacaan bermakna, pelayanan ramah, dan pengalaman belanja yang nyaman di mana saja.</p>
                </div>
            </div>
            <div className="border-t border-white/10 py-5 text-center text-xs text-slate-400">© {new Date().getFullYear()} BookSales. Dibuat oleh Muhamad Wildan - STT Terpadu Nurul Fikri.</div>
        </footer>
    );
}

function StoreLayout() {
    return (
        <div className="min-h-screen bg-slate-50 text-slate-800">
            <Header />
            <main className="min-h-[65vh]"><Outlet /></main>
            <Footer />
        </div>
    );
}

function App() {
    return (
        <Routes>
            <Route element={<StoreLayout />}>
                <Route index element={<HomePage />} />
                <Route path="books" element={<CatalogPage />} />
                <Route path="books/:id" element={<BookDetailPage />} />
                <Route path="cart" element={<CartPage />} />
                <Route path="login" element={<LoginPage />} />
                <Route path="register" element={<RegisterPage />} />
                <Route path="checkout" element={<ProtectedRoute role="customer"><CheckoutPage /></ProtectedRoute>} />
                <Route path="orders" element={<ProtectedRoute role="customer"><OrderHistoryPage /></ProtectedRoute>} />
                <Route path="*" element={<NotFoundPage />} />
            </Route>
            <Route path="/admin" element={<ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>} />
        </Routes>
    );
}

export default App;
