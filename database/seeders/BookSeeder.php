<?php

namespace Database\Seeders;

use App\Models\Author;
use App\Models\Book;
use App\Models\Genre;
use Illuminate\Database\Seeder;

class BookSeeder extends Seeder
{
    public function run(): void
    {
        $books = [
            ['title' => 'Laskar Pelangi', 'description' => 'Kisah anak-anak Belitung yang mengejar mimpi melalui pendidikan dan persahabatan.', 'price' => 85000, 'stock' => 20, 'genre' => 'Novel', 'author' => 'Andrea Hirata', 'cover_photo' => 'https://covers.openlibrary.org/b/id/7079796-L.jpg?default=false'],
            ['title' => 'Bumi', 'description' => 'Petualangan Raib dan kawan-kawan di dunia paralel yang penuh rahasia.', 'price' => 90000, 'stock' => 15, 'genre' => 'Fantasi', 'author' => 'Tere Liye', 'cover_photo' => 'https://covers.openlibrary.org/b/id/12810708-L.jpg?default=false'],
            ['title' => 'Bumi Manusia', 'description' => 'Kisah Minke tentang cinta, martabat, dan perubahan pada masa kolonial.', 'price' => 110000, 'stock' => 10, 'genre' => 'Sejarah', 'author' => 'Pramoedya Ananta Toer', 'cover_photo' => 'https://covers.openlibrary.org/b/id/6643692-L.jpg?default=false'],
            ['title' => 'Supernova: Ksatria, Putri, dan Bintang Jatuh', 'description' => 'Pertemuan tak terduga membuka jalinan kisah tentang cinta dan ilmu pengetahuan.', 'price' => 95000, 'stock' => 12, 'genre' => 'Fiksi Ilmiah', 'author' => 'Dee Lestari', 'cover_photo' => 'https://covers.openlibrary.org/b/id/10000969-L.jpg?default=false'],
            ['title' => 'Kambing Jantan', 'description' => 'Catatan jenaka seorang pelajar Indonesia yang merantau ke Australia.', 'price' => 75000, 'stock' => 25, 'genre' => 'Komedi', 'author' => 'Raditya Dika', 'cover_photo' => 'https://gagasmedia.net/wp-content/uploads/2017/07/Cover-Depan_Kambing-Jantan.jpg'],
            ['title' => 'Sang Pemimpi', 'description' => 'Perjalanan Ikal dan Arai merawat mimpi hingga ke Eropa.', 'price' => 82000, 'stock' => 18, 'genre' => 'Novel', 'author' => 'Andrea Hirata', 'cover_photo' => 'https://covers.openlibrary.org/b/id/15218349-L.jpg?default=false'],
            ['title' => 'Bulan', 'description' => 'Raib, Seli, dan Ali menghadapi petualangan baru di dunia paralel.', 'price' => 92000, 'stock' => 14, 'genre' => 'Fantasi', 'author' => 'Tere Liye', 'cover_photo' => 'https://covers.openlibrary.org/b/id/14640031-L.jpg?default=false'],
            ['title' => 'Anak Semua Bangsa', 'description' => 'Minke melanjutkan perjuangannya memahami bangsanya dan zamannya.', 'price' => 105000, 'stock' => 8, 'genre' => 'Sejarah', 'author' => 'Pramoedya Ananta Toer', 'cover_photo' => 'https://covers.openlibrary.org/b/id/6635926-L.jpg?default=false'],
            ['title' => 'Supernova: Akar', 'description' => 'Perjalanan Bodhi mempertemukan pencarian batin dengan sains.', 'price' => 98000, 'stock' => 11, 'genre' => 'Fiksi Ilmiah', 'author' => 'Dee Lestari', 'cover_photo' => 'https://perpustakaan.jakarta.go.id/catalog-dispusip/uploaded_files/sampul_koleksi/original/Monograf/85122.jpg'],
            ['title' => 'Marmut Merah Jambu', 'description' => 'Kumpulan cerita cinta remaja dengan humor khas Raditya Dika.', 'price' => 70000, 'stock' => 30, 'genre' => 'Komedi', 'author' => 'Raditya Dika', 'cover_photo' => 'https://covers.openlibrary.org/b/id/6715231-L.jpg?default=false'],
            ['title' => 'Edensor', 'description' => 'Ikal dan Arai melanjutkan perjalanan menuntut ilmu di Eropa.', 'price' => 88000, 'stock' => 16, 'genre' => 'Novel', 'author' => 'Andrea Hirata', 'cover_photo' => 'https://covers.openlibrary.org/b/id/9986435-L.jpg?default=false'],
            ['title' => 'Matahari', 'description' => 'Raib dan kawan-kawan menjelajahi dunia yang menyimpan misteri baru.', 'price' => 94000, 'stock' => 13, 'genre' => 'Fantasi', 'author' => 'Tere Liye', 'cover_photo' => 'https://covers.openlibrary.org/b/id/10956534-L.jpg?default=false'],
            ['title' => 'Dilan ITB 1997', 'description' => 'Kisah Dilan pada masa kuliahnya di Institut Teknologi Bandung.', 'price' => 99000, 'stock' => 12, 'genre' => 'Novel', 'author' => 'Pidi Baiq', 'cover_photo' => 'https://static.mizanstore.com/d/img/book/cover/cover_depan_dilan.jpg'],
        ];

        foreach ($books as $book) {
            $author = Author::query()->where('name', $book['author'])->firstOrFail();
            $genre = Genre::query()->where('name', $book['genre'])->firstOrFail();
            unset($book['author'], $book['genre']);

            $record = Book::firstOrCreate(
                ['title' => $book['title']],
                [
                    ...$book,
                    'author_id' => $author->id,
                    'genre_id' => $genre->id,
                ],
            );

            if (! $record->wasRecentlyCreated) {
                $record->update(['cover_photo' => $book['cover_photo']]);
            }
        }
    }
}
