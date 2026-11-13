import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
    ArrowDownLeft,
    ArrowLeft,
    BookOpen,
    Boxes,
    Check,
    ChevronLeft,
    ChevronRight,
    CircleDollarSign,
    ClipboardList,
    LayoutDashboard,
    LoaderCircle,
    LogOut,
    Plus,
    Search,
    ShieldCheck,
    Trash2,
    UsersRound,
    X,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { formatPrice } from '../components/BookCard';
import { useAuth } from '../context/AuthContext';
import { api, getErrorMessage } from '../lib/api';

const SECTIONS = [
    { id: 'overview', label: 'Ringkasan', icon: LayoutDashboard },
    { id: 'books', label: 'Kelola buku', icon: BookOpen },
    { id: 'genres', label: 'Kelola genre', icon: Boxes },
    { id: 'authors', label: 'Kelola author', icon: UsersRound },
    { id: 'transactions', label: 'Transaksi', icon: ClipboardList },
];

const STATUS_OPTIONS = {
    pending: ['pending', 'paid', 'cancelled'],
    paid: ['paid', 'completed'],
    completed: ['completed'],
    cancelled: ['cancelled'],
};

const STATUS_LABELS = {
    pending: 'Pending',
    paid: 'Paid',
    completed: 'Completed',
    cancelled: 'Cancelled',
};

function PageButton({ disabled, onClick, children, label }) {
    return (
        <button type="button" disabled={disabled} onClick={onClick} aria-label={label} className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:border-primary-200 hover:text-primary-700 disabled:cursor-not-allowed disabled:opacity-40">{children}</button>
    );
}

function AdminPagination({ meta, onPageChange }) {
    if (!meta || meta.last_page <= 1) {
        return null;
    }

    return (
        <div className="flex items-center justify-between border-t border-slate-100 px-4 py-4">
            <p className="text-xs text-slate-500">Menampilkan {meta.from || 0}–{meta.to || 0} dari {meta.total}</p>
            <div className="flex items-center gap-2">
                <PageButton disabled={meta.current_page <= 1} onClick={() => onPageChange(meta.current_page - 1)} label="Halaman sebelumnya"><ChevronLeft size={17} /></PageButton>
                <span className="px-1 text-xs font-semibold text-slate-600">{meta.current_page} / {meta.last_page}</span>
                <PageButton disabled={meta.current_page >= meta.last_page} onClick={() => onPageChange(meta.current_page + 1)} label="Halaman berikutnya"><ChevronRight size={17} /></PageButton>
            </div>
        </div>
    );
}

function StatusBadge({ status }) {
    const styles = {
        pending: 'bg-amber-50 text-amber-800 ring-amber-200',
        paid: 'bg-blue-50 text-blue-800 ring-blue-200',
        completed: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
        cancelled: 'bg-rose-50 text-rose-800 ring-rose-200',
    };

    return <span className={`rounded-full px-3 py-1 text-[11px] font-bold ring-1 ring-inset ${styles[status] || 'bg-slate-100 text-slate-700 ring-slate-200'}`}>{STATUS_LABELS[status] || status}</span>;
}

