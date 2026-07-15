<?php

namespace Database\Seeders;

use App\Models\AdminInvitation;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class AdminSeeder extends Seeder
{
    /**
     * Provisions ONLY the configured owner accounts (config/admin.php → ADMIN_OWNERS).
     * Owners are created without a usable password; each receives a one-time
     * set-password link (printed here, and emailed in the invite flow).
     * There is deliberately no generic/default admin account.
     */
    public function run(): void
    {
        $owners = config('admin.owners', []);

        if (empty($owners)) {
            $this->command->warn('No ADMIN_OWNERS configured — no admins seeded.');

            return;
        }

        foreach ($owners as $email) {
            $user = User::firstOrNew(['email' => $email]);
            $user->name = $user->name ?: Str::title(Str::before($email, '@'));
            $user->is_admin = true;
            if (! $user->exists) {
                $user->password = Hash::make(Str::random(40)); // unusable until set via link
            }
            $user->save();

            // Only issue a fresh link if they have not set a password yet
            $needsLink = ! AdminInvitation::where('user_id', $user->id)->whereNotNull('accepted_at')->exists();
            if ($needsLink) {
                $url = AdminInvitation::issue($user);
                $this->command->info("Owner {$email} → set password: {$url}");
            } else {
                $this->command->info("Owner {$email} already active.");
            }
        }

        // Remove the legacy default admin if it slipped in and is not an owner
        User::where('email', 'admin@clavira.test')->where('is_admin', true)
            ->whereNotIn('email', $owners)->update(['is_admin' => false]);
    }
}
