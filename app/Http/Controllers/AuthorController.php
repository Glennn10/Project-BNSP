<?php

namespace App\Http\Controllers;

use App\Models\Author;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AuthorController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'search' => ['nullable', 'string', 'max:120'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:50'],
        ]);

        $authors = Author::query()
            ->withCount('books')
            ->when($filters['search'] ?? null, fn (Builder $query, string $search) => $query->where('name', 'like', '%'.$search.'%'))
            ->orderBy('name')
            ->paginate($filters['per_page'] ?? 50)
            ->withQueryString();

        return response()->json(['success' => true, 'data' => $authors]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255', Rule::unique('authors', 'name')],
            'photo' => ['nullable', 'url', 'max:2048'],
            'bio' => ['nullable', 'string', 'max:10000'],
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Penulis berhasil ditambahkan.',
            'data' => Author::create($data),
        ], 201);
    }

    public function show(Author $author): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => $author->load(['books.genre']),
        ]);
    }

    public function update(Request $request, Author $author): JsonResponse
    {
        $data = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255', Rule::unique('authors', 'name')->ignore($author)],
            'photo' => ['sometimes', 'nullable', 'url', 'max:2048'],
            'bio' => ['sometimes', 'nullable', 'string', 'max:10000'],
        ]);

        $author->update($data);

        return response()->json([
            'success' => true,
            'message' => 'Penulis berhasil diperbarui.',
            'data' => $author,
        ]);
    }

    public function destroy(Author $author): JsonResponse
    {
        if ($author->books()->withTrashed()->exists()) {
            return response()->json([
                'success' => false,
                'message' => 'Penulis yang masih memiliki buku tidak dapat dihapus.',
            ], 409);
        }

        $author->delete();

        return response()->json([
            'success' => true,
            'message' => 'Penulis berhasil dihapus.',
        ]);
    }
}
