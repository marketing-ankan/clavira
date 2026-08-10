<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Bulk photo ingest (Synology -> n8n -> here).
 *
 * A ten-thousand-file import is never one clean run: the network drops, a batch
 * times out, the operator re-runs it "just to be safe". Every column here exists
 * so that re-running is free rather than destructive.
 *
 *   sha256        content hash. Paired with product_id in a UNIQUE index, so a
 *                 re-upload of the same shot is rejected by the DATABASE, not by
 *                 application code that a concurrent request could race past.
 *                 Nullable because every image predating ingest has no hash, and
 *                 MySQL permits many NULLs in a unique index.
 *   source_name   the filename as it was inside the zip. The only way to answer
 *                 "which file on the NAS became this row" months later.
 *   frame         turntable frame number, or shot number within the SKU. Drives
 *                 sort_order, and is what a 360 viewer spins through.
 *   view          angle label parsed from the filename (front/side/top/...).
 *   ingest_batch  the run that created the row, so one bad import can be undone
 *                 without touching the photos that were already correct.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('product_images', function (Blueprint $table) {
            $table->char('sha256', 64)->nullable()->after('path');
            $table->string('source_name')->nullable()->after('sha256');
            $table->unsignedSmallInteger('frame')->nullable()->after('source_name');
            $table->string('view', 20)->nullable()->after('frame');
            $table->string('ingest_batch', 40)->nullable()->after('view');

            $table->unique(['product_id', 'sha256'], 'product_images_dedupe');
            $table->index('ingest_batch');
        });
    }

    public function down(): void
    {
        Schema::table('product_images', function (Blueprint $table) {
            $table->dropUnique('product_images_dedupe');
            $table->dropIndex(['ingest_batch']);
            $table->dropColumn(['sha256', 'source_name', 'frame', 'view', 'ingest_batch']);
        });
    }
};
