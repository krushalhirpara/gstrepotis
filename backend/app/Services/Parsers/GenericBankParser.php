<?php

namespace App\Services\Parsers;

class GenericBankParser extends BaseBankParser
{
    public function parse(array $pdfData): array
    {
        return parent::parse($pdfData);
    }
}
