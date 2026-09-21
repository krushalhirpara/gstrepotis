<?php

namespace App\Services;

use Exception;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class FirebaseTokenVerifier
{
    protected string $projectId;
    protected string $publicKeysUrl = 'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';

    public function __construct(?string $projectId = null)
    {
        $this->projectId = $projectId ?: config('services.firebase.project_id', env('FIREBASE_PROJECT_ID', 'gstrepotis'));
    }

    /**
     * Fetch Google's public x509 certificates used to verify Firebase ID tokens.
     * Caches response based on Cache-Control max-age or default 1 hour.
     *
     * @return array<string, Key>
     */
    public function getPublicKeys(): array
    {
        return Cache::remember('firebase_google_public_keys', 3600, function () {
            try {
                $response = Http::timeout(10)->get($this->publicKeysUrl);
                if (!$response->successful()) {
                    throw new Exception('Failed to fetch Google public keys for Firebase: HTTP ' . $response->status());
                }

                $certificates = $response->json();
                if (!is_array($certificates) || empty($certificates)) {
                    throw new Exception('Google public keys for Firebase were empty or invalid format.');
                }

                $keys = [];
                foreach ($certificates as $kid => $cert) {
                    $keys[$kid] = new Key($cert, 'RS256');
                }

                return $keys;
            } catch (Exception $e) {
                Log::error('FirebaseTokenVerifier: Error fetching public keys: ' . $e->getMessage());
                throw $e;
            }
        });
    }

    /**
     * Verify a Firebase ID token and return the verified claims.
     *
     * @param string $idToken
     * @return array
     * @throws Exception
     */
    public function verifyIdToken(string $idToken): array
    {
        if (empty(trim($idToken))) {
            throw new Exception('Firebase ID token is required.');
        }

        $keys = $this->getPublicKeys();

        try {
            $decoded = JWT::decode($idToken, $keys);
            $claims = (array) $decoded;
        } catch (Exception $e) {
            // If verification failed, refresh key cache once and retry (in case keys were rotated)
            try {
                Cache::forget('firebase_google_public_keys');
                $keys = $this->getPublicKeys();
                $decoded = JWT::decode($idToken, $keys);
                $claims = (array) $decoded;
            } catch (Exception $retryException) {
                Log::warning('FirebaseTokenVerifier: Token verification failed: ' . $retryException->getMessage());
                throw new Exception('Invalid or expired Firebase ID token: ' . $retryException->getMessage());
            }
        }

        // Validate Audience
        if (!isset($claims['aud']) || $claims['aud'] !== $this->projectId) {
            throw new Exception("Firebase ID token audience [{$claims['aud']}] does not match project ID [{$this->projectId}].");
        }

        // Validate Issuer
        $expectedIssuer = 'https://securetoken.google.com/' . $this->projectId;
        if (!isset($claims['iss']) || $claims['iss'] !== $expectedIssuer) {
            throw new Exception("Firebase ID token issuer [{$claims['iss']}] does not match expected [{$expectedIssuer}].");
        }

        // Validate Subject (Firebase UID)
        if (empty($claims['sub']) || !is_string($claims['sub'])) {
            throw new Exception('Firebase ID token subject (user ID) is missing or invalid.');
        }

        // Validate Expiration & Auth Time
        $now = time();
        if (isset($claims['exp']) && $claims['exp'] < $now) {
            throw new Exception('Firebase ID token has expired.');
        }

        if (isset($claims['auth_time']) && $claims['auth_time'] > $now + 300) {
            throw new Exception('Firebase ID token auth_time is in the future.');
        }

        return [
            'uid' => $claims['sub'],
            'email' => strtolower(trim($claims['email'] ?? '')),
            'email_verified' => (bool) ($claims['email_verified'] ?? false),
            'name' => $claims['name'] ?? ($claims['email'] ? explode('@', $claims['email'])[0] : 'GST User'),
            'picture' => $claims['picture'] ?? null,
            'claims' => $claims,
        ];
    }
}
