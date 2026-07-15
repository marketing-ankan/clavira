<?php

namespace App\Providers;

use App\Models\User;
use App\Support\AdminAccess;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Admin requires BOTH the DB flag AND an allowlisted email (owner or
        // company domain). The flag alone is never enough — a stray/flipped
        // is_admin on any other address still cannot pass this gate.
        Gate::define('admin', fn (User $user) => $user->is_admin && AdminAccess::emailEligible($user->email));
    }
}
