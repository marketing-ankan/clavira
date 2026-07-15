<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('categories', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->string('tagline')->nullable();
            $table->text('description')->nullable();
            $table->string('hero_image')->nullable();
            $table->unsignedInteger('sort_order')->default(0);
            $table->boolean('active')->default(true);
            $table->timestamps();
        });

        Schema::create('collections', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->string('badge')->nullable();      // e.g. "Special Collection"
            $table->string('subtitle')->nullable();
            $table->text('description')->nullable();
            $table->string('hero_image')->nullable();
            $table->unsignedInteger('sort_order')->default(0);
            $table->boolean('active')->default(true);
            $table->timestamps();
        });

        Schema::create('products', function (Blueprint $table) {
            $table->id();
            $table->foreignId('category_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('slug')->unique();
            $table->string('sku')->unique();
            $table->text('description')->nullable();
            $table->text('story')->nullable();
            $table->decimal('base_price', 12, 2);      // INR
            $table->string('currency', 3)->default('INR');
            $table->enum('diamond_type', ['lab_grown', 'natural', 'polki', 'none'])->default('lab_grown');
            $table->string('diamond_quality')->nullable();   // e.g. "VVS · E–F"
            $table->string('default_metal', 20)->default('yellow');   // yellow|white|rose
            $table->unsignedTinyInteger('default_purity')->default(18); // 14|18|22
            $table->boolean('is_jadau')->default(false);
            $table->boolean('igi_certified')->default(false);
            $table->boolean('bis_hallmarked')->default(true);
            $table->boolean('featured')->default(false);
            $table->boolean('active')->default(true);
            $table->string('stock_status', 20)->default('made_to_order'); // in_stock|made_to_order
            $table->timestamps();
            $table->index(['category_id', 'active']);
        });

        Schema::create('collection_product', function (Blueprint $table) {
            $table->id();
            $table->foreignId('collection_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->unsignedInteger('sort_order')->default(0);
            $table->unique(['collection_id', 'product_id']);
        });

        Schema::create('product_images', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->string('path');
            $table->string('alt')->nullable();
            $table->boolean('is_primary')->default(false);
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();
        });

        // Angara-style configurator: each row is a selectable option combination
        Schema::create('product_variants', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->string('metal', 20)->default('yellow');            // yellow|white|rose
            $table->unsignedTinyInteger('purity')->default(18);        // 14|18|22
            $table->enum('diamond_type', ['lab_grown', 'natural', 'polki', 'none'])->default('lab_grown');
            $table->string('size', 20)->nullable();                    // ring size / length
            $table->decimal('carat_weight', 6, 2)->nullable();
            $table->decimal('price_delta', 12, 2)->default(0);         // added to product base_price
            $table->string('sku')->nullable();
            $table->boolean('active')->default(true);
            $table->timestamps();
            $table->index('product_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('product_variants');
        Schema::dropIfExists('product_images');
        Schema::dropIfExists('collection_product');
        Schema::dropIfExists('products');
        Schema::dropIfExists('collections');
        Schema::dropIfExists('categories');
    }
};
