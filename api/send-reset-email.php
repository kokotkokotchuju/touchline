<?php

declare(strict_types=1);

require_once __DIR__ . '/../vendor/autoload.php';

use PHPMailer\PHPMailer\Exception;
use PHPMailer\PHPMailer\PHPMailer;

header('Content-Type: application/json; charset=utf-8');

function env_value(string $name): string
{
    $value = getenv($name);
    if ($value !== false && $value !== '') {
        return $value;
    }
    $envFile = dirname(__DIR__) . DIRECTORY_SEPARATOR . '.env.local';
    if (!is_readable($envFile)) {
        return '';
    }
    foreach (file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [] as $line) {
        $line = trim($line);
        if ($line === '' || str_starts_with($line, '#')) {
            continue;
        }
        [$key, $fileValue] = array_pad(explode('=', $line, 2), 2, '');
        if (trim($key) === $name) {
            return trim($fileValue, " \t\n\r\0\x0B\"'");
        }
    }
    return '';
}

function fail_response(string $message, int $status = 400): never
{
    http_response_code($status);
    echo json_encode(['error' => $message], JSON_THROW_ON_ERROR);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    fail_response('Method not allowed.', 405);
}

$expectedSecret = env_value('PASSWORD_RESET_MAILER_SECRET');
$providedSecret = $_SERVER['HTTP_X_MAILER_SECRET'] ?? '';
if ($expectedSecret === '' || !hash_equals($expectedSecret, $providedSecret)) {
    fail_response('Unauthorized.', 401);
}

$payload = json_decode(file_get_contents('php://input') ?: '', true);
$email = is_array($payload) && is_string($payload['email'] ?? null)
    ? trim($payload['email'])
    : '';
$resetUrl = is_array($payload) && is_string($payload['resetUrl'] ?? null)
    ? trim($payload['resetUrl'])
    : '';

if (!filter_var($email, FILTER_VALIDATE_EMAIL) || !filter_var($resetUrl, FILTER_VALIDATE_URL)) {
    fail_response('Invalid mail request.');
}

$mail = new PHPMailer(true);
try {
    $mail->isSMTP();
    $mail->Host = env_value('MAIL_HOST');
    $mail->Port = (int)(env_value('MAIL_PORT') ?: '587');
    $mail->SMTPAuth = true;
    $mail->Username = env_value('MAIL_USERNAME');
    $mail->Password = env_value('MAIL_PASSWORD');
    $mail->SMTPSecure = env_value('MAIL_ENCRYPTION') ?: PHPMailer::ENCRYPTION_STARTTLS;
    $mail->CharSet = 'UTF-8';
    $mail->setFrom(
        env_value('MAIL_FROM_ADDRESS') ?: $mail->Username,
        env_value('MAIL_FROM_NAME') ?: 'Touchline',
    );
    $mail->addAddress($email);
    $mail->isHTML(true);
    $mail->Subject = 'Reset your Touchline password';
    $safeUrl = htmlspecialchars($resetUrl, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    $mail->Body = '<p>We received a request to reset your Touchline password.</p>'
        . '<p><a href="' . $safeUrl . '">Choose a new password</a></p>'
        . '<p>This link expires in 30 minutes and can only be used once.</p>';
    $mail->AltBody = "Reset your Touchline password: {$resetUrl}\n"
        . "This link expires in 30 minutes and can only be used once.";
    $mail->send();
    echo json_encode(['ok' => true], JSON_THROW_ON_ERROR);
} catch (Exception $exception) {
    error_log('Password reset email failed: ' . $exception->getMessage());
    fail_response('Unable to send email.', 502);
}
