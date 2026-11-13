<?php

namespace App\Http\Controllers;

use App\Models\Genre;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class GenreController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'search' => ['nullable', 'string', 'max:120'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:50'],
        ]);

        $genres = Genre::query()
            ->withCount('books')
            ->when($filters['search'] ?? null, fn (Builder $query, string $search) => $query->where('name', 'like', '%'.$search.'%'))
            ->orderBy('name')
            ->paginate($filters['per_page'] ?? 50)
            ->withQueryString();

        return response()->json(['success' => true, 'data' => $genres]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255', Rule::unique('genres', 'name')],
            'description' => ['nullable', 'string', 'max:10000'],
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Genre berhasil ditambahkan.',
            'data' => Genre::create($data),
        ], 201);
    }

    public function show(Genre $genre): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => $genre->load('books.author'),
        ]);
    }

    public function update(Request $request, Genre $genre): JsonResponse
    {
        $data = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255', Rule::unique('genres', 'name')->ignore($genre)],
            'description' => ['sometimes', 'nullable', 'string', 'max:10000'],
        ]);

        $genre->update($data);

        return response()->json([
            'success' => true,
            'message' => 'Genre berhasil diperbarui.',
            'data' => $genre,
        ]);
    }

    public function destroy(Genre $genre): JsonResponse
    {
        if ($genre->books()->withTrashed()->exists()) {
            return response()->json([
                'success' => false,
                'message' => 'Genre yang masih memiliki buku tidak dapat dihapus.',
            ], 409);
        }

        $genre->delete();

        return response()->json([
            'success' => true,
            'message' => 'Genre berhasil dihapus.',
        ]);
    }
}
