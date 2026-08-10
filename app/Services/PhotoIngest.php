<?php

namespace App\Services;

use App\Models\Product;
use App\Models\ProductImage;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * The brain behind bulk photo ingest.
 *
 * Both callers share it: the HTTP endpoints n8n drives, and the artisan command
 * for when the photos are already on the same machine as the app and pushing
 * them through HTTP would be silly. Keeping the rules in one class is the point
 * — two implementations of "which SKU is this file" would drift within a week.
 */
class PhotoIngest
{
    /** Reason codes returned by plan(); n8n branches on these. */
    public const SKIP_DUPLICATE = 'duplicate';
    public const SKIP_UNKNOWN_SKU = 'unknown_sku';
    public const SKIP_UNPARSABLE = 'unparsable';
    public const SKIP_EXTENSION = 'bad_extension';

    /**
     * Decide what to do with a manifest of files, without any of the bytes.
     *
     * This is the whole reason the pipeline can survive a 10,000-file run: n8n
     * sends names and hashes, gets back the (usually much shorter) list of
     * files actually worth uploading, and a resumed run re-sends the same
     * manifest and is told "all duplicates" for free.
     *
     * @param  array<int, array{name: string, sha256: string}>  $files
     * @return array{accept: array<int, array>, skip: array<int, array>}
     */
    public function plan(array $files): array
    {
        $parsed = [];
        $skip = [];

        foreach ($files as $file) {
            $name = (string) ($file['name'] ?? '');
            $sha = strtolower((string) ($file['sha256'] ?? ''));

            if (! $this->extensionAllowed($name)) {
                $skip[] = ['name' => $name, 'reason' => self::SKIP_EXTENSION];

                continue;
            }

            $candidates = $this->candidates($name);
            if (! $candidates) {
                $skip[] = ['name' => $name, 'reason' => self::SKIP_UNPARSABLE];

                continue;
            }

            $parsed[] = ['name' => $name, 'sha256' => $sha, 'candidates' => $candidates];
        }

        if (! $parsed) {
            return ['accept' => [], 'skip' => $skip];
        }

        // Every candidate SKU from every file, resolved in one pass. The tie
        // between readings of an ambiguous filename is broken by which SKU
        // actually exists, so all of them have to be looked up together.
        $allSkus = [];
        foreach ($parsed as $row) {
            foreach ($row['candidates'] as $c) {
                $allSkus[] = $c['sku'];
            }
        }
        $products = $this->resolveSkus($allSkus);

        // One query for every hash in the batch. Scoped per product, because the
        // dedupe key is (product_id, sha256): the same packshot legitimately
        // appearing under two SKUs is a catalogue decision, not a duplicate.
        $hashes = array_values(array_filter(array_column($parsed, 'sha256')));
        $seen = $hashes
            ? ProductImage::whereIn('sha256', $hashes)
                ->pluck('product_id', 'sha256')
                ->all()
            : [];

        $accept = [];
        foreach ($parsed as $row) {
            // First reading whose SKU is real wins.
            $product = null;
            $chosen = null;
            foreach ($row['candidates'] as $candidate) {
                if ($hit = $products[$this->normaliseSku($candidate['sku'])] ?? null) {
                    $product = $hit;
                    $chosen = $candidate;
                    break;
                }
            }

            if (! $product) {
                // Report every reading that was attempted — "CLV-1234_07 |
                // CLV-1234" tells the operator far more about a mis-set
                // pattern than a single guessed SKU would.
                $tried = array_values(array_unique(array_column($row['candidates'], 'sku')));
                $skip[] = [
                    'name' => $row['name'],
                    'reason' => self::SKIP_UNKNOWN_SKU,
                    'sku' => $tried[0],
                    'tried' => $tried,
                ];

                continue;
            }

            if ($row['sha256'] !== '' && ($seen[$row['sha256']] ?? null) === $product->id) {
                $skip[] = ['name' => $row['name'], 'reason' => self::SKIP_DUPLICATE, 'sku' => $product->sku];

                continue;
            }

            $accept[] = [
                'name' => $row['name'],
                'sha256' => $row['sha256'],
                'sku' => $product->sku,
                'product_id' => $product->id,
                'frame' => $chosen['frame'],
                'view' => $chosen['view'],
            ];
        }

        return ['accept' => $accept, 'skip' => $skip];
    }

