<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Product reviews — moderated before they appear on the storefront.
        Schema::create('reviews', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('name');
            $table->string('email');
            $table->unsignedTinyInteger('rating');        // 1..5
            $table->string('title')->nullable();
            $table->text('body');
            $table->string('status', 12)->default('pending'); // pending|approved|rejected
            $table->timestamp('approved_at')->nullable();
            $table->timestamps();
            $table->index(['product_id', 'status']);
        });

        // Consultation / appointment requests (bridal, virtual, atelier).
        Schema::create('consultations', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('email');
            $table->string('phone', 30);
            $table->string('country', 2)->default('IN');
            $table->string('type', 24)->default('virtual'); // virtual|atelier|bridal|bespoke
            $table->date('preferred_date')->nullable();
            $table->string('preferred_time', 40)->nullable();
            $table->text('message')->nullable();
            $table->string('status', 16)->default('new');    // new|scheduled|done|cancelled
            $table->timestamps();
        });

        // Newsletter subscribers.
        Schema::create('newsletter_subscribers', function (Blueprint $table) {
            $table->id();
            $table->string('email')->unique();
            $table->string('status', 16)->default('subscribed'); // subscribed|unsubscribed
            $table->string('source', 40)->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('newsletter_subscribers');
        Schema::dropIfExists('consultations');
        Schema::dropIfExists('reviews');
    }
};
