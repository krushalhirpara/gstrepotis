<?php

namespace App\Services\Parsers;

class KotakBankParser extends BaseBankParser
{
    public function parse(array $pdfData): array
    {
        return parent::parse($pdfData);
    }
}
