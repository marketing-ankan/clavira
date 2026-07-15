<?php

namespace App\Console\Commands;

use App\Mail\AdminInviteMail;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Mail;

class MailTest extends Command
{
    protected $signature = 'clavira:mail-test {email : Where to send the test} {--invite : Send a sample admin-invite email instead of a plain one}';

    protected $description = 'Send a test email to verify SMTP settings on this server';

    public function handle(): int
    {
        $to = $this->argument('email');
        $this->line('Mailer: <info>'.config('mail.default').'</info>  From: <info>'.config('mail.from.address').'</info>');

        try {
            if ($this->option('invite')) {
                Mail::to($to)->send(new AdminInviteMail('Test Admin', rtrim(config('app.url'), '/').'/admin/set-password/SAMPLE-TOKEN', config('admin.invite_ttl_hours')));
            } else {
                Mail::raw('Clavira SMTP test — if you can read this, outgoing email is working.', function ($m) use ($to) {
                    $m->to($to)->subject('Clavira SMTP test');
                });
            }
        } catch (\Throwable $e) {
            $this->error('Send failed: '.$e->getMessage());

            return self::FAILURE;
        }

        $this->info("Sent to {$to}. If mailer is 'log', check storage/logs/laravel.log; otherwise check the inbox (and spam).");

        return self::SUCCESS;
    }
}
