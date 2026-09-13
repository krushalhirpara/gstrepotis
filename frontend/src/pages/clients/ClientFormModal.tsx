import React, { useState, useEffect } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import type { Client } from '../../services/clientService';
import { clientService } from '../../services/clientService';
import { Building2, User, FileText, Phone, Mail, MapPin, Hash } from 'lucide-react';

interface ClientFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientToEdit?: Client | null;
  onSuccess: () => void;
}

export const ClientFormModal: React.FC<ClientFormModalProps> = ({
  isOpen,
  onClose,
  clientToEdit,
  onSuccess,
}) => {
  const isEditing = Boolean(clientToEdit);

  const [tradeName, setTradeName] = useState('');
  const [partyName, setPartyName] = useState('');
  const [gstin, setGstin] = useState('');
  const [pan, setPan] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [stateCode, setStateCode] = useState('');
  const [pincode, setPincode] = useState('');
  const [filingFrequency, setFilingFrequency] = useState<'monthly' | 'quarterly'>('monthly');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (clientToEdit) {
      setTradeName(clientToEdit.trade_name || '');
      setPartyName(clientToEdit.party_name || '');
      setGstin(clientToEdit.gstin || '');
      setPan(clientToEdit.pan || '');
      setMobile(clientToEdit.mobile || '');
      setEmail(clientToEdit.email || '');
      setAddress(clientToEdit.address || '');
      setCity(clientToEdit.city || '');
      setState(clientToEdit.state || '');
      setStateCode(clientToEdit.state_code || '');
      setPincode(clientToEdit.pincode || '');
      setFilingFrequency(clientToEdit.filing_frequency || 'monthly');
      setStatus(clientToEdit.status || 'active');
    } else {
      setTradeName('');
      setPartyName('');
      setGstin('');
      setPan('');
      setMobile('');
      setEmail('');
      setAddress('');
      setCity('');
      setState('');
      setStateCode('');
      setPincode('');
      setFilingFrequency('monthly');
      setStatus('active');
    }
    setError('');
    setFieldErrors({});
  }, [clientToEdit, isOpen]);

  // Auto-derive PAN and State Code from GSTIN (First 2 digits = State Code, Chars 3-12 = PAN)
  const handleGstinChange = (val: string) => {
    const uppercaseVal = val.toUpperCase().trim();
    setGstin(uppercaseVal);
    if (fieldErrors.gstin) setFieldErrors((prev) => ({ ...prev, gstin: '' }));

    if (uppercaseVal.length >= 2) {
      setStateCode(uppercaseVal.substring(0, 2));
    }
    if (uppercaseVal.length >= 12 && !pan) {
      setPan(uppercaseVal.substring(2, 12));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});

    // Client-side pre-validation
    const errs: Record<string, string> = {};
    if (!tradeName.trim()) errs.trade_name = 'Trade Name is required.';
    if (!partyName.trim()) errs.party_name = 'Party / Legal Name is required.';

    const cleanGstin = gstin.trim().toUpperCase();
    if (!cleanGstin) {
      errs.gstin = 'GSTIN is required.';
    } else if (cleanGstin.length !== 15) {
      errs.gstin = 'GSTIN must be exactly 15 characters long.';
    } else if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/i.test(cleanGstin)) {
      errs.gstin = 'Please enter a valid 15-digit GSTIN format (e.g. 24ABCDE1234F1Z5).';
    }

    if (pan && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/i.test(pan.trim())) {
      errs.pan = 'Please enter a valid 10-digit PAN format (e.g. ABCDE1234F).';
    }

    if (email && !/\S+@\S+\.\S+/.test(email.trim())) {
      errs.email = 'Please enter a valid email address.';
    }

    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      return;
    }

    setIsLoading(true);
    const payload: Partial<Client> = {
      trade_name: tradeName.trim(),
      party_name: partyName.trim(),
      gstin: cleanGstin,
      pan: pan.trim().toUpperCase() || undefined,
      mobile: mobile.trim() || undefined,
      email: email.trim().toLowerCase() || undefined,
      address: address.trim() || undefined,
      city: city.trim() || undefined,
      state: state.trim() || undefined,
      state_code: stateCode.trim() || undefined,
      pincode: pincode.trim() || undefined,
      filing_frequency: filingFrequency,
      status,
    };

    try {
      if (isEditing && clientToEdit) {
        await clientService.updateClient(clientToEdit.id, payload);
      } else {
        await clientService.createClient(payload);
      }
      setIsLoading(false);
      onSuccess();
      onClose();
    } catch (err: any) {
      setIsLoading(false);
      if (err.errors) {
        const mapped: Record<string, string> = {};
        Object.keys(err.errors).forEach((key) => {
          mapped[key] = Array.isArray(err.errors[key]) ? err.errors[key][0] : err.errors[key];
        });
        setFieldErrors(mapped);
      } else {
        setError(err.message || 'Failed to save client details.');
      }
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'EDIT CLIENT DETAILS' : 'ADD NEW GST CLIENT'}
      maxWidth="4xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-xs font-mono font-bold text-[#DC2626] rounded-lg">
            {error}
          </div>
        )}

        {/* Basic Business Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="TRADE NAME *"
            value={tradeName}
            onChange={(e) => {
              setTradeName(e.target.value);
              if (fieldErrors.trade_name) setFieldErrors((prev) => ({ ...prev, trade_name: '' }));
            }}
            placeholder="e.g. Acme Traders & Co."
            leftIcon={<Building2 className="w-4 h-4 text-[#555555]" />}
            error={fieldErrors.trade_name}
          />

          <Input
            label="PARTY / LEGAL NAME *"
            value={partyName}
            onChange={(e) => {
              setPartyName(e.target.value);
              if (fieldErrors.party_name) setFieldErrors((prev) => ({ ...prev, party_name: '' }));
            }}
            placeholder="e.g. Acme Enterprises Private Limited"
            leftIcon={<User className="w-4 h-4 text-[#555555]" />}
            error={fieldErrors.party_name}
          />
        </div>

        {/* GSTIN & PAN */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="GSTIN (15 DIGITS) *"
            value={gstin}
            onChange={(e) => handleGstinChange(e.target.value)}
            placeholder="e.g. 24ABCDE1234F1Z5"
            maxLength={15}
            leftIcon={<FileText className="w-4 h-4 text-[#555555]" />}
            error={fieldErrors.gstin}
          />

          <Input
            label="PAN (10 DIGITS)"
            value={pan}
            onChange={(e) => {
              setPan(e.target.value.toUpperCase());
              if (fieldErrors.pan) setFieldErrors((prev) => ({ ...prev, pan: '' }));
            }}
            placeholder="e.g. ABCDE1234F"
            maxLength={10}
            leftIcon={<Hash className="w-4 h-4 text-[#555555]" />}
            error={fieldErrors.pan}
          />
        </div>

        {/* Contact Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="MOBILE NUMBER"
            value={mobile}
            onChange={(e) => setMobile(e.target.value)}
            placeholder="+91 98765 43210"
            leftIcon={<Phone className="w-4 h-4 text-[#555555]" />}
            error={fieldErrors.mobile}
          />

          <Input
            label="EMAIL ADDRESS"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="accounts@acmetraders.com"
            leftIcon={<Mail className="w-4 h-4 text-[#555555]" />}
            error={fieldErrors.email}
          />
        </div>

        {/* Location & Address */}
        <div className="space-y-4">
          <Input
            label="REGISTERED ADDRESS"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Plot No. 42, GIDC Electronic Estate"
            leftIcon={<MapPin className="w-4 h-4 text-[#555555]" />}
          />

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Input
              label="CITY"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Ahmedabad"
            />
            <Input
              label="STATE"
              value={state}
              onChange={(e) => setState(e.target.value)}
              placeholder="Gujarat"
            />
            <Input
              label="STATE CODE"
              value={stateCode}
              onChange={(e) => setStateCode(e.target.value)}
              placeholder="24"
            />
            <Input
              label="PINCODE"
              value={pincode}
              onChange={(e) => setPincode(e.target.value)}
              placeholder="380015"
            />
          </div>
        </div>

        {/* Filing Preferences & Status */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[#E5E5E5]">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#111111] mb-1.5">
              FILING FREQUENCY
            </label>
            <select
              value={filingFrequency}
              onChange={(e) => setFilingFrequency(e.target.value as 'monthly' | 'quarterly')}
              className="w-full bg-[#FAFAFA] text-xs text-[#111111] font-medium rounded-xl border border-[#E5E5E5] p-3 outline-none focus:border-black cursor-pointer"
            >
              <option value="monthly">Monthly GSTR-1 Filer</option>
              <option value="quarterly">Quarterly QRMP Filer</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#111111] mb-1.5">
              CLIENT STATUS
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as 'active' | 'inactive')}
              className="w-full bg-[#FAFAFA] text-xs text-[#111111] font-medium rounded-xl border border-[#E5E5E5] p-3 outline-none focus:border-black cursor-pointer"
            >
              <option value="active">Active Client</option>
              <option value="inactive">Inactive Client</option>
            </select>
          </div>
        </div>

        {/* Modal Buttons */}
        <div className="pt-4 border-t border-[#E5E5E5] flex items-center justify-end gap-3">
          <Button type="button" variant="outline" size="md" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="md" isLoading={isLoading}>
            {isEditing ? 'Save Client Changes' : 'Create Client Record'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
