<?php

namespace App\Services\Parsers;

class ICICIBankParser extends BaseBankParser
{
    public function parse(array $pdfData): array
    {
        return parent::parse($pdfData);
    }
}
