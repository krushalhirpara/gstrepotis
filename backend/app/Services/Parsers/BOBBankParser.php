<?php

namespace App\Services\Parsers;

class BOBBankParser extends BaseBankParser
{
    public function parse(array $pdfData): array
    {
        return parent::parse($pdfData);
    }
}
