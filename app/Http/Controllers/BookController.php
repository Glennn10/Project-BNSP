<?php

namespace App\Http\Controllers;

use App\Models\Book;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class BookController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'search' => ['nullable', 'string', 'max:120'],
            'genre_id' => ['nullable', 'integer', 'exists:genres,id'],
            'author_id' => ['nullable', 'integer', 'exists:authors,id'],
            'min_price' => ['nullable', 'numeric', 'min:0'],
            'max_price' => ['nullable', 'numeric', 'min:0'],
            'sort' => ['nullable', 'in:newest,price_asc,price_desc,title_asc'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:50'],
        ]);

        if (isset($filters['min_price'], $filters['max_price']) && $filters['max_price'] < $filters['min_price']) {
            throw ValidationException::withMessages([
                'max_price' => 'Harga maksimum harus lebih besar dari atau sama dengan harga minimum.',
            ]);
        }

        $books = Book::query()
            ->with(['author', 'genre'])
            ->when($filters['search'] ?? null, function (Builder $query, string $search): void {
                $query->where(function (Builder $query) use ($search): void {
                    $query->where('title', 'like', '%'.$search.'%')
                        ->orWhereHas('author', fn (Builder $authorQuery) => $authorQuery->where('name', 'like', '%'.$search.'%'));
                });
            })
            ->when($filters['genre_id'] ?? null, fn (Builder $query, int $genreId) => $query->where('genre_id', $genreId))
            ->when($filters['author_id'] ?? null, fn (Builder $query, int $authorId) => $query->where('author_id', $authorId))
            ->when($filters['min_price'] ?? null, fn (Builder $query, float $price) => $query->where('price', '>=', $price))
            ->when($filters['max_price'] ?? null, fn (Builder $query, float $price) => $query->where('price', '<=', $price))
            ->when(($filters['sort'] ?? 'newest') === 'price_asc', fn (Builder $query) => $query->orderBy('price')->orderBy('id'))
            ->when(($filters['sort'] ?? 'newest') === 'price_desc', fn (Builder $query) => $query->orderByDesc('price')->orderByDesc('id'))
            ->when(($filters['sort'] ?? 'newest') === 'title_asc', fn (Builder $query) => $query->orderBy('title')->orderBy('id'))
            ->when(($filters['sort'] ?? 'newest') === 'newest', fn (Builder $query) => $query->latest('id'))
            ->paginate($filters['per_page'] ?? 12)
            ->withQueryString();

        return response()->json([
            'success' => true,
            'data' => $books,
        ]);
    }

    public function show(Book $book): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => $book->load(['author', 'genre']),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'description' => ['required', 'string', 'max:10000'],
            'price' => ['required', 'numeric', 'min:0', 'max:99999999.99'],
            'stock' => ['required', 'integer', 'min:0'],
            'genre_id' => ['required', 'integer', 'exists:genres,id'],
            'author_id' => ['required', 'integer', 'exists:authors,id'],
            'cover_photo' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:4096'],
        ]);

        if ($request->hasFile('cover_photo')) {
            $data['cover_photo'] = $request->file('cover_photo')->store('covers', 'public');
        }

        $book = Book::create($data)->load(['author', 'genre']);

        return response()->json([
            'success' => true,
            'message' => 'Buku berhasil ditambahkan.',
            'data' => $book,
        ], 201);
    }

    public function update(Request $request, Book $book): JsonResponse
    {
        $data = $request->validate([
            'title' => ['sometimes', 'required', 'string', 'max:255'],
            'description' => ['sometimes', 'required', 'string', 'max:10000'],
            'price' => ['sometimes', 'required', 'numeric', 'min:0', 'max:99999999.99'],
            'stock' => ['sometimes', 'required', 'integer', 'min:0'],
            'genre_id' => ['sometimes', 'required', 'integer', 'exists:genres,id'],
            'author_id' => ['sometimes', 'required', 'integer', 'exists:authors,id'],
            'cover_photo' => ['sometimes', 'nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:4096'],
        ]);

        $oldCover = $book->cover_photo;

        if ($request->hasFile('cover_photo')) {
            $data['cover_photo'] = $request->file('cover_photo')->store('covers', 'public');
        }

        $book->update($data);

        if ($request->hasFile('cover_photo') && $oldCover && ! str_starts_with($oldCover, 'https://') && ! str_starts_with($oldCover, 'http://')) {
            Storage::disk('public')->delete($oldCover);
        }

        return response()->json([
            'success' => true,
            'message' => 'Buku berhasil diperbarui.',
            'data' => $book->load(['author', 'genre']),
        ]);
    }

    public function destroy(Book $book): JsonResponse
    {
        $book->delete();

        return response()->json([
            'success' => true,
            'message' => 'Buku berhasil diarsipkan.',
        ]);
    }
}
