<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class OtpVerificationMail extends Mailable
{
    use Queueable, SerializesModels;

    public string $otp;
    public string $userName;
    public string $purpose;

    public function __construct(string $otp, string $userName = 'User', string $purpose = 'login')
    {
        $this->otp = $otp;
        $this->userName = $userName ?: 'User';
        $this->purpose = $purpose;
    }

    public function envelope(): Envelope
    {
        $subject = match ($this->purpose) {
            'signup' => 'GST REPOTIS - Verify Your Email',
            'login' => 'GST REPOTIS Login Verification Code',
            'password_reset' => 'GST REPOTIS - Password Reset Code',
            default => 'GST REPOTIS Verification Code',
        };

        return new Envelope(
            subject: $subject,
        );
    }

    public function content(): Content
    {
        return new Content(
            htmlString: $this->buildHtml(),
            text: null,
        );
    }

    protected function buildHtml(): string
    {
        $safeName = htmlspecialchars($this->userName, ENT_QUOTES, 'UTF-8');
        $safeOtp = htmlspecialchars($this->otp, ENT_QUOTES, 'UTF-8');
        $year = date('Y');

        $actionTitle = match ($this->purpose) {
            'signup' => 'Email Verification',
            'login' => 'Login Verification',
            'password_reset' => 'Password Reset',
            default => 'Account Verification',
        };

        $actionText = match ($this->purpose) {
            'signup' => 'Thank you for signing up with GST REPOTIS. Use the verification code below to verify your email address and activate your account:',
            'login' => 'Your GST REPOTIS login verification code is:',
            'password_reset' => 'You requested a password reset for your GST REPOTIS account. Use the code below to reset your password:',
            default => 'Your GST REPOTIS verification code is:',
        };

        $expiryText = ($this->purpose === 'password_reset') ? '10 minutes' : '5 minutes';

        return "
        <!DOCTYPE html>
        <html lang='en'>
        <head>
            <meta charset='utf-8'>
            <meta name='viewport' content='width=device-width, initial-scale=1.0'>
            <title>GST REPOTIS {$actionTitle}</title>
            <style>
                body {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                    background-color: #f8fafc;
                    margin: 0;
                    padding: 30px 15px;
                    color: #0f172a;
                    -webkit-font-smoothing: antialiased;
                }
                .container {
                    max-width: 520px;
                    margin: 0 auto;
                    background: #ffffff;
                    border: 1px solid #e2e8f0;
                    border-radius: 16px;
                    padding: 36px 32px;
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05);
                }
                .header {
                    text-align: center;
                    margin-bottom: 28px;
                    border-bottom: 1px solid #f1f5f9;
                    padding-bottom: 20px;
                }
                .brand-title {
                    font-size: 20px;
                    font-weight: 900;
                    color: #0f172a;
                    letter-spacing: -0.5px;
                    margin: 0 0 4px 0;
                }
                .brand-subtitle {
                    font-size: 12px;
                    color: #64748b;
                    font-weight: 500;
                    margin: 0;
                }
                .greeting {
                    font-size: 15px;
                    font-weight: 600;
                    color: #1e293b;
                    margin-bottom: 14px;
                }
                .text {
                    font-size: 14px;
                    color: #334155;
                    line-height: 1.6;
                    margin-bottom: 22px;
                }
                .otp-card {
                    background: #f8fafc;
                    border: 1.5px solid #cbd5e1;
                    border-radius: 12px;
                    padding: 22px;
                    text-align: center;
                    margin: 24px 0;
                }
                .otp-label {
                    font-size: 11px;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                    color: #64748b;
                    margin-bottom: 8px;
                }
                .otp-code {
                    font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace;
                    font-size: 36px;
                    font-weight: 800;
                    letter-spacing: 8px;
                    color: #0f172a;
                }
                .notice {
                    font-size: 13px;
                    color: #64748b;
                    line-height: 1.5;
                    margin-top: 16px;
                    margin-bottom: 24px;
                }
                .signoff {
                    font-size: 14px;
                    color: #334155;
                    line-height: 1.5;
                    border-top: 1px solid #f1f5f9;
                    padding-top: 18px;
                }
                .footer {
                    text-align: center;
                    font-size: 11px;
                    color: #94a3b8;
                    margin-top: 24px;
                    line-height: 1.4;
                }
            </style>
        </head>
        <body>
            <div class='container'>
                <div class='header'>
                    <h1 class='brand-title'>GST REPOTIS</h1>
                    <p class='brand-subtitle'>Financial Intelligence & Tax Automation Infrastructure</p>
                </div>

                <div class='greeting'>Hello {$safeName},</div>

                <div class='text'>{$actionText}</div>

                <div class='otp-card'>
                    <div class='otp-label'>Verification Code</div>
                    <div class='otp-code'>{$safeOtp}</div>
                </div>

                <div class='notice'>
                    This code expires in <strong>{$expiryText}</strong>.<br/>
                    If you did not request this code, please ignore this email or contact support.
                </div>

                <div class='signoff'>
                    Regards,<br/>
                    <strong>GST REPOTIS Team</strong>
                </div>

                <div class='footer'>
                    &copy; {$year} GST REPOTIS. Automated Bank Statement & GSTR-1 Infrastructure. All rights reserved.
                </div>
            </div>
        </body>
        </html>
        ";
    }
}
