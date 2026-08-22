<?php

namespace App\Services\Parsers;

class GenericBankParser extends BaseBankParser
{
    public function parse(string $rawText): array
    {
        return $this->parseLines($rawText);
    }
}
