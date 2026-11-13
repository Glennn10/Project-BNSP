import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';

const CART_KEY = 'booksales_cart_v1';
const CartContext = createContext(null);

function readCart() {
    try {
        const cart = JSON.parse(localStorage.getItem(CART_KEY) || '[]');

        if (!Array.isArray(cart) || cart.some((item) => (
            !Number.isInteger(item.book_id)
            || !Number.isInteger(item.quantity)
            || item.quantity < 1
            || !Number.isFinite(Number(item.price))
        ))) {
            throw new Error('Saved cart data is invalid.');
        }

        return { items: cart, invalid: false };
    } catch {
        return { items: [], invalid: true };
    }
}

export function CartProvider({ children }) {
    const [initialCart] = useState(readCart);
    const [items, setItems] = useState(initialCart.items);

    useEffect(() => {
        if (initialCart.invalid) {
            localStorage.removeItem(CART_KEY);
            toast.error('Keranjang tersimpan rusak dan telah dikosongkan.');
        }
    }, [initialCart.invalid]);

    useEffect(() => {
        localStorage.setItem(CART_KEY, JSON.stringify(items));
    }, [items]);

    const addItem = useCallback((book, quantity = 1) => {
        if (book.stock < 1) {
            toast.error('Stok buku sedang habis.');
            return;
        }

        setItems((current) => {
            const existing = current.find((item) => item.book_id === book.id);

            if (existing) {
                return current.map((item) => (
                    item.book_id === book.id
                        ? { ...item, quantity: Math.min(item.quantity + quantity, book.stock) }
                        : item
                ));
            }

            return [
                ...current,
                {
                    book_id: book.id,
                    title: book.title,
                    author: book.author?.name || 'Penulis',
                    price: Number(book.price),
                    stock: book.stock,
                    cover_url: book.cover_url || book.cover_photo,
                    genre: book.genre?.name,
                    quantity: Math.min(quantity, book.stock),
                },
            ];
        });

        toast.success('Buku ditambahkan ke keranjang.');
    }, []);

    const changeQuantity = useCallback((bookId, quantity) => {
        setItems((current) => current
            .map((item) => (
                item.book_id === bookId
                    ? { ...item, quantity: Math.min(Math.max(1, quantity), item.stock) }
                    : item
            ))
            .filter((item) => item.stock > 0));
    }, []);

    const removeItem = useCallback((bookId) => {
        setItems((current) => current.filter((item) => item.book_id !== bookId));
    }, []);

    const clearCart = useCallback(() => setItems([]), []);
    const count = items.reduce((total, item) => total + item.quantity, 0);
    const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

    const value = useMemo(() => ({
        items,
        count,
        total,
        addItem,
        changeQuantity,
        removeItem,
        clearCart,
    }), [items, count, total, addItem, changeQuantity, removeItem, clearCart]);

    return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
    const context = useContext(CartContext);

    if (!context) {
        throw new Error('useCart must be used within CartProvider.');
    }

    return context;
}