    /**
     * Store one already-validated file and record it.
     *
     * `$move` receives the absolute destination path and must put the bytes
     * there — an UploadedFile::move() for the HTTP path, a copy() for the CLI
     * path. Returns the row, or null when the database rejected it as a
     * duplicate, which is a success as far as a retrying caller is concerned.
     */
    public function store(
        Product $product,
        string $sha256,
        string $extension,
        string $sourceName,
        ?int $frame,
        ?string $view,
        ?string $batch,
        callable $move,
    ): ?ProductImage {
        $dir = trim(config('ingest.path'), '/').'/'.$this->skuFolder($product->sku);
        $absolute = public_path($dir);

        if (! is_dir($absolute) && ! @mkdir($absolute, 0755, true) && ! is_dir($absolute)) {
            throw new \RuntimeException("Could not create {$absolute}");
        }

        // Content-addressed filename: two files with the same bytes can never
        // fight over a name, and re-running after a half-finished batch
        // overwrites its own orphan rather than littering the folder.
        $filename = substr($sha256, 0, 16).'.'.strtolower($extension);
        $path = $dir.'/'.$filename;

        $move($absolute.DIRECTORY_SEPARATOR.$filename);

        try {
            return DB::transaction(function () use ($product, $path, $sha256, $sourceName, $frame, $view, $batch) {
                // Lock the product row so two concurrent uploads for the same
                // SKU cannot both read "no primary yet" and both claim it.
                Product::whereKey($product->id)->lockForUpdate()->first();

                $hasPrimary = $product->images()->where('is_primary', true)->exists();

                return $product->images()->create([
                    'path' => $path,
                    'sha256' => $sha256,
                    'source_name' => Str::limit($sourceName, 250, ''),
                    'frame' => $frame,
                    'view' => $view,
                    'ingest_batch' => $batch,
                    'alt' => $product->name,
                    'is_primary' => ! $hasPrimary,
                    // Frame number is the photographer's intended order. Without
                    // one, park the shot after everything already filed.
                    'sort_order' => $frame ?? ((int) $product->images()->max('sort_order') + 1),
                ]);
            });
        } catch (QueryException $e) {
            // 23000 = integrity constraint: the (product_id, sha256) unique
            // index caught a duplicate that plan() could not see because a
            // concurrent batch inserted it first. The file on disk is
            // content-addressed and therefore identical, so leaving it is fine.
            if (($e->errorInfo[0] ?? null) === '23000') {
                return null;
            }

            throw $e;
        }
    }

    // ------------------------------------------------------------------ naming

    /**
     * Every plausible reading of a path, best first.
     *
     * Returns candidates rather than one answer because filenames genuinely are
     * ambiguous — "CLV-1234" is either a SKU or a SKU plus a frame number, and
     * only the catalogue knows which. plan() walks this list and takes the
     * first entry whose SKU exists, so the guessing happens against real data
     * instead of inside a regex.
     *
     * @return array<int, array{sku: string, frame: ?int, view: ?string}>
     */
    public function candidates(string $relativePath): array
    {
        $path = str_replace('\\', '/', trim($relativePath, '/'));

        // Strip the extension only from the final segment — folder names may
        // legitimately contain dots (a SKU like "CLV.22K.114").
        $path = preg_replace('/\.[A-Za-z0-9]+$/', '', $path) ?? $path;

        if ($path === '') {
            return [];
        }

        $out = [];
        $seen = [];

        foreach ((array) config('ingest.patterns') as $pattern) {
            if (! preg_match($pattern, $path, $m)) {
                continue;
            }

            $sku = trim($m['sku'] ?? '');
            if ($sku === '') {
                continue;
            }

            $candidate = [
                'sku' => $sku,
                'frame' => isset($m['frame']) && $m['frame'] !== '' ? (int) $m['frame'] : null,
                'view' => isset($m['view']) && $m['view'] !== '' ? $this->normaliseView($m['view']) : null,
            ];

            // Two patterns often agree; keep the higher-ranked reading only.
            $key = $candidate['sku'].'|'.$candidate['frame'].'|'.$candidate['view'];
            if (isset($seen[$key])) {
                continue;
            }
            $seen[$key] = true;
            $out[] = $candidate;
        }

        return $out;
    }

