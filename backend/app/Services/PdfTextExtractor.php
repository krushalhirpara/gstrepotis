<?php

namespace App\Services;

class PdfTextExtractor
{
    /**
     * Extract plain text content from all pages of a PDF file.
     */
    public function extractText(string $filePath): string
    {
        if (!file_exists($filePath) || filesize($filePath) === 0) {
            return '';
        }

        $content = @file_get_contents($filePath);
        if (!$content) {
            return '';
        }

        // 1. Direct text stream decoding from PDF objects
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

        // Clean up extracted text lines
        if (trim($text)) {
            return $text;
        }

        // Fallback: extract printable strings across entire PDF binary
        preg_match_all('/[\x20-\x7E\r\n\t]{4,}/', $content, $printable);
        return implode("\n", $printable[0] ?? []);
    }

    private function extractStringsFromStream(string $stream): string
    {
        $result = '';
        // Extract text inside Tj, TJ, and () operators
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
