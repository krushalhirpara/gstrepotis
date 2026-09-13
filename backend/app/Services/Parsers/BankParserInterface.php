<?php

namespace App\Services\Parsers;

interface BankParserInterface
{
    /**
     * Parse structured PDF data into normalized transaction records.
     *
     * @param array $pdfData Output from PdfTextExtractor (text, lines, table_rows, etc.)
     * @return array List of normalized transaction items with metadata
     */
    public function parse(array $pdfData): array;
}
