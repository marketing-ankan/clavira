<?php

namespace App\Console\Commands;

use App\Models\Product;
use App\Services\PhotoIngest;
use Illuminate\Console\Command;
use RecursiveDirectoryIterator;
use RecursiveIteratorIterator;
use SplFileInfo;

/**
 * Ingest an unzipped photo folder that is already on this machine.
 *
 * Two jobs:
 *
 *   --dry   Read-only. Answers "will my ten thousand files parse, and do those
 *           SKUs exist?" before anything is uploaded or written. This is the
 *           command to run first, every time — a filename convention that the
 *           patterns don't match turns a 40 GB transfer into 40 GB of skips.
 *
 *   live    Copies files in and creates rows, with the same dedupe rules the
 *           HTTP endpoint uses. Useful when the photos and the app share a
 *           disk, where pushing them through n8n over HTTP would be pure
 *           overhead.
 */
class IngestPhotos extends Command
{
    protected $signature = 'photos:ingest
        {path : Folder to walk (recursively)}
        {--dry : Report only — write nothing}
        {--batch= : Batch label; defaults to a timestamp}
        {--limit=0 : Stop after N files (0 = no limit)}';

    protected $description = 'Import a folder of product photos, matching each file to a SKU';

    public function handle(PhotoIngest $ingest): int
    {
        $root = rtrim((string) $this->argument('path'), '/\\');

        if (! is_dir($root)) {
            $this->error("Not a folder: {$root}");

            return self::FAILURE;
        }

        $dry = (bool) $this->option('dry');
        $batch = (string) ($this->option('batch') ?: 'cli-'.now()->format('YmdHis'));
        $limit = (int) $this->option('limit');

        $this->line($dry ? '<comment>DRY RUN — nothing will be written.</comment>' : "Batch <info>{$batch}</info>");
        $this->line("Walking {$root} …");

        $stats = ['seen' => 0, 'stored' => 0, 'duplicate' => 0, 'unknown_sku' => 0, 'unparsable' => 0, 'bad_extension' => 0, 'failed' => 0];
        $unknownSkus = [];
        $samples = [];

        foreach ($this->walk($root) as $file) {
            if ($limit > 0 && $stats['seen'] >= $limit) {
                break;
            }
            $stats['seen']++;

            $relative = ltrim(str_replace('\\', '/', substr($file->getPathname(), strlen($root))), '/');

            if (! $ingest->extensionAllowed($relative)) {
                $stats['bad_extension']++;

                continue;
            }

            // Cheap reject before the expensive part: a name no pattern
            // understands is not worth reading 8 MB off the NAS to hash.
            if (! $ingest->candidates($relative)) {
                $stats['unparsable']++;
                if (count($samples) < 10) {
                    $samples[] = $relative;
                }

                continue;
            }

            // Hashing is the expensive part of a dry run, but it is also the
            // only honest way to say "this one is already imported", so it is
            // worth the read. Streamed by hash_file, not loaded into memory.
            $sha = hash_file('sha256', $file->getPathname());

            $plan = $ingest->plan([['name' => $relative, 'sha256' => $sha]]);

            if ($skip = $plan['skip'][0] ?? null) {
                $stats[$skip['reason']]++;
                if ($skip['reason'] === PhotoIngest::SKIP_UNKNOWN_SKU) {
                    // Tally every reading that was tried, not just the top one:
                    // "CLV-1234_07 | CLV-1234" points straight at a pattern
                    // that needs adjusting, where a lone SKU would not.
                    $key = implode(' | ', $skip['tried'] ?? [$skip['sku']]);
                    $unknownSkus[$key] = ($unknownSkus[$key] ?? 0) + 1;
                }

                continue;
            }

            $row = $plan['accept'][0];

            if ($dry) {
                $stats['stored']++;

                continue;
            }

            try {
                $stored = $ingest->store(
                    product: Product::findOrFail($row['product_id']),
                    sha256: $sha,
                    extension: pathinfo($relative, PATHINFO_EXTENSION) ?: 'jpg',
                    sourceName: $relative,
                    frame: $row['frame'],
                    view: $row['view'],
                    batch: $batch,
                    move: fn (string $destination) => copy($file->getPathname(), $destination),
                );

                $stored ? $stats['stored']++ : $stats['duplicate']++;
            } catch (\Throwable $e) {
                $stats['failed']++;
                $this->warn("  {$relative}: {$e->getMessage()}");
            }

            if ($stats['seen'] % 250 === 0) {
                $this->line("  … {$stats['seen']} files");
            }
        }

        $this->newLine();
        $this->table(['outcome', 'files'], collect($stats)->map(fn ($v, $k) => [$k, $v])->values());

        if ($samples) {
            $this->newLine();
            $this->warn('Filenames the patterns could not parse (first '.count($samples).'):');
            foreach ($samples as $s) {
                $this->line("  {$s}");
            }
            $this->line('Adjust config/ingest.php → patterns, then re-run --dry.');
        }

        if ($unknownSkus) {
            $this->newLine();
            arsort($unknownSkus);
            $this->warn(count($unknownSkus).' SKU reading(s) in the folder match nothing in the catalogue:');
            foreach (array_slice($unknownSkus, 0, 25, true) as $sku => $n) {
                $this->line("  {$sku}  ({$n} file".($n === 1 ? '' : 's').')');
            }
            $this->line('Each line lists every reading tried for those files, best first.');
        }

        return self::SUCCESS;
    }

    /** @return \Generator<SplFileInfo> */
    private function walk(string $root): \Generator
    {
        $it = new RecursiveIteratorIterator(
            // SKIP_DOTS keeps '.' and '..' out; CURRENT_AS_FILEINFO is the
            // default but stated because the loop depends on it.
            new RecursiveDirectoryIterator($root, RecursiveDirectoryIterator::SKIP_DOTS | RecursiveDirectoryIterator::CURRENT_AS_FILEINFO),
            RecursiveIteratorIterator::LEAVES_ONLY
        );

        foreach ($it as $file) {
            /** @var SplFileInfo $file */
            if ($file->isFile()) {
                yield $file;
            }
        }
    }
}
