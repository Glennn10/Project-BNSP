<?php

return [
    'admin' => [
        'name' => env('SEED_ADMIN_NAME', 'BookSales Admin'),
        'email' => env('SEED_ADMIN_EMAIL', 'admin@booksales.test'),
        'password' => env('SEED_ADMIN_PASSWORD', 'BookSalesDev!2026'),
    ],
    'customer' => [
        'name' => env('SEED_CUSTOMER_NAME', 'BookSales Customer'),
        'email' => env('SEED_CUSTOMER_EMAIL', 'customer@booksales.test'),
        'password' => env('SEED_CUSTOMER_PASSWORD', 'BookSalesDev!2026'),
    ],
];
