import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import type { Client } from '../../services/clientService';
import { clientService } from '../../services/clientService';
import { ClientFormModal } from './ClientFormModal';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { Modal } from '../../components/ui/Modal';
import {
  ArrowLeft,
  MapPin,
  Edit,
  Trash2,
  ArrowRight,
  ShoppingCart,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';

export const ClientDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [client, setClient] = useState<Client | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchClientDetails = async () => {
    if (!id) return;
    setIsLoading(true);
    setError('');

    try {
      const data = await clientService.getClient(Number(id));
      setClient(data);
      setIsLoading(false);
    } catch (err: any) {
      setIsLoading(false);
      setError(err.message || 'Client record not found or access denied.');
    }
  };

  useEffect(() => {
    fetchClientDetails();
  }, [id]);

  const handleDeleteClient = async () => {
    if (!client) return;
    setIsDeleting(true);

    try {
      await clientService.deleteClient(client.id);
      setIsDeleting(false);
      setIsDeleteModalOpen(false);
      navigate('/clients');
    } catch (err: any) {
      setIsDeleting(false);
      alert(err.message || 'Failed to remove client record.');
    }
  };

  if (isLoading) {
    return (
      <div className="py-24 text-center font-mono text-xs text-[#666666]">
        <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        Loading client record...
      </div>
    );
  }

  if (error || !client) {
    return (
      <div className="py-16 max-w-xl mx-auto px-4 text-center">
        <div className="p-6 bg-red-50 border border-red-200 rounded-2xl text-red-900 space-y-3 font-mono text-xs">
          <AlertTriangle className="w-8 h-8 text-[#DC2626] mx-auto" />
          <p className="font-bold text-sm">{error || 'Client record not found.'}</p>
          <p className="text-[11px] text-[#666666]">The client record may have been removed or belongs to another user account.</p>
        </div>
        <div className="mt-6">
          <Link to="/clients">
            <Button variant="outline" size="md" leftIcon={<ArrowLeft className="w-4 h-4" />}>
              Back to Clients List
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            to="/clients"
            className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-[#666666] hover:text-black transition-colors mb-2 group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Back to Clients List
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#111111] tracking-tight">{client.trade_name}</h1>
            <Badge variant={client.status === 'active' ? 'success' : 'neutral'}>
              {client.status.toUpperCase()}
            </Badge>
          </div>
          <p className="text-xs text-[#666666] mt-0.5 font-mono">{client.party_name}</p>
        </div>

        {/* Action Header Buttons */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Edit className="w-3.5 h-3.5" />}
            onClick={() => setIsEditModalOpen(true)}
          >
            Edit Client
          </Button>

          <Button
            variant="danger"
            size="sm"
            leftIcon={<Trash2 className="w-3.5 h-3.5" />}
            onClick={() => setIsDeleteModalOpen(true)}
          >
            Delete
          </Button>

          <Button
            variant="primary"
            size="sm"
            rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
            onClick={() => navigate(`/dashboard/ecommerce-gstr1?client_id=${client.id}`)}
          >
            Open GSTR-1
          </Button>
        </div>
      </div>

      {/* Main Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Comprehensive GST Info */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6 space-y-6">
            <h3 className="font-mono text-xs font-bold text-[#111111] uppercase tracking-wider border-b border-[#E5E5E5] pb-3 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-black" /> TAX IDENTIFICATION & REGISTRATION DETAILS
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
              <div>
                <span className="text-[10px] text-[#666666] uppercase block font-mono font-bold">GSTIN / UIN</span>
                <span className="font-mono font-extrabold text-base text-black mt-0.5 block">{client.gstin}</span>
              </div>

              <div>
                <span className="text-[10px] text-[#666666] uppercase block font-mono font-bold">PERMANENT ACCOUNT NUMBER (PAN)</span>
                <span className="font-mono font-extrabold text-base text-black mt-0.5 block">{client.pan || 'N/A'}</span>
              </div>

              <div>
                <span className="text-[10px] text-[#666666] uppercase block font-mono font-bold">STATE & STATE CODE</span>
                <span className="font-medium text-black mt-0.5 block">
                  {client.state || 'N/A'} (State Code: {client.state_code || 'N/A'})
                </span>
              </div>

              <div>
                <span className="text-[10px] text-[#666666] uppercase block font-mono font-bold">GSTR-1 FILING FREQUENCY</span>
                <span className="font-mono font-bold text-black mt-0.5 block uppercase">
                  {client.filing_frequency} FILER
                </span>
              </div>
            </div>
          </Card>

          <Card className="p-6 space-y-6">
            <h3 className="font-mono text-xs font-bold text-[#111111] uppercase tracking-wider border-b border-[#E5E5E5] pb-3 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-black" /> CONTACT & ADDRESS INFORMATION
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
              <div>
                <span className="text-[10px] text-[#666666] uppercase block font-mono font-bold">MOBILE NUMBER</span>
                <span className="font-mono font-medium text-black mt-0.5 block">{client.mobile || 'Not Provided'}</span>
              </div>

              <div>
                <span className="text-[10px] text-[#666666] uppercase block font-mono font-bold">EMAIL ADDRESS</span>
                <span className="font-mono font-medium text-black mt-0.5 block">{client.email || 'Not Provided'}</span>
              </div>

              <div className="sm:col-span-2">
                <span className="text-[10px] text-[#666666] uppercase block font-mono font-bold">REGISTERED BUSINESS ADDRESS</span>
                <p className="text-xs text-black leading-relaxed mt-0.5 font-medium">
                  {client.address || 'No physical address recorded.'}
                  {client.city ? `, ${client.city}` : ''}
                  {client.state ? `, ${client.state}` : ''}
                  {client.pincode ? ` - ${client.pincode}` : ''}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Right 1 Col: Quick Workflow Actions & Timestamps */}
        <div className="space-y-6">
          <Card className="p-6 space-y-4">
            <h4 className="font-mono text-xs font-bold text-[#111111] uppercase tracking-wider flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-black" /> GSTR-1 QUICK LAUNCH
            </h4>
            <p className="text-xs text-[#555555] leading-relaxed">
              Launch the E-Commerce GSTR-1 engine pre-configured for {client.trade_name}.
            </p>
            <Button
              variant="primary"
              size="md"
              className="w-full"
              rightIcon={<ArrowRight className="w-4 h-4" />}
              onClick={() => navigate(`/dashboard/ecommerce-gstr1?client_id=${client.id}`)}
            >
              Open GSTR-1 Workflow
            </Button>
          </Card>

          <Card className="p-6 space-y-3 font-mono text-xs">
            <span className="text-[10px] text-[#666666] uppercase block font-bold">RECORD METADATA</span>
            <div className="flex items-center justify-between text-[#555555] border-b border-[#E5E5E5] pb-2">
              <span>CREATED ON</span>
              <span className="text-black font-bold">{new Date(client.created_at).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center justify-between text-[#555555]">
              <span>LAST UPDATED</span>
              <span className="text-black font-bold">{new Date(client.updated_at).toLocaleDateString()}</span>
            </div>
          </Card>
        </div>
      </div>

      {/* Edit Modal */}
      <ClientFormModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        clientToEdit={client}
        onSuccess={fetchClientDetails}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="CONFIRM REMOVE CLIENT"
        maxWidth="md"
      >
        <div className="space-y-4 font-mono text-xs">
          <p className="text-sm text-[#111111] font-bold">
            Are you sure you want to remove <span className="underline">{client.trade_name}</span> ({client.gstin}) from your client list?
          </p>
          <p className="text-[#666666]">
            This record will be removed from your active client management dashboard. Associated historical reports remain preserved.
          </p>

          <div className="pt-4 border-t border-[#E5E5E5] flex items-center justify-end gap-3">
            <Button variant="outline" size="md" onClick={() => setIsDeleteModalOpen(false)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button variant="danger" size="md" isLoading={isDeleting} onClick={handleDeleteClient}>
              Remove Client Record
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
