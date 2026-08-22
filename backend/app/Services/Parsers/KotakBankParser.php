<?php

namespace App\Services\Parsers;

class KotakBankParser extends BaseBankParser
{
    public function parse(string $rawText): array
    {
        return $this->parseLines($rawText);
    }
}