    /**
     * The single best reading, ignoring the catalogue.
     *
     * Only for reporting and tests — real imports go through plan(), which
     * resolves ambiguity against products rather than trusting rank alone.
     *
     * @return array{sku: string, frame: ?int, view: ?string}|null
     */
    public function parseName(string $relativePath): ?array
    {
        return $this->candidates($relativePath)[0] ?? null;
    }

    /**
     * Look SKUs up forgivingly.
     *
     * A photographer's "clv1234" and the catalogue's "CLV-1234" are the same
     * piece, and insisting otherwise means hand-renaming thousands of files.
     * Exact match still wins; normalisation is only the fallback, and an
     * ambiguous normalised key is dropped rather than guessed at.
     *
     * @param  array<int, string>  $skus
     * @return array<string, Product>  keyed by normalised SKU
     */
    public function resolveSkus(array $skus): array
    {
        $skus = array_values(array_unique(array_filter($skus)));
        if (! $skus) {
            return [];
        }

        $wanted = [];
        foreach ($skus as $sku) {
            $wanted[$this->normaliseSku($sku)] = true;
        }

        $out = [];
        $ambiguous = [];

        // The catalogue is a few hundred rows; normalising in PHP is cheaper and
        // far more portable than a REGEXP_REPLACE that differs per MySQL build.
        Product::select('id', 'sku', 'name')->chunkById(500, function ($chunk) use (&$out, &$ambiguous, $wanted) {
            foreach ($chunk as $product) {
                $key = $this->normaliseSku($product->sku);
                if (! isset($wanted[$key])) {
                    continue;
                }
                if (isset($out[$key]) && $out[$key]->id !== $product->id) {
                    $ambiguous[$key] = true;
                }
                $out[$key] = $product;
            }
        });

        foreach (array_keys($ambiguous) as $key) {
            unset($out[$key]);
        }

        return $out;
    }

    public function normaliseSku(string $sku): string
    {
        return strtolower(preg_replace('/[^A-Za-z0-9]+/', '', $sku) ?? $sku);
    }

    /**
     * Angle labels are stored as written, with one exception: the CAD
     * supplier encodes the METAL as a bare @R/@W/@Y, and a `view` column
     * holding "r" would be unreadable to anyone opening the table later.
     * Only single letters are translated, so a genuine view word like "right"
     * is never mangled into a metal.
     */
    private function normaliseView(string $view): string
    {
        $view = strtolower($view);

        return match ($view) {
            'r' => 'rose',
            'w' => 'white',
            'y' => 'yellow',
            default => $view,
        };
    }

    public function extensionAllowed(string $name): bool
    {
        $ext = strtolower(pathinfo($name, PATHINFO_EXTENSION));

        return in_array($ext, (array) config('ingest.extensions'), true);
    }

    /** Keep SKUs safe as directory names without losing readability. */
    private function skuFolder(string $sku): string
    {
        $safe = preg_replace('/[^A-Za-z0-9._-]+/', '-', $sku) ?? 'misc';

        return trim($safe, '-.') ?: 'misc';
    }
}
