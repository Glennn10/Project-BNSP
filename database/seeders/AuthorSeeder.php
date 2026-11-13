<?php

namespace Database\Seeders;

use App\Models\Author;
use Illuminate\Database\Seeder;

class AuthorSeeder extends Seeder
{
    public function run(): void
    {
        $authors = [
            ['name' => 'Andrea Hirata', 'bio' => 'Penulis novel Laskar Pelangi.', 'photo' => 'https://ui-avatars.com/api/?name=Andrea+Hirata&background=random&size=200'],
            ['name' => 'Tere Liye', 'bio' => 'Penulis novel populer Indonesia.', 'photo' => 'https://ui-avatars.com/api/?name=Tere+Liye&background=random&size=200'],
            ['name' => 'Pramoedya Ananta Toer', 'bio' => 'Penulis Tetralogi Buru.', 'photo' => 'https://ui-avatars.com/api/?name=Pramoedya+Ananta+Toer&background=random&size=200'],
            ['name' => 'Dee Lestari', 'bio' => 'Penulis seri Supernova.', 'photo' => 'https://ui-avatars.com/api/?name=Dee+Lestari&background=random&size=200'],
            ['name' => 'Raditya Dika', 'bio' => 'Penulis buku komedi.', 'photo' => 'https://ui-avatars.com/api/?name=Raditya+Dika&background=random&size=200'],
            ['name' => 'Pidi Baiq', 'bio' => 'Penulis novel Dilan.', 'photo' => 'https://ui-avatars.com/api/?name=Pidi+Baiq&background=random&size=200'],
        ];

        foreach ($authors as $author) {
            Author::updateOrCreate(['name' => $author['name']], $author);
        }
    }
}
