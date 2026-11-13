<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class Book extends Model
{
    use HasFactory;
    use SoftDeletes;

    protected $fillable = ['title', 'description', 'price', 'stock', 'cover_photo', 'genre_id', 'author_id'];

    protected $appends = ['cover_url'];

    public function genre(): BelongsTo
    {
        return $this->belongsTo(Genre::class);
    }

    public function author(): BelongsTo
    {
        return $this->belongsTo(Author::class);
    }

    public function transactionItems(): HasMany
    {
        return $this->hasMany(TransactionItem::class);
    }

    public function getCoverUrlAttribute(): ?string
    {
        if (! $this->cover_photo) {
            return null;
        }

        if (Str::startsWith($this->cover_photo, ['https://', 'http://'])) {
            return $this->cover_photo;
        }

        return Storage::disk('public')->url($this->cover_photo);
    }
}
