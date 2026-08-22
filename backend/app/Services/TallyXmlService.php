<?php

namespace App\Services;

class TallyXmlService
{
    /**
     * Generate Tally XML for Bank Transactions.
     * Compatible with Tally Prime and Tally ERP 9.
     */
    public function generateBankStatementXml(string $bankName, array $transactions): string
    {
        $xml = new \SimpleXMLElement('<?xml version="1.0" encoding="UTF-8"?><ENVELOPE/>');
        $header = $xml->addChild('HEADER');
        $header->addChild('TALLYREQUEST', 'Import Data');

        $body = $xml->addChild('BODY');
        $importData = $body->addChild('IMPORTDATA');
        $requestDesc = $importData->addChild('REQUESTDESC');
        $requestDesc->addChild('REPORTNAME', 'Vouchers');
        $staticVariables = $requestDesc->addChild('STATICVARIABLES');
        $staticVariables->addChild('SVCURRENTCOMPANY', 'GST Suite Company');

        $requestData = $importData->addChild('REQUESTDATA');

        foreach ($transactions as $tx) {
            $tallyMessage = $requestData->addChild('TALLYMESSAGE');
            $tallyMessage->addAttribute('xmlns:UDF', 'TallyUDF');

            $voucher = $tallyMessage->addChild('VOUCHER');
            $voucher->addAttribute('VCHTYPE', ($tx['debit'] > 0) ? 'Payment' : 'Receipt');
            $voucher->addAttribute('ACTION', 'Create');

            $dateFormatted = date('Ymd', strtotime($tx['transaction_date']));
            $voucher->addChild('DATE', $dateFormatted);
            $voucher->addChild('NARRATION', htmlspecialchars($tx['narration'] ?? 'Bank Transaction'));
            $voucher->addChild('VOUCHERTYPENAME', ($tx['debit'] > 0) ? 'Payment' : 'Receipt');
            $voucher->addChild('EFFECTIVEDATE', $dateFormatted);

            // Bank Ledger Entry
            $bankLedger = $voucher->addChild('ALLLEDGERENTRIES.LIST');
            $bankLedger->addChild('LEDGERNAME', htmlspecialchars($bankName));
            $bankLedger->addChild('ISDEEMEDPOSITIVE', ($tx['credit'] > 0) ? 'Yes' : 'No');
            $bankLedger->addChild('AMOUNT', ($tx['credit'] > 0) ? -$tx['credit'] : $tx['debit']);

            // Counter Party / Suspense Ledger Entry
            $counterLedger = $voucher->addChild('ALLLEDGERENTRIES.LIST');
            $counterLedger->addChild('LEDGERNAME', 'Suspense / Party Account');
            $counterLedger->addChild('ISDEEMEDPOSITIVE', ($tx['debit'] > 0) ? 'Yes' : 'No');
            $counterLedger->addChild('AMOUNT', ($tx['debit'] > 0) ? -$tx['debit'] : $tx['credit']);
        }

        return $xml->asXML();
    }

    /**
     * Generate Tally XML for GSTR-1 Sales Vouchers.
     */
    public function generateGstr1SalesXml(array $invoices): string
    {
        $xml = new \SimpleXMLElement('<?xml version="1.0" encoding="UTF-8"?><ENVELOPE/>');
        $header = $xml->addChild('HEADER');
        $header->addChild('TALLYREQUEST', 'Import Data');

        $body = $xml->addChild('BODY');
        $importData = $body->addChild('IMPORTDATA');
        $requestDesc = $importData->addChild('REQUESTDESC');
        $requestDesc->addChild('REPORTNAME', 'Vouchers');

        $requestData = $importData->addChild('REQUESTDATA');

        foreach ($invoices as $inv) {
            $tallyMessage = $requestData->addChild('TALLYMESSAGE');
            $voucher = $tallyMessage->addChild('VOUCHER');
            $voucher->addAttribute('VCHTYPE', 'Sales');
            $voucher->addAttribute('ACTION', 'Create');

            $voucher->addChild('DATE', date('Ymd', strtotime($inv['invoice_date'])));
            $voucher->addChild('VOUCHERNUMBER', htmlspecialchars($inv['invoice_number']));
            $voucher->addChild('NARRATION', 'E-Commerce Marketplace Sale - GST');

            // Debited Customer / Marketplace
            $partyLedger = $voucher->addChild('ALLLEDGERENTRIES.LIST');
            $partyLedger->addChild('LEDGERNAME', htmlspecialchars($inv['customer_name'] ?? 'Marketplace Customer'));
            $partyLedger->addChild('ISDEEMEDPOSITIVE', 'Yes');
            $partyLedger->addChild('AMOUNT', -$inv['invoice_value']);

            // Sales Income Ledger
            $salesLedger = $voucher->addChild('ALLLEDGERENTRIES.LIST');
            $salesLedger->addChild('LEDGERNAME', 'Sales Account');
            $salesLedger->addChild('ISDEEMEDPOSITIVE', 'No');
            $salesLedger->addChild('AMOUNT', $inv['taxable_value']);

            // Tax Ledgers (IGST, CGST, SGST)
            if (($inv['igst'] ?? 0) > 0) {
                $taxLedger = $voucher->addChild('ALLLEDGERENTRIES.LIST');
                $taxLedger->addChild('LEDGERNAME', 'Output IGST');
                $taxLedger->addChild('ISDEEMEDPOSITIVE', 'No');
                $taxLedger->addChild('AMOUNT', $inv['igst']);
            }
            if (($inv['cgst'] ?? 0) > 0) {
                $taxLedger = $voucher->addChild('ALLLEDGERENTRIES.LIST');
                $taxLedger->addChild('LEDGERNAME', 'Output CGST');
                $taxLedger->addChild('ISDEEMEDPOSITIVE', 'No');
                $taxLedger->addChild('AMOUNT', $inv['cgst']);
            }
            if (($inv['sgst'] ?? 0) > 0) {
                $taxLedger = $voucher->addChild('ALLLEDGERENTRIES.LIST');
                $taxLedger->addChild('LEDGERNAME', 'Output SGST');
                $taxLedger->addChild('ISDEEMEDPOSITIVE', 'No');
                $taxLedger->addChild('AMOUNT', $inv['sgst']);
            }
        }

        return $xml->asXML();
    }
}
