<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class AdminInviteMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public string $name,
        public string $url,
        public int $ttlHours,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: 'Your Clavira admin access');
    }

    public function content(): Content
    {
        return new Content(view: 'emails.admin-invite');
    }
}
