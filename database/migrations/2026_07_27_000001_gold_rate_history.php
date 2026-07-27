<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    // Turns gold_rates into a queryable daily series so the public rate page can
    // chart 7/14/21/30 days. `rate_date` is the calendar day a rate belongs to —
    // `effective_at` stays the exact publish instant.
    //
    // Deliberately NOT a unique key on rate_date: three rows already share
    // 2026-07-15, and de-duplicating would destroy published history. One row per
    // day is enforced in application code (GoldRateFetch upserts the day's row);
    // reads take the latest row per day, so same-day duplicates are harmless.
    public function up(): void
    {
        Schema::table('gold_rates', function (Blueprint $table) {
            $table->date('rate_date')->nullable()->after('id');
            $table->index('rate_date');
            $table->index('effective_at');
        });

        // Backfill. `effective_at = effective_at` is load-bearing, not a typo:
        // it is the table's first TIMESTAMP column, so MySQL/MariaDB rendered it
        // `ON UPDATE current_timestamp()`. Any UPDATE that does not name the
        // column explicitly silently rewrites it to now() — which would collapse
        // every historical publish instant onto the migration's run time.
        DB::statement('UPDATE gold_rates SET rate_date = DATE(effective_at), effective_at = effective_at');
    }

    public function down(): void
    {
        Schema::table('gold_rates', function (Blueprint $table) {
            $table->dropIndex(['rate_date']);
            $table->dropIndex(['effective_at']);
            $table->dropColumn('rate_date');
        });
    }
};
