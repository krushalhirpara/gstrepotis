<?php

namespace App\Services\Parsers;

class SBIBankParser extends BaseBankParser
{
    public function parse(string $rawText): array
    {
        return $this->parseLines($rawText);
    }
}
