<?php

namespace App\Services;

class PdfTextExtractor
{
    /**
     * Extract full structured PDF data (text, table_rows, page_count, scanned flag, encryption status).
     */
    public function extractPdfData(string $filePath, ?string $password = null): array
    {
        if (!file_exists($filePath) || filesize($filePath) === 0) {
            return [
                'success' => false,
                'page_count' => 0,
                'is_encrypted' => false,
                'is_scanned' => false,
                'has_selectable_text' => false,
                'text' => '',
                'lines' => [],
                'table_rows' => [],
                'error' => 'File not found or empty',
            ];
        }

        // 1. Try Python pdfplumber / pypdf extractor
        $scriptPath = __DIR__ . DIRECTORY_SEPARATOR . 'extract_pdf.py';
        if (file_exists($scriptPath)) {
            $escapedFile = escapeshellarg($filePath);
            $escapedPwd = escapeshellarg($password ?? 'null');
            $command = "python \"{$scriptPath}\" {$escapedFile} {$escapedPwd} 2>&1";
            
            $output = @shell_exec($command);
            if ($output) {
                $data = json_decode($output, true);
                if (is_array($data)) {
                    return array_merge([
                        'success' => true,
                        'page_count' => 1,
                        'is_encrypted' => false,
                        'is_scanned' => false,
                        'has_selectable_text' => true,
                        'text' => '',
                        'lines' => [],
                        'table_rows' => [],
                    ], $data);
                }
            }
        }

        // 2. Pure PHP stream decoding fallback
        $text = $this->extractTextFallback($filePath);
        $hasText = !empty(trim($text));

        return [
            'success' => $hasText,
            'page_count' => 1,
            'is_encrypted' => false,
            'is_scanned' => !$hasText,
            'has_selectable_text' => $hasText,
            'text' => $text,
            'lines' => explode("\n", $text),
            'table_rows' => [],
        ];
    }

    /**
     * Legacy helper to extract plain text string.
     */
    public function extractText(string $filePath, ?string $password = null): string
    {
        $data = $this->extractPdfData($filePath, $password);
        return $data['text'] ?? '';
    }

    private function extractTextFallback(string $filePath): string
    {
        $content = @file_get_contents($filePath);
        if (!$content) {
            return '';
        }

        $text = '';
        preg_match_all('/stream[\r\n]+(.*?)[\r\n]+endstream/s', $content, $matches);

        foreach ($matches[1] as $stream) {
            $decompressed = @gzuncompress($stream);
            if ($decompressed !== false) {
                $text .= ' ' . $this->extractStringsFromStream($decompressed);
            } else {
                $text .= ' ' . $this->extractStringsFromStream($stream);
            }
        }

        if (trim($text)) {
            return $text;
        }

        preg_match_all('/[\x20-\x7E\r\n\t]{4,}/', $content, $printable);
        return implode("\n", $printable[0] ?? []);
    }

    private function extractStringsFromStream(string $stream): string
    {
        $result = '';
        preg_match_all('/\((.*?)\)\s*T[jJ]/s', $stream, $matches);
        if (!empty($matches[1])) {
            $result .= implode(" ", $matches[1]);
        }
        preg_match_all('/\[(.*?)\]\s*TJ/s', $stream, $tjMatches);
        if (!empty($tjMatches[1])) {
            foreach ($tjMatches[1] as $item) {
                preg_match_all('/\((.*?)\)/s', $item, $inner);
                if (!empty($inner[1])) {
                    $result .= ' ' . implode('', $inner[1]);
                }
            }
        }
        return $result;
    }
}

