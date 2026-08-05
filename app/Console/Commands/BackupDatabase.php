<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Symfony\Component\Process\Process;

/**
 * Nightly database backup.
 *
 * Shared hosting gives no guarantee that anyone else is taking one, and the
 * catalogue, every order and every certificate live in this single database.
 * The dump is written inside storage/ (outside the web root) and old ones are
 * pruned so a forgotten cron cannot fill the disk.
 */
class BackupDatabase extends Command
{
    protected $signature = 'clavira:backup
        {--keep= : Override how many daily dumps to retain}
        {--quiet-success : Only report failures (use this on cron)}';

    protected $description = 'Dump the database to storage/backups and prune old copies';

    public function handle(): int
    {
        $dir = storage_path('backups');

        if (! is_dir($dir) && ! mkdir($dir, 0750, true) && ! is_dir($dir)) {
            return $this->bail('Could not create '.$dir);
        }

        $connection = config('database.default');
        $db = config("database.connections.{$connection}");

        if (($db['driver'] ?? null) !== 'mysql') {
            return $this->bail("Only the mysql connection can be dumped; '{$connection}' is {$db['driver']}.");
        }

        $file = $dir.DIRECTORY_SEPARATOR.'clavira-'.date('Y-m-d-His').'.sql';

        // Credentials go via the environment, never on the command line —
        // anything in argv is visible to every other user on a shared box.
        $process = new Process([
            $this->mysqldumpBinary(),
            '--host='.($db['host'] ?? '127.0.0.1'),
            '--port='.($db['port'] ?? 3306),
            '--user='.($db['username'] ?? ''),
            '--single-transaction',
            '--quick',
            '--default-character-set=utf8mb4',
            '--no-tablespaces',
            '--result-file='.$file,
            $db['database'],
        ], null, ['MYSQL_PWD' => (string) ($db['password'] ?? '')], null, 900);

        $process->run();

        if (! $process->isSuccessful() || ! is_file($file) || filesize($file) < 1024) {
            @unlink($file);

            return $this->bail('mysqldump failed: '.trim($process->getErrorOutput() ?: 'empty dump'));
        }

        $final = $this->compress($file);
        $size = round(filesize($final) / 1048576, 2);

        $pruned = $this->prune($dir, (int) ($this->option('keep') ?: config('backup.keep_days', 14)));

        if (! $this->option('quiet-success')) {
            $this->info('Backed up to '.basename($final)." ({$size} MB)".($pruned ? ", pruned {$pruned} old dump(s)" : ''));
        }

        Log::info('Database backup complete', ['file' => basename($final), 'mb' => $size, 'pruned' => $pruned]);

        return self::SUCCESS;
    }

    /** gzip when the extension is available; an uncompressed dump is still a backup. */
    private function compress(string $file): string
    {
        if (! function_exists('gzopen')) {
            return $file;
        }

        $gz = gzopen($file.'.gz', 'wb9');
        $in = fopen($file, 'rb');

        while (! feof($in)) {
            gzwrite($gz, fread($in, 262144));
        }

        fclose($in);
        gzclose($gz);
        unlink($file);

        return $file.'.gz';
    }

    private function prune(string $dir, int $keep): int
    {
        $files = glob($dir.DIRECTORY_SEPARATOR.'clavira-*.sql*') ?: [];

        if (count($files) <= $keep) {
            return 0;
        }

        // Filenames are timestamped, so lexical order is chronological order.
        sort($files);
        $stale = array_slice($files, 0, count($files) - $keep);

        foreach ($stale as $old) {
            @unlink($old);
        }

        return count($stale);
    }

    private function mysqldumpBinary(): string
    {
        return config('backup.mysqldump_path') ?: 'mysqldump';
    }

    /**
     * A backup that fails silently is the same as no backup at all, so the
     * owners are told. Mail failure is swallowed — it must not mask the real
     * error, which is already on its way to the log.
     */
    private function bail(string $message): int
    {
        $this->error($message);
        Log::error('Database backup FAILED', ['error' => $message]);

        $owners = config('admin.owners', []);

        if ($owners) {
            try {
                Mail::raw(
                    "The nightly Clavira database backup failed.\n\n{$message}\n\n"
                    ."Server time: ".now()->toDateTimeString()."\n"
                    ."Nothing on the storefront is affected, but there is no fresh backup until this is fixed.",
                    fn ($m) => $m->to($owners)->subject('Clavira backup FAILED')
                );
            } catch (\Throwable $e) {
                Log::warning('Backup failure alert could not be emailed', ['error' => $e->getMessage()]);
            }
        }

        return self::FAILURE;
    }
}
