<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class AdminLoginAlertMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public string $who,
        public string $email,
        public string $ip,
        public string $agent,
        public string $when,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: 'Clavira admin sign-in');
    }

    public function content(): Content
    {
        return new Content(view: 'emails.admin-login-alert');
    }
}
