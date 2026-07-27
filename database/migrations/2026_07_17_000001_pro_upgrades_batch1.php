<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Verified-buyer flag on reviews — set true when the reviewer's email
        // has a real (paid+) order containing the product being reviewed.
        Schema::table('reviews', function (Blueprint $table) {
            $table->boolean('verified')->default(false)->after('status');
        });

        // Repair / restoration service intake (on-brand for Jadau/Kundan heirlooms).
        Schema::create('repair_requests', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('email');
            $table->string('phone', 30);
            $table->string('photo_path')->nullable();          // uploaded photo of the piece
            $table->text('message');
            $table->string('status', 16)->default('new');      // new|reviewing|quoted|done|cancelled
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('repair_requests');
        Schema::table('reviews', function (Blueprint $table) {
            $table->dropColumn('verified');
        });
    }
};