export function AdminDashboard() {
    const { user, signOut } = useAuth();
    const navigate = useNavigate();
    const [section, setSection] = useState('overview');
    const [rows, setRows] = useState([]);
    const [meta, setMeta] = useState(null);
    const [metrics, setMetrics] = useState(null);
    const [statsLoading, setStatsLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [query, setQuery] = useState('');
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState(null);
    const [confirmDelete, setConfirmDelete] = useState(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const timer = window.setTimeout(() => {
            setQuery(search.trim());
            setPage(1);
        }, 300);

        return () => window.clearTimeout(timer);
    }, [search]);

    useEffect(() => {
        let mounted = true;

        api.get('/admin/stats')
            .then((response) => {
                if (mounted) {
                    setMetrics(response.data.data);
                }
            })
            .catch((error) => {
                if (mounted) {
                    toast.error(getErrorMessage(error));
                }
            })
            .finally(() => {
                if (mounted) {
                    setStatsLoading(false);
                }
            });

        return () => {
            mounted = false;
        };
    }, []);

    useEffect(() => {
        let mounted = true;
        setLoading(true);

        if (section === 'overview') {
            setRows([]);
            setMeta(null);
            setLoading(false);

            return () => {
                mounted = false;
            };
        }

        const endpoint = section === 'transactions' ? '/admin/transactions' : `/${section}`;
        api.get(endpoint, { params: { search: query || undefined, page, per_page: 10 } })
            .then((response) => {
                if (mounted) {
                    const paginator = response.data.data;
                    setRows(paginator.data);
                    setMeta(paginator);
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
    }, [section, query, page]);

    const title = useMemo(() => SECTIONS.find((item) => item.id === section)?.label || 'Ringkasan', [section]);

    function changeSection(nextSection) {
        setSection(nextSection);
        setPage(1);
        setSearch('');
        setQuery('');
    }

    async function refresh() {
        try {
            if (section === 'overview') {
                const response = await api.get('/admin/stats');
                setMetrics(response.data.data);
                return;
            }

            const endpoint = section === 'transactions' ? '/admin/transactions' : `/${section}`;
            const response = await api.get(endpoint, { params: { search: query || undefined, page, per_page: 10 } });
            setRows(response.data.data.data);
            setMeta(response.data.data);

            const statsResponse = await api.get('/admin/stats');
            setMetrics(statsResponse.data.data);
        } catch (error) {
            toast.error(getErrorMessage(error));
        }
    }

    async function saveEntity(event) {
        event.preventDefault();
        setSaving(true);
        const formData = new FormData(event.currentTarget);
        const current = modal?.item;

        try {
            if (section === 'books') {
                if (current) {
                    formData.append('_method', 'PUT');
                }

                await api.post(current ? `/books/${current.id}` : '/books', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
            } else {
                const payload = Object.fromEntries(formData.entries());
                if (current) {
                    await api.put(`/${section}/${current.id}`, payload);
                } else {
                    await api.post(`/${section}`, payload);
                }
            }

            toast.success(current ? 'Data berhasil diperbarui.' : 'Data berhasil ditambahkan.');
            setModal(null);
            await refresh();
        } catch (error) {
            toast.error(getErrorMessage(error));
        } finally {
            setSaving(false);
        }
    }

    async function deleteEntity() {
        if (!confirmDelete) {
            return;
        }

        setSaving(true);

        try {
            const endpoint = section === 'transactions' ? `/admin/transactions/${confirmDelete.id}` : `/${section}/${confirmDelete.id}`;
            await api.delete(endpoint);
            toast.success('Data berhasil dihapus.');
            setConfirmDelete(null);
            await refresh();
        } catch (error) {
            toast.error(getErrorMessage(error));
        } finally {
            setSaving(false);
        }
    }

    async function changeOrderStatus(order, status) {
        if (status === order.status) {
            return;
        }

        try {
            await api.put(`/admin/transactions/${order.id}`, { status });
            toast.success(`Status pesanan diperbarui menjadi ${STATUS_LABELS[status]}.`);
            await refresh();
        } catch (error) {
            toast.error(getErrorMessage(error));
            await refresh();
        }
    }

    async function logout() {
        try {
            await signOut();
            navigate('/');
        } catch (error) {
            toast.error(getErrorMessage(error));
            navigate('/');
        }
    }

    return (
        <div className="min-h-screen bg-slate-100 text-slate-800">
            <header className="sticky top-0 z-30 flex h-[68px] items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-7">
                <div className="flex items-center gap-3">
                    <Link to="/" className="grid h-10 w-10 place-items-center rounded-xl bg-navy-900 text-white"><BookOpen size={19} /></Link>
                    <div><p className="text-sm font-extrabold text-navy-900">BookSales</p><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Admin workspace</p></div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="hidden text-right sm:block"><p className="text-xs font-bold text-slate-700">{user?.name}</p><p className="text-[10px] text-slate-400">Administrator</p></div>
                    <button onClick={logout} type="button" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700"><LogOut size={15} /> Keluar</button>
                </div>
            </header>

            <div className="mx-auto flex max-w-[1600px]">
                <aside className="sticky top-[68px] hidden h-[calc(100vh-68px)] w-64 shrink-0 border-r border-slate-200 bg-white p-4 lg:block">
                    <p className="px-3 pb-3 pt-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-400">Menu utama</p>
                    <nav className="space-y-1">
                        {SECTIONS.map((item) => {
                            const Icon = item.icon;
                            return (
                                <button key={item.id} type="button" onClick={() => changeSection(item.id)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-bold transition ${section === item.id ? 'bg-primary-50 text-primary-700' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}>
                                    <Icon size={18} /> {item.label}
                                    {section === item.id && <ArrowDownLeft size={15} className="ml-auto" />}
                                </button>
                            );
                        })}
                    </nav>
                    <div className="absolute inset-x-4 bottom-5 rounded-2xl bg-navy-900 p-4 text-white">
                        <ShieldCheck className="text-emerald-300" size={20} />
                        <p className="mt-3 text-sm font-bold">Semua terpantau</p>
                        <p className="mt-1 text-xs leading-5 text-slate-300">Kelola katalog dan pesanan BookSales di satu tempat.</p>
                    </div>
                </aside>

                <main className="min-w-0 flex-1 p-4 sm:p-7 lg:p-9">
                    <div className="mb-6 flex gap-2 overflow-x-auto pb-2 lg:hidden">
                        {SECTIONS.map((item) => <button key={item.id} type="button" onClick={() => changeSection(item.id)} className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold ${section === item.id ? 'bg-navy-900 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200'}`}>{item.label}</button>)}
                    </div>

                    <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary-700">Pusat kendali</p>
                            <h1 className="mt-2 text-2xl font-black tracking-tight text-navy-900 sm:text-3xl">{title}</h1>
                            <p className="mt-1 text-sm text-slate-500">{section === 'overview' ? 'Pantau ringkasan performa toko dan aktivitas terbaru.' : `Kelola data ${title.toLowerCase()} dengan cepat.`}</p>
                        </div>
                        {['books', 'genres', 'authors'].includes(section) && (
                            <button onClick={() => setModal({ item: null })} type="button" className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-3 text-sm font-extrabold text-white shadow-lg shadow-primary-600/20 transition hover:bg-primary-700"><Plus size={17} /> Tambah data</button>
                        )}
                    </div>

                    {section === 'overview' ? (
                        <Overview metrics={metrics} loading={statsLoading} onNavigate={changeSection} />
                    ) : (
                        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-4 sm:px-5">
                                <div><h2 className="font-extrabold text-navy-900">{title}</h2><p className="mt-1 text-xs text-slate-400">Data terbaru dari REST API BookSales.</p></div>
                                <label className="flex w-full max-w-xs items-center rounded-xl border border-slate-200 bg-slate-50 px-3 focus-within:border-primary-300 focus-within:bg-white">
                                    <Search size={16} className="text-slate-400" />
                                    <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari data..." className="w-full border-0 bg-transparent px-2 py-2.5 text-sm outline-none focus:ring-0" />
                                </label>
                            </div>
                            {loading ? (
                                <div className="space-y-3 p-5">{Array.from({ length: 6 }, (_, index) => <div key={index} className="h-12 animate-pulse rounded-lg bg-slate-100" />)}</div>
                            ) : section === 'books' ? (
                                <BooksTable rows={rows} onEdit={(item) => setModal({ item })} onDelete={setConfirmDelete} />
                            ) : section === 'genres' ? (
                                <GenresTable rows={rows} onEdit={(item) => setModal({ item })} onDelete={setConfirmDelete} />
                            ) : section === 'authors' ? (
                                <AuthorsTable rows={rows} onEdit={(item) => setModal({ item })} onDelete={setConfirmDelete} />
                            ) : (
                                <TransactionsTable rows={rows} onDelete={setConfirmDelete} onStatusChange={changeOrderStatus} />
                            )}
                            {!loading && rows.length === 0 && <p className="px-5 py-12 text-center text-sm text-slate-500">Tidak ada data yang cocok.</p>}
                            <AdminPagination meta={meta} onPageChange={setPage} />
                        </section>
                    )}
                </main>
            </div>

            {modal && <EntityModal section={section} item={modal.item} onClose={() => setModal(null)} onSubmit={saveEntity} saving={saving} />}
            {confirmDelete && <DeleteConfirmation item={confirmDelete} saving={saving} onClose={() => setConfirmDelete(null)} onConfirm={deleteEntity} />}
        </div>
    );
}

function Overview({ metrics, loading, onNavigate }) {
    const cards = [
        { label: 'Total penjualan', value: formatPrice(metrics?.total_sales), icon: CircleDollarSign, tone: 'bg-emerald-50 text-emerald-700' },
        { label: 'Total buku aktif', value: metrics?.total_books ?? '—', icon: BookOpen, tone: 'bg-blue-50 text-blue-700' },
        { label: 'Total pelanggan', value: metrics?.total_customers ?? '—', icon: UsersRound, tone: 'bg-violet-50 text-violet-700' },
        { label: 'Total transaksi', value: metrics?.total_transactions ?? '—', icon: ClipboardList, tone: 'bg-amber-50 text-amber-700' },
    ];

    return (
        <div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {cards.map((card) => {
                    const Icon = card.icon;
                    return (
                        <div key={card.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                            <div className="flex items-start justify-between"><span className={`grid h-11 w-11 place-items-center rounded-xl ${card.tone}`}><Icon size={21} /></span><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700">Terbarui</span></div>
                            <p className="mt-5 text-xs font-semibold text-slate-500">{card.label}</p>
                            <p className="mt-1 text-2xl font-black tracking-tight text-navy-900">{loading ? <span className="inline-block h-7 w-24 animate-pulse rounded bg-slate-200" /> : card.value}</p>
                        </div>
                    );
                })}
            </div>
            <div className="mt-7 grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
                <div className="rounded-2xl border border-slate-200 bg-white p-6">
                    <p className="text-xs font-bold uppercase tracking-[0.15em] text-primary-700">Mulai kelola</p>
                    <h2 className="mt-2 text-xl font-black text-navy-900">Semua kebutuhan toko, satu dashboard.</h2>
                    <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">Perbarui stok, atur kategori dan penulis, serta pantau status pesanan pelanggan secara langsung.</p>
                    <button type="button" onClick={() => onNavigate('books')} className="mt-5 inline-flex items-center gap-2 rounded-lg bg-navy-900 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-primary-700">Kelola katalog <ArrowDownLeft size={15} /></button>
                </div>
                <div className="rounded-2xl bg-gradient-to-br from-primary-600 to-indigo-800 p-6 text-white">
                    <span className="grid h-11 w-11 place-items-center rounded-xl bg-white/15"><ShieldCheck size={21} /></span>
                    <h2 className="mt-5 text-xl font-black">Akses terproteksi</h2>
                    <p className="mt-2 text-sm leading-6 text-blue-100">Halaman dan endpoint admin hanya tersedia untuk akun dengan role administrator.</p>
                    <p className="mt-6 border-t border-white/20 pt-4 text-xs font-semibold text-blue-100">BookSales Admin Panel</p>
                </div>
            </div>
        </div>
    );
}

function TableShell({ headers, children }) {
    return (
        <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left">
                <thead className="bg-slate-50 text-[10px] font-extrabold uppercase tracking-wider text-slate-400"><tr>{headers.map((header) => <th key={header} className="px-5 py-3">{header}</th>)}</tr></thead>
                <tbody className="divide-y divide-slate-100 text-sm">{children}</tbody>
            </table>
        </div>
    );
}

function Actions({ item, onEdit, onDelete, deleteDisabled = false }) {
    return (
        <div className="flex items-center justify-end gap-2">
            {onEdit && <button type="button" onClick={() => onEdit(item)} className="rounded-lg px-3 py-2 text-xs font-bold text-primary-700 transition hover:bg-primary-50">Edit</button>}
            {onDelete && <button type="button" disabled={deleteDisabled} onClick={() => onDelete(item)} className="rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-30" aria-label="Hapus" title={deleteDisabled ? 'Pesanan paid atau completed harus dibatalkan sebelum dihapus.' : 'Hapus'}><Trash2 size={16} /></button>}
        </div>
    );
}

function BooksTable({ rows, onEdit, onDelete }) {
    return <TableShell headers={['Buku', 'Genre', 'Harga', 'Stok', 'Aksi']}>{rows.map((book) => (
        <tr key={book.id} className="hover:bg-slate-50/70">
            <td className="px-5 py-4"><p className="max-w-[260px] truncate font-bold text-slate-800">{book.title}</p><p className="mt-1 text-xs text-slate-400">{book.author?.name}</p></td>
            <td className="px-5 py-4 text-slate-600">{book.genre?.name}</td>
            <td className="px-5 py-4 font-bold text-slate-700">{formatPrice(book.price)}</td>
            <td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${book.stock > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>{book.stock}</span></td>
            <td className="px-5 py-4"><Actions item={book} onEdit={onEdit} onDelete={onDelete} /></td>
        </tr>
    ))}</TableShell>;
}

function GenresTable({ rows, onEdit, onDelete }) {
    return <TableShell headers={['Genre', 'Deskripsi', 'Jumlah buku', 'Aksi']}>{rows.map((genre) => (
        <tr key={genre.id} className="hover:bg-slate-50/70">
            <td className="px-5 py-4 font-bold text-slate-800">{genre.name}</td>
            <td className="max-w-[340px] truncate px-5 py-4 text-slate-500">{genre.description || '—'}</td>
            <td className="px-5 py-4 text-slate-600">{genre.books_count}</td>
            <td className="px-5 py-4"><Actions item={genre} onEdit={onEdit} onDelete={onDelete} /></td>
        </tr>
    ))}</TableShell>;
}

function AuthorsTable({ rows, onEdit, onDelete }) {
    return <TableShell headers={['Penulis', 'Tentang', 'Jumlah buku', 'Aksi']}>{rows.map((author) => (
        <tr key={author.id} className="hover:bg-slate-50/70">
            <td className="px-5 py-4 font-bold text-slate-800">{author.name}</td>
            <td className="max-w-[340px] truncate px-5 py-4 text-slate-500">{author.bio || '—'}</td>
            <td className="px-5 py-4 text-slate-600">{author.books_count}</td>
            <td className="px-5 py-4"><Actions item={author} onEdit={onEdit} onDelete={onDelete} /></td>
        </tr>
    ))}</TableShell>;
}

function TransactionsTable({ rows, onDelete, onStatusChange }) {
    return <TableShell headers={['Pesanan', 'Pelanggan', 'Item', 'Total', 'Status', 'Aksi']}>{rows.map((order) => (
        <tr key={order.id} className="align-top hover:bg-slate-50/70">
            <td className="px-5 py-4"><p className="font-bold text-slate-800">{order.order_number}</p><p className="mt-1 text-xs text-slate-400">{new Date(order.created_at).toLocaleDateString('id-ID')}</p></td>
            <td className="px-5 py-4"><p className="font-semibold text-slate-700">{order.customer?.name}</p><p className="mt-1 text-xs text-slate-400">{order.customer?.email}</p></td>
            <td className="max-w-[220px] px-5 py-4 text-xs leading-5 text-slate-500">
                {Array.isArray(order.items)
                    ? order.items.map((item) => `${item.title} × ${item.quantity}`).join(', ') || 'Tidak ada item pesanan.'
                    : 'Rincian item tidak tersedia.'}
            </td>
            <td className="whitespace-nowrap px-5 py-4 font-bold text-slate-700">{formatPrice(order.total_amount)}</td>
            <td className="px-5 py-4">
                <select value={order.status} onChange={(event) => onStatusChange(order, event.target.value)} className="rounded-full border-0 bg-transparent py-1 pl-2 pr-7 text-xs font-bold focus:ring-2 focus:ring-primary-200">
                    {(STATUS_OPTIONS[order.status] || [order.status]).map((status) => <option key={status} value={status}>{STATUS_LABELS[status]}</option>)}
                </select>
                <div className="mt-2"><StatusBadge status={order.status} /></div>
            </td>
            <td className="px-5 py-4"><Actions item={order} onDelete={onDelete} deleteDisabled={!['pending', 'cancelled'].includes(order.status) || (order.status === 'pending' && Boolean(order.snap_token))} /></td>
        </tr>
    ))}</TableShell>;
}

function Field({ label, name, defaultValue = '', type = 'text', required = false, options, placeholder, accept }) {
    return (
        <label className="block text-xs font-bold text-slate-600">
            {label}
            {options ? (
                <select name={name} defaultValue={defaultValue} required={required} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal text-slate-800 focus:border-primary-400 focus:ring-primary-100">
                    {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
            ) : type === 'textarea' ? (
                <textarea name={name} defaultValue={defaultValue} placeholder={placeholder} rows={4} required={required} className="mt-2 w-full resize-y rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal text-slate-800 focus:border-primary-400 focus:ring-primary-100" />
            ) : (
                <input name={name} type={type} defaultValue={defaultValue} placeholder={placeholder} accept={accept} required={required} min={type === 'number' ? '0' : undefined} step={name === 'price' ? '0.01' : undefined} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal text-slate-800 focus:border-primary-400 focus:ring-primary-100" />
            )}
        </label>
    );
}

function EntityModal({ section, item, onClose, onSubmit, saving }) {
    const [genres, setGenres] = useState([]);
    const [authors, setAuthors] = useState([]);
    const typeLabels = { books: 'buku', genres: 'genre', authors: 'author' };

    useEffect(() => {
        if (section !== 'books') {
            return;
        }

        Promise.all([
            api.get('/genres', { params: { per_page: 50 } }),
            api.get('/authors', { params: { per_page: 50 } }),
        ])
            .then(([genreResponse, authorResponse]) => {
                setGenres(genreResponse.data.data.data);
                setAuthors(authorResponse.data.data.data);
            })
            .catch((error) => toast.error(getErrorMessage(error)));
    }, [section]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-navy-900/50 p-4 backdrop-blur-sm" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
            <section role="dialog" aria-modal="true" aria-labelledby="entity-modal-title" className="my-auto w-full max-w-xl rounded-2xl bg-white shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                    <div><h2 id="entity-modal-title" className="font-extrabold text-navy-900">{item ? 'Edit' : 'Tambah'} {typeLabels[section]}</h2><p className="mt-1 text-xs text-slate-400">Lengkapi informasi dengan benar.</p></div>
                    <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Tutup"><X size={18} /></button>
                </div>
                <form key={`${section}-${item?.id || 'new'}`} onSubmit={onSubmit} className="space-y-4 p-5">
                    {section === 'books' && <>
                        <Field label="Judul buku" name="title" defaultValue={item?.title} required />
                        <Field label="Deskripsi / sinopsis" name="description" type="textarea" defaultValue={item?.description} required />
                        <div className="grid gap-4 sm:grid-cols-2"><Field label="Harga (IDR)" name="price" type="number" defaultValue={item?.price} required /><Field label="Stok" name="stock" type="number" defaultValue={item?.stock ?? 0} required /></div>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <Field label="Genre" name="genre_id" options={genres.map((genre) => ({ value: genre.id, label: genre.name }))} defaultValue={item?.genre_id || ''} required />
                            <Field label="Author" name="author_id" options={authors.map((author) => ({ value: author.id, label: author.name }))} defaultValue={item?.author_id || ''} required />
                        </div>
                        <Field label="Cover buku (JPG, PNG, WebP; maks. 4 MB)" name="cover_photo" type="file" accept="image/jpeg,image/png,image/webp" />
                    </>}
                    {section === 'genres' && <>
                        <Field label="Nama genre" name="name" defaultValue={item?.name} required />
                        <Field label="Deskripsi" name="description" type="textarea" defaultValue={item?.description} />
                    </>}
                    {section === 'authors' && <>
                        <Field label="Nama author" name="name" defaultValue={item?.name} required />
                        <Field label="Biografi singkat" name="bio" type="textarea" defaultValue={item?.bio} />
                        <Field label="URL foto (opsional)" name="photo" type="url" defaultValue={item?.photo} placeholder="https://" />
                    </>}
                    <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                        <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50">Batal</button>
                        <button type="submit" disabled={saving || (section === 'books' && (!genres.length || !authors.length))} className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-extrabold text-white hover:bg-primary-700 disabled:opacity-60">{saving && <LoaderCircle size={16} className="animate-spin" />}{item ? 'Simpan perubahan' : 'Tambah data'}</button>
                    </div>
                </form>
            </section>
        </div>
    );
}

function DeleteConfirmation({ item, saving, onClose, onConfirm }) {
    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-navy-900/50 p-4 backdrop-blur-sm" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
            <section role="alertdialog" aria-modal="true" aria-labelledby="delete-title" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-rose-50 text-rose-600"><Trash2 size={21} /></span>
                <h2 id="delete-title" className="mt-4 text-lg font-black text-navy-900">Konfirmasi penghapusan</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">Yakin ingin menghapus <strong className="text-slate-700">{item.title || item.name || item.order_number}</strong>? {item.order_number ? 'Pesanan akan diarsipkan dan stok yang masih direservasi akan dikembalikan.' : item.genre || item.author_id ? 'Buku akan diarsipkan dan tidak lagi ditampilkan di katalog.' : 'Tindakan ini tidak dapat dibatalkan.'}</p>
                <div className="mt-6 flex justify-end gap-2">
                    <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50">Batal</button>
                    <button type="button" disabled={saving} onClick={onConfirm} className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-extrabold text-white hover:bg-rose-700 disabled:opacity-60">{saving ? <LoaderCircle size={16} className="animate-spin" /> : <Check size={16} />} Hapus</button>
                </div>
            </section>
        </div>
    );
}
