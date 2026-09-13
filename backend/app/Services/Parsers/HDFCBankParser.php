<?php

namespace App\Services\Parsers;

class HDFCBankParser extends BaseBankParser
{
    public function parse(array $pdfData): array
    {
        return parent::parse($pdfData);
    }
}
