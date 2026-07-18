<?php

namespace App\Mail;

use Symfony\Component\Mailer\SentMessage;
use Symfony\Component\Mailer\Transport\AbstractTransport;
use Symfony\Component\Mime\MessageConverter;
use Illuminate\Support\Facades\Http;

class GoogleScriptTransport extends AbstractTransport
{
    protected string $url;
    protected string $key;

    public function __construct(string $url, string $key)
    {
        parent::__construct();
        $this->url = $url;
        $this->key = $key;
    }

    protected function doSend(SentMessage $message): void
    {
        $email = MessageConverter::toEmail($message->getOriginalMessage());
        
        $html = $email->getHtmlBody();
        $text = $email->getTextBody() ?? strip_tags($html ?? '');
        $subject = $email->getSubject();
        
        $toAddresses = [];
        foreach ($email->getTo() as $address) {
            $toAddresses[] = $address->getAddress();
        }
        
        $fromName = 'Coupena';
        foreach ($email->getFrom() as $address) {
            if ($address->getName()) {
                $fromName = $address->getName();
            }
        }

        $response = Http::post($this->url, [
            'key' => $this->key,
            'to' => implode(',', $toAddresses),
            'subject' => $subject,
            'body' => $text,
            'html' => $html,
            'from_name' => $fromName,
        ]);

        if ($response->failed() || $response->json('status') !== 'success') {
            throw new \Exception('Failed to send email via Google Apps Script: ' . ($response->json('message') ?? $response->body()));
        }
    }

    public function __toString(): string
    {
        return 'google-script';
    }
}
