<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

/**
 * Machine-readable health for an uptime monitor.
 *
 * Returns 200 only when everything a customer depends on is working, and 503
 * otherwise, so a pinger like UptimeRobot or Better Stack can alert on status
 * code alone without parsing the body. The body exists for a human who has
 * just been paged.
 *
 * Deliberately reveals nothing sensitive: no versions, no paths, no
 * credentials, no row counts beyond "is the catalogue there at all".
 */
class HealthController extends Controller
{
    public function __invoke(): JsonResponse
    {
        $checks = [
            'database' => $this->database(),
            'storage' => $this->storage(),
            'backup' => $this->backup(),
        ];

        $ok = ! in_array('fail', array_column($checks, 'status'), true);

        return response()->json([
            'status' => $ok ? 'ok' : 'fail',
            'checks' => $checks,
            'time' => now()->toIso8601String(),
        ], $ok ? 200 : 503);
    }

    private function database(): array
    {
        try {
            $products = DB::table('products')->where('active', true)->count();

            return $products > 0
                ? ['status' => 'ok', 'detail' => $products.' active products']
                : ['status' => 'fail', 'detail' => 'no active products'];
        } catch (\Throwable $e) {
            return ['status' => 'fail', 'detail' => 'unreachable'];
        }
    }

    private function storage(): array
    {
        $path = storage_path('framework');

        return is_writable($path)
            ? ['status' => 'ok', 'detail' => 'writable']
            : ['status' => 'fail', 'detail' => 'storage not writable'];
    }

    /**
     * Warn rather than fail: a missing backup is urgent for the owner but does
     * not mean the shop is down, and paging someone at 3am for it is wrong.
     */
    private function backup(): array
    {
        $files = glob(storage_path('backups').DIRECTORY_SEPARATOR.'clavira-*.sql*') ?: [];

        if (! $files) {
            return ['status' => 'warn', 'detail' => 'no backup found'];
        }

        sort($files);
        $newest = end($files);
        $ageHours = (int) round((time() - filemtime($newest)) / 3600);

        return [
            'status' => $ageHours > config('backup.stale_after_hours', 36) ? 'warn' : 'ok',
            'detail' => $ageHours.'h old',
        ];
    }
}
