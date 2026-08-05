<?php

namespace App\Console\Commands;

use App\Models\FxRate;
use App\Services\FxService;
use Illuminate\Console\Command;

class FxFetch extends Command
{
    protected $signature = 'clavira:fx-fetch';

    protected $description = 'Refresh the indicative FX rates used for NRI price display';

    public function handle(FxService $service): int
    {
        $written = $service->fetch();

        if ($written === 0) {
            $this->error('No FX rates written — check the feed and the log.');

            return self::FAILURE;
        }

        foreach (FxRate::orderBy('code')->get() as $rate) {
            $this->line(sprintf('  %s  %.6f per INR  (1 %s = ₹%.2f)',
                $rate->code, $rate->per_inr, $rate->code, 1 / $rate->per_inr));
        }

        $this->info("Updated {$written} currencies.");

        return self::SUCCESS;
    }
}
