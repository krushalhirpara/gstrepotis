<?php

namespace App\Services\Parsers;

class HDFCBankParser extends BaseBankParser
{
    public function parse(string $rawText): array
    {
        return $this->parseLines($rawText);
    }
}
