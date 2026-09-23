import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import {
  FileText,
  Tag,
  Receipt,
  FileSpreadsheet,
  Plus,
  Search,
  Filter,
  Download,
  Printer,
  Eye,
  MoreVertical,
  RotateCcw,
  ExternalLink,
  X,
  CheckCircle2,
  Calendar,
  Layers,
  Building,
  User,
  MapPin,
  Truck,
  ShieldCheck,
  Check,
  Ban,
  Clock,
  ArrowRight,
  Sparkles,
  AlertCircle,
  AlertTriangle,
  Trash2,
  DollarSign
} from 'lucide-react';
import { useAdminData } from '../../context/AdminDataContext';
import { AdminDocument, DocumentType, DocumentStatus } from '../../types/admin';
import { Barcode } from '../../components/Barcode';
import './DocumentCenterView.css';

interface DocumentCenterViewProps {
  onOpenShipmentDetail?: (trackingNumber: string) => void;
  onSelectView?: (view: any) => void;
}

/**
 * Waits for every <img> inside a container (the company logo on every document "paper", plus
 * the signature/stamp image) to actually finish loading before proceeding. This is what was
 * missing before: the PDF export and print handlers only waited a fixed, arbitrary delay
 * (50-300ms) after mounting the paper and hoped that was enough time for images to load —
 * fine on a fast connection, but the logo would silently come out blank in the exported PDF
 * whenever it wasn't loaded in time (a slow connection, a cold cache, a restrictive network).
 * Waiting on the images' own load/error events instead makes this correct regardless of
 * network speed. `error` also resolves (not rejects) so one broken image can't hang the whole
 * export forever; the 4s cap is a last-resort safety net for an image that never fires either
 * event for some reason.
 */
function waitForImagesToLoad(container: HTMLElement): Promise<void> {
  const imgs = Array.from(container.querySelectorAll('img'));
  return Promise.all(
    imgs.map(img => {
      if (img.complete && img.naturalWidth > 0) return Promise.resolve();
      return new Promise<void>(resolve => {
        const done = () => resolve();
        img.addEventListener('load', done, { once: true });
        img.addEventListener('error', done, { once: true });
        setTimeout(done, 4000);
      });
    })
  ).then(() => undefined);
}

export const DocumentCenterView: React.FC<DocumentCenterViewProps> = ({
  onOpenShipmentDetail,
  onSelectView
}) => {
  const { shipments, documents, generateDocument, regenerateDocument, updateDocumentStatus, updateDocumentPaymentStatus, deleteDocument, settings } = useAdminData();

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | DocumentType>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | DocumentStatus>('ALL');
  const [dateFilter, setDateFilter] = useState<string>('ALL');

  // Active Document Action / Menu State
  const [activeMenuDocId, setActiveMenuDocId] = useState<string | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<{ left: number; top: number; bottom: number; openUpward: boolean } | null>(null);
  const [previewDoc, setPreviewDoc] = useState<AdminDocument | null>(null);
  const [selectedVersionIndex, setSelectedVersionIndex] = useState<number>(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const paperRef = useRef<HTMLDivElement>(null);

  // Generate Document Modal State
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [genDocType, setGenDocType] = useState<DocumentType>('SHIPPING_LABEL');
  const [genShipmentTracking, setGenShipmentTracking] = useState<string>(shipments[0]?.trackingNumber || '');
  const [genInsuredValue, setGenInsuredValue] = useState<string>('');
  const [genInsuredValueTouched, setGenInsuredValueTouched] = useState(false);

  // Regenerate Modal State
  const [regenerateDocTarget, setRegenerateDocTarget] = useState<AdminDocument | null>(null);
  const [regenNotes, setRegenNotes] = useState<string>('Updated with revised shipment parameters.');

  // Delete Confirmation Modal State
  const [deleteDocTarget, setDeleteDocTarget] = useState<AdminDocument | null>(null);

  // Live Summary Statistics (Real database counts)
  const stats = useMemo(() => {
    return {
      total: documents.length,
      shippingLabels: documents.filter(d => d.docType === 'SHIPPING_LABEL').length,
      receipts: documents.filter(d => d.docType === 'RECEIPT').length,
      invoices: documents.filter(d => d.docType === 'INVOICE').length,
      bols: documents.filter(d => d.docType === 'BOL').length,
      insuranceCerts: documents.filter(d => d.docType === 'INSURANCE').length
    };
  }, [documents]);

  // Filtered Document List
  const filteredDocuments = useMemo(() => {
    return documents.filter(doc => {
      const term = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !term ||
        doc.id.toLowerCase().includes(term) ||
        doc.shipmentTracking.toLowerCase().includes(term) ||
        doc.senderName.toLowerCase().includes(term) ||
        (doc.senderCompany && doc.senderCompany.toLowerCase().includes(term)) ||
        doc.recipientName.toLowerCase().includes(term) ||
        (doc.recipientCompany && doc.recipientCompany.toLowerCase().includes(term)) ||
        doc.cargoDescription.toLowerCase().includes(term) ||
        doc.title.toLowerCase().includes(term);

      const matchesType = typeFilter === 'ALL' || doc.docType === typeFilter;
      const matchesStatus = statusFilter === 'ALL' || doc.status === statusFilter;

      let matchesDate = true;
      if (dateFilter === 'TODAY' || dateFilter === 'THIS_MONTH') {
        const parsed = new Date(doc.createdDate);
        if (!isNaN(parsed.getTime())) {
          const now = new Date();
          matchesDate = dateFilter === 'TODAY'
            ? parsed.toDateString() === now.toDateString()
            : parsed.getFullYear() === now.getFullYear() && parsed.getMonth() === now.getMonth();
        }
      }

      return matchesSearch && matchesType && matchesStatus && matchesDate;
    });
  }, [documents, searchTerm, typeFilter, statusFilter, dateFilter]);

  // Helper for Document Type Icon & Labels
  const getDocTypeMeta = (type: DocumentType) => {
    switch (type) {
      case 'SHIPPING_LABEL':
        return {
          icon: <Tag size={16} className="text-blue" />,
          label: 'Shipping Label',
          badgeClass: 'badge-type-label'
        };
      case 'RECEIPT':
        return {
          icon: <Receipt size={16} className="text-emerald" />,
          label: 'Shipment Receipt',
          badgeClass: 'badge-type-receipt'
        };
      case 'INVOICE':
        return {
          icon: <FileText size={16} className="text-indigo" />,
          label: 'Invoice',
          badgeClass: 'badge-type-invoice'
        };
      case 'BOL':
        return {
          icon: <FileSpreadsheet size={16} className="text-amber" />,
          label: 'Bill of Lading',
          badgeClass: 'badge-type-bol'
        };
      case 'INSURANCE':
        return {
          icon: <ShieldCheck size={16} className="text-purple" />,
          label: 'Insurance Certificate',
          badgeClass: 'badge-type-insurance'
        };
      default:
        return {
          icon: <FileText size={16} className="text-slate" />,
          label: type || 'Document',
          badgeClass: 'badge-type-label'
        };
    }
  };

  // Helper: derive a real freight sort-zone tag from the recipient's own ZIP/state
  // (freight carriers genuinely route by the leading ZIP digit) instead of a fixed placeholder
  const getZoneTag = (doc: AdminDocument) => {
    const zip = doc.recipientZip || '';
    const region = zip.trim().charAt(0) || '0';
    const state = doc.recipientState || '—';
    return `ZONE ${region} · ${state}`;
  };

  // Helper for Status Badge
  const renderStatusBadge = (status: DocumentStatus) => {
    switch (status) {
      case 'GENERATED':
        return <span className="doc-status-badge badge-generated"><Check size={12} /> Generated</span>;
      case 'UPDATED':
        return <span className="doc-status-badge badge-updated"><Clock size={12} /> Updated (v2+)</span>;
      case 'CANCELLED':
        return <span className="doc-status-badge badge-cancelled"><Ban size={12} /> Cancelled</span>;
      default:
        return <span className="doc-status-badge badge-generated"><Check size={12} /> {String(status).replace(/_/g, ' ')}</span>;
    }
  };

  // Handlers
  const openGenerateModal = () => {
    setGenInsuredValueTouched(false);
    setShowGenerateModal(true);
  };

  const closeMenu = () => {
    setActiveMenuDocId(null);
    setMenuAnchor(null);
  };

  // Suggest the insured value from the selected shipment's declared value, but never
  // overwrite a value the admin has deliberately typed in for this generation session
  useEffect(() => {
    if (genInsuredValueTouched) return;
    const s = shipments.find(sh => sh.trackingNumber === genShipmentTracking);
    setGenInsuredValue(s?.declaredValue ? String(s.declaredValue) : '1000');
  }, [genShipmentTracking, shipments, genInsuredValueTouched]);

  // Close the actions menu on scroll/resize so it never lingers at a stale, disconnected position
  useEffect(() => {
    if (!activeMenuDocId) return;
    const handleDismiss = () => closeMenu();
    window.addEventListener('scroll', handleDismiss, true);
    window.addEventListener('resize', handleDismiss);
    return () => {
      window.removeEventListener('scroll', handleDismiss, true);
      window.removeEventListener('resize', handleDismiss);
    };
  }, [activeMenuDocId]);

  const handleOpenPreview = (doc: AdminDocument) => {
    setPreviewDoc(doc);
    setSelectedVersionIndex(0);
    closeMenu();
  };

  const handlePrint = (doc: AdminDocument) => {
    setPreviewDoc(doc);
    closeMenu();
    setTimeout(async () => {
      // Wait for the logo (and stamp, on insurance certs) to actually finish loading before
      // handing off to the browser's print engine — same fix as the PDF export below.
      if (paperRef.current) {
        await waitForImagesToLoad(paperRef.current);
      }
      window.print();
    }, 200);
  };

  const handleDownloadPdf = async (doc: AdminDocument) => {
    closeMenu();
    const alreadyOpen = previewDoc?.id === doc.id;
    if (!alreadyOpen) {
      setPreviewDoc(doc);
    }
    setToastMessage(`Preparing PDF for ${doc.id}...`);

    // Give the paper a moment to mount/render before snapshotting it
    await new Promise(resolve => setTimeout(resolve, alreadyOpen ? 50 : 300));

    const paperEl = paperRef.current;
    if (!paperEl) {
      setToastMessage(`Could not generate PDF for ${doc.id}. Please try again.`);
      setTimeout(() => setToastMessage(null), 3500);
      return;
    }

    // The fixed delay above only gives the DOM a moment to mount — it does NOT guarantee the
    // logo (or stamp image) has actually finished downloading and decoding. html2canvas
    // snapshots whatever's on screen at the instant it's called, so a not-yet-loaded image
    // silently came out blank in the exported PDF. Waiting on the images' own load events
    // instead makes this correct regardless of connection speed.
    await waitForImagesToLoad(paperEl);

    try {
      const canvas = await html2canvas(paperEl, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true
      });
      const imgData = canvas.toDataURL('image/jpeg', 0.92);
      const pdf = new jsPDF({
        orientation: canvas.width >= canvas.height ? 'landscape' : 'portrait',
        unit: 'px',
        format: [canvas.width, canvas.height]
      });
      pdf.addImage(imgData, 'JPEG', 0, 0, canvas.width, canvas.height);
      pdf.save(`${doc.id}.pdf`);
      setToastMessage(`Downloaded ${doc.id}.pdf`);
    } catch (err) {
      console.error('[PDF] Failed to generate PDF:', err);
      setToastMessage(`Failed to generate PDF for ${doc.id}. Please try again.`);
    }
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleTriggerRegenerate = (doc: AdminDocument) => {
    setRegenerateDocTarget(doc);
    setRegenNotes(`Regenerated with latest consignment parameters on ${new Date().toLocaleDateString('en-US')}.`);
    closeMenu();
  };

  const handleConfirmRegenerate = () => {
    if (!regenerateDocTarget) return;
    const updated = regenerateDocument(regenerateDocTarget.id, regenNotes);
    if (updated) {
      setToastMessage(`Document ${updated.id} regenerated successfully to Version ${updated.version}!`);
      setRegenerateDocTarget(null);
      if (previewDoc && previewDoc.id === updated.id) {
        setPreviewDoc(updated);
      }
      setTimeout(() => setToastMessage(null), 3500);
    }
  };

  const handleTriggerDelete = (doc: AdminDocument) => {
    setDeleteDocTarget(doc);
    closeMenu();
  };

  const handleConfirmDelete = () => {
    if (!deleteDocTarget) return;
    const deletedId = deleteDocTarget.id;
    deleteDocument(deletedId);
    setToastMessage(`Document ${deletedId} has been permanently deleted.`);
    setDeleteDocTarget(null);
    if (previewDoc && previewDoc.id === deletedId) {
      setPreviewDoc(null);
    }
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleToggleCancel = (doc: AdminDocument) => {
    // Restoring a cancelled document previously always reset it to 'GENERATED', even if it
    // had already been regenerated one or more times before being cancelled — silently
    // erasing the fact that it was on a revised version and showing it as if it were still
    // the untouched original. Restore to 'UPDATED' when it has real revision history.
    const newStatus: DocumentStatus = doc.status === 'CANCELLED'
      ? (doc.version > 1 ? 'UPDATED' : 'GENERATED')
      : 'CANCELLED';
    updateDocumentStatus(doc.id, newStatus);
    setToastMessage(`Document ${doc.id} status changed to ${newStatus}.`);
    closeMenu();
    if (previewDoc && previewDoc.id === doc.id) {
      setPreviewDoc({ ...previewDoc, status: newStatus });
    }
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleTogglePaymentStatus = (doc: AdminDocument) => {
    const newPaymentStatus: 'PAID' | 'PENDING' = doc.charges?.paymentStatus === 'PAID' ? 'PENDING' : 'PAID';
    updateDocumentPaymentStatus(doc.id, newPaymentStatus);
    setToastMessage(`Document ${doc.id} marked as ${newPaymentStatus}.`);
    closeMenu();
    if (previewDoc && previewDoc.id === doc.id && previewDoc.charges) {
      setPreviewDoc({ ...previewDoc, charges: { ...previewDoc.charges, paymentStatus: newPaymentStatus } });
    }
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Generate Document Form Submission
  const handleGenerateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const selectedShipment = shipments.find(s => s.trackingNumber === genShipmentTracking) || shipments[0];
    if (!selectedShipment) return;

    // Randomize per-document BOL equipment details so every generated BOL doesn't
    // show the identical trailer/seal number and handling notes regardless of cargo.
    const trailerLetter = String.fromCharCode(65 + Math.floor(Math.random() * 26));
    const bolTrailerNumber = `TR-${Math.floor(1000 + Math.random() * 9000)}-${trailerLetter}`;
    const bolSealNumber = `SL-${Math.floor(10000 + Math.random() * 90000)}`;
    const specialInstructionsPool = [
      'Handle with care. Protect from moisture and extreme temperature.',
      'Fragile contents. Do not stack additional freight on top of this shipment.',
      'Keep upright at all times. This side up.',
      'Liftgate required at destination. Call recipient 30 minutes prior to arrival.',
      'Standard ground handling. No special accessorial requirements.',
      'Non-stackable freight. Secure load to prevent shifting in transit.'
    ];
    const bolSpecialInstructions = specialInstructionsPool[Math.floor(Math.random() * specialInstructionsPool.length)];

    // Insured value is admin-editable (defaults to the shipment's declared cargo value);
    // premium and deductible are derived from it so they stay internally consistent.
    const insuredValue = genDocType === 'INSURANCE'
      ? Math.max(0, parseFloat(genInsuredValue) || 0)
      : (selectedShipment.declaredValue || 850);
    const premiumAmount = Math.max(25, Math.round(insuredValue * 0.0065 * 100) / 100);
    const deductible = Math.max(250, Math.round(insuredValue * 0.02));

    let title = 'Official Shipping Document';
    if (genDocType === 'SHIPPING_LABEL') title = 'Commercial Master Shipping Label';
    else if (genDocType === 'RECEIPT') title = 'Customer Shipment Receipt & Manifest';
    else if (genDocType === 'INVOICE') title = 'Commercial Logistics Invoice';
    else if (genDocType === 'BOL') title = 'Uniform Straight Bill of Lading (BOL)';
    else if (genDocType === 'INSURANCE') title = 'Certificate of Cargo Insurance';

    const newDoc = generateDocument({
      docType: genDocType,
      title,
      shipmentTracking: selectedShipment.trackingNumber,
      senderName: selectedShipment.sender.name,
      senderCompany: selectedShipment.sender.company || '',
      senderAddress: selectedShipment.sender.addressLine || '350 5th Avenue',
      senderCity: selectedShipment.origin.city,
      senderState: selectedShipment.origin.state,
      senderZip: selectedShipment.sender.postalCode || '10001',
      senderPhone: selectedShipment.sender.phone || '(212) 555-0148',
      senderEmail: selectedShipment.sender.email || '',
      recipientName: selectedShipment.recipient.name,
      recipientCompany: selectedShipment.recipient.company || '',
      recipientAddress: selectedShipment.recipient.addressLine || '742 Evergreen Terrace',
      recipientCity: selectedShipment.destination.city,
      recipientState: selectedShipment.destination.state,
      recipientZip: selectedShipment.recipient.postalCode || '90021',
      recipientPhone: selectedShipment.recipient.phone || '(310) 555-0892',
      recipientEmail: selectedShipment.recipient.email || '',
      cargoDescription: selectedShipment.cargoDescription || 'Commercial Freight Cargo',
      shipmentType: selectedShipment.shipmentType || 'Parcel',
      service: selectedShipment.service || 'Standard',
      weightLbs: selectedShipment.totalWeightLbs || 45,
      pieces: selectedShipment.totalPieces || 1,
      dimensions: selectedShipment.dimensions ? `${selectedShipment.dimensions.length} × ${selectedShipment.dimensions.width} × ${selectedShipment.dimensions.height} in` : '72 × 24 × 18 in',
      declaredValue: insuredValue,
      // Only attach a charges/payment record to document types that actually have a
      // "payment status" concept and somewhere to show it — a Shipping Label never carries
      // billing info in real life, and Insurance already has its own dedicated
      // premium/deductible fields (a second, unrelated "$350 PAID" total on top of that was
      // just confusing). Every type used to get one regardless, silently carrying data no
      // part of the UI could ever display or toggle.
      charges: (genDocType === 'RECEIPT' || genDocType === 'INVOICE' || genDocType === 'BOL') ? {
        baseAmount: 300,
        oversizeFee: selectedShipment.totalWeightLbs > 30 ? 35 : 0,
        specialHandlingFee: 15,
        totalAmount: 350,
        paymentStatus: 'PAID',
        paidDate: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        paymentMethod: 'Corporate Freight Account'
      } : undefined,
      bolCarrier: 'Duolingo Express Dedicated Linehaul Division',
      bolTrailerNumber,
      bolSealNumber,
      bolSpecialInstructions,
      insurerName: 'Meridian Marine & Cargo Underwriters',
      policyNumber: 'MCC-2026-778120',
      coverageType: 'All-Risk Cargo Coverage — Institute Cargo Clauses (A)',
      deductible,
      premiumAmount
    });

    setShowGenerateModal(false);
    setToastMessage(`Successfully generated ${getDocTypeMeta(newDoc.docType).label} ${newDoc.id}!`);
    setPreviewDoc(newDoc);
    setTimeout(() => setToastMessage(null), 4000);
  };

  return (
    <div className="document-center-container animate-fade-in">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="doc-toast-notification animate-fade-in">
          <CheckCircle2 size={18} className="text-emerald" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* =========================================================================
          1. PAGE HEADER
          ========================================================================= */}
      <div className="doc-page-header">
        <div className="doc-header-titles">
          <h2>Document Center</h2>
          <p>Generate, view, print, and manage shipment documents from one place.</p>
        </div>

        <div className="doc-header-actions">
          <button
            className="btn-generate-doc-primary"
            onClick={() => openGenerateModal()}
          >
            <Plus size={16} />
            <span>+ Generate Document</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          2. SUMMARY CARDS (Live database counts)
          ========================================================================= */}
      <div className="doc-summary-cards-grid">
        <div
          className={`doc-summary-card ${typeFilter === 'SHIPPING_LABEL' ? 'active' : ''}`}
          onClick={() => setTypeFilter(typeFilter === 'SHIPPING_LABEL' ? 'ALL' : 'SHIPPING_LABEL')}
        >
          <div className="summary-card-icon-wrap icon-blue">
            <Tag size={20} />
          </div>
          <div className="summary-card-info">
            <span className="summary-card-label">Shipping Labels</span>
            <strong className="summary-card-count font-mono">{stats.shippingLabels}</strong>
          </div>
        </div>

        <div
          className={`doc-summary-card ${typeFilter === 'RECEIPT' ? 'active' : ''}`}
          onClick={() => setTypeFilter(typeFilter === 'RECEIPT' ? 'ALL' : 'RECEIPT')}
        >
          <div className="summary-card-icon-wrap icon-emerald">
            <Receipt size={20} />
          </div>
          <div className="summary-card-info">
            <span className="summary-card-label">Shipment Receipts</span>
            <strong className="summary-card-count font-mono">{stats.receipts}</strong>
          </div>
        </div>

        <div
          className={`doc-summary-card ${typeFilter === 'INVOICE' ? 'active' : ''}`}
          onClick={() => setTypeFilter(typeFilter === 'INVOICE' ? 'ALL' : 'INVOICE')}
        >
          <div className="summary-card-icon-wrap icon-indigo">
            <FileText size={20} />
          </div>
          <div className="summary-card-info">
            <span className="summary-card-label">Invoices</span>
            <strong className="summary-card-count font-mono">{stats.invoices}</strong>
          </div>
        </div>

        <div
          className={`doc-summary-card ${typeFilter === 'BOL' ? 'active' : ''}`}
          onClick={() => setTypeFilter(typeFilter === 'BOL' ? 'ALL' : 'BOL')}
        >
          <div className="summary-card-icon-wrap icon-amber">
            <FileSpreadsheet size={20} />
          </div>
          <div className="summary-card-info">
            <span className="summary-card-label">Bills of Lading</span>
            <strong className="summary-card-count font-mono">{stats.bols}</strong>
          </div>
        </div>

        <div
          className={`doc-summary-card ${typeFilter === 'INSURANCE' ? 'active' : ''}`}
          onClick={() => setTypeFilter(typeFilter === 'INSURANCE' ? 'ALL' : 'INSURANCE')}
        >
          <div className="summary-card-icon-wrap icon-purple">
            <ShieldCheck size={20} />
          </div>
          <div className="summary-card-info">
            <span className="summary-card-label">Insurance Certificates</span>
            <strong className="summary-card-count font-mono">{stats.insuranceCerts}</strong>
          </div>
        </div>
      </div>

      {/* =========================================================================
          3. DOCUMENT TYPE NAVIGATION TABS
          ========================================================================= */}
      <div className="doc-type-nav-tabs">
        <button
          className={`doc-nav-tab ${typeFilter === 'ALL' ? 'active' : ''}`}
          onClick={() => setTypeFilter('ALL')}
        >
          <span>All Documents</span>
          <span className="tab-count-pill">{stats.total}</span>
        </button>

        <button
          className={`doc-nav-tab ${typeFilter === 'SHIPPING_LABEL' ? 'active' : ''}`}
          onClick={() => setTypeFilter('SHIPPING_LABEL')}
        >
          <Tag size={15} />
          <span>Shipping Labels</span>
          <span className="tab-count-pill">{stats.shippingLabels}</span>
        </button>

        <button
          className={`doc-nav-tab ${typeFilter === 'RECEIPT' ? 'active' : ''}`}
          onClick={() => setTypeFilter('RECEIPT')}
        >
          <Receipt size={15} />
          <span>Shipment Receipts</span>
          <span className="tab-count-pill">{stats.receipts}</span>
        </button>

        <button
          className={`doc-nav-tab ${typeFilter === 'INVOICE' ? 'active' : ''}`}
          onClick={() => setTypeFilter('INVOICE')}
        >
          <FileText size={15} />
          <span>Invoices</span>
          <span className="tab-count-pill">{stats.invoices}</span>
        </button>

        <button
          className={`doc-nav-tab ${typeFilter === 'BOL' ? 'active' : ''}`}
          onClick={() => setTypeFilter('BOL')}
        >
          <FileSpreadsheet size={15} />
          <span>Bills of Lading</span>
          <span className="tab-count-pill">{stats.bols}</span>
        </button>

        <button
          className={`doc-nav-tab ${typeFilter === 'INSURANCE' ? 'active' : ''}`}
          onClick={() => setTypeFilter('INSURANCE')}
        >
          <ShieldCheck size={15} />
          <span>Insurance Certificates</span>
          <span className="tab-count-pill">{stats.insuranceCerts}</span>
        </button>
      </div>

      {/* =========================================================================
          4. SEARCH AND FILTER BAR
          ========================================================================= */}
      <div className="doc-search-filter-card">
        <div className="doc-search-input-wrap">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            className="doc-search-input font-mono"
            placeholder="Search by document number, tracking number, sender, recipient..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button className="clear-search-btn" onClick={() => setSearchTerm('')}>
              <X size={14} />
            </button>
          )}
        </div>

        <div className="doc-filters-cluster">
          {/* Status Filter */}
          <div className="filter-group">
            <label>Status:</label>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as any)}
              className="filter-select"
            >
              <option value="ALL">All Statuses</option>
              <option value="GENERATED">Generated</option>
              <option value="UPDATED">Updated</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          {/* Date Filter */}
          <div className="filter-group">
            <label>Date:</label>
            <select
              value={dateFilter}
              onChange={e => setDateFilter(e.target.value)}
              className="filter-select"
            >
              <option value="ALL">All Dates</option>
              <option value="TODAY">Today</option>
              <option value="THIS_MONTH">This Month</option>
            </select>
          </div>
        </div>
      </div>

      {/* =========================================================================
          5. MAIN DOCUMENT LIST & TABLE
          ========================================================================= */}
      <div className="doc-table-card">
        <div className="table-responsive-wrapper">
          <table className="doc-master-table">
            <thead>
              <tr>
                <th style={{ width: '22%' }}>Document</th>
                <th style={{ width: '16%' }}>Document Number</th>
                <th style={{ width: '16%' }}>Shipment</th>
                <th style={{ width: '20%' }}>Related Party</th>
                <th style={{ width: '12%' }}>Created</th>
                <th style={{ width: '10%' }}>Status</th>
                <th style={{ width: '14%', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredDocuments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="empty-docs-row">
                    <div className="empty-docs-box">
                      <FileText size={36} className="empty-icon" />
                      <h4>No documents yet</h4>
                      <p>Documents generated from your shipments will appear here.</p>
                      <button
                        className="btn-empty-generate"
                        onClick={() => openGenerateModal()}
                      >
                        <Plus size={14} />
                        <span>Create Document</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredDocuments.map(doc => {
                  const meta = getDocTypeMeta(doc.docType);
                  return (
                    <tr key={doc.id} className={`doc-table-row ${doc.status === 'CANCELLED' ? 'row-cancelled' : ''}`}>
                      {/* Document Type & Title */}
                      <td>
                        <div className="doc-identity-cell">
                          <div className={`doc-type-icon-pill ${meta.badgeClass}`}>
                            {meta.icon}
                          </div>
                          <div className="doc-identity-text">
                            <strong className="doc-title-text">{doc.title}</strong>
                            <span className="doc-type-sub font-mono">{meta.label} · PDF</span>
                          </div>
                        </div>
                      </td>

                      {/* Document Number */}
                      <td>
                        <div className="doc-number-cell font-mono">
                          <strong>{doc.id}</strong>
                          {doc.version > 1 && (
                            <span className="version-pill font-mono">v{doc.version}</span>
                          )}
                        </div>
                      </td>

                      {/* Shipment Tracking */}
                      <td>
                        <div className="shipment-link-cell font-mono">
                          <span className="tracking-text">{doc.shipmentTracking}</span>
                          <span className="cargo-sub">{doc.cargoDescription}</span>
                        </div>
                      </td>

                      {/* Related Party (Sender -> Recipient) */}
                      <td>
                        <div className="parties-route-cell">
                          <div className="parties-line">
                            <span className="party-name sender">{doc.senderName}</span>
                            <ArrowRight size={12} className="party-arrow" />
                            <span className="party-name recipient">{doc.recipientName}</span>
                          </div>
                          <div className="route-sub">
                            {doc.senderCity}, {doc.senderState} → {doc.recipientCity}, {doc.recipientState}
                          </div>
                        </div>
                      </td>

                      {/* Created Date */}
                      <td>
                        <div className="created-date-cell">
                          <span className="date-main">{doc.createdDate}</span>
                          <span className="file-size-sub font-mono">{doc.fileSize || '180 KB'}</span>
                        </div>
                      </td>

                      {/* Status */}
                      <td>
                        {renderStatusBadge(doc.status)}
                      </td>

                      {/* Actions */}
                      <td>
                        <div className="actions-cluster-cell">
                          <button
                            className="btn-view-doc-primary"
                            onClick={() => handleOpenPreview(doc)}
                            title="View Document"
                          >
                            <Eye size={14} />
                            <span>View</span>
                          </button>

                          <div className="dropdown-action-wrap">
                            <button
                              className="btn-dots-menu"
                              onClick={e => {
                                e.stopPropagation();
                                if (activeMenuDocId === doc.id) {
                                  closeMenu();
                                  return;
                                }
                                const rect = e.currentTarget.getBoundingClientRect();
                                const estimatedMenuHeight = onOpenShipmentDetail ? 270 : 230;
                                const openUpward = window.innerHeight - rect.bottom < estimatedMenuHeight && rect.top > estimatedMenuHeight;
                                setMenuAnchor({ left: rect.right, top: rect.bottom, bottom: rect.top, openUpward });
                                setActiveMenuDocId(doc.id);
                              }}
                              title="More actions"
                            >
                              <MoreVertical size={16} />
                            </button>

                            {activeMenuDocId === doc.id && menuAnchor && createPortal(
                              <>
                                <div className="doc-menu-backdrop" onClick={closeMenu} />
                                <div
                                  className="doc-action-menu-dropdown animate-fade-in"
                                  style={{
                                    position: 'fixed',
                                    left: Math.max(8, menuAnchor.left - 175),
                                    top: menuAnchor.openUpward ? undefined : menuAnchor.top + 6,
                                    bottom: menuAnchor.openUpward ? (window.innerHeight - menuAnchor.bottom + 6) : undefined
                                  }}
                                  onClick={e => e.stopPropagation()}
                                >
                                  <button
                                    className="dropdown-item"
                                    onClick={() => handleOpenPreview(doc)}
                                  >
                                    <Eye size={14} />
                                    <span>View Document</span>
                                  </button>
                                  <button
                                    className="dropdown-item"
                                    onClick={() => handleDownloadPdf(doc)}
                                  >
                                    <Download size={14} />
                                    <span>Download PDF</span>
                                  </button>
                                  <button
                                    className="dropdown-item"
                                    onClick={() => handlePrint(doc)}
                                  >
                                    <Printer size={14} />
                                    <span>Print</span>
                                  </button>
                                  <button
                                    className="dropdown-item"
                                    onClick={() => handleTriggerRegenerate(doc)}
                                  >
                                    <RotateCcw size={14} />
                                    <span>Regenerate</span>
                                  </button>
                                  {onOpenShipmentDetail && (
                                    <button
                                      className="dropdown-item"
                                      onClick={() => {
                                        closeMenu();
                                        onOpenShipmentDetail(doc.shipmentTracking);
                                      }}
                                    >
                                      <ExternalLink size={14} />
                                      <span>View Shipment</span>
                                    </button>
                                  )}
                                  {doc.charges && (doc.docType === 'RECEIPT' || doc.docType === 'INVOICE' || doc.docType === 'BOL') && (
                                    <button
                                      className="dropdown-item"
                                      onClick={() => handleTogglePaymentStatus(doc)}
                                    >
                                      <DollarSign size={14} />
                                      <span>Mark as {doc.charges.paymentStatus === 'PAID' ? 'Pending' : 'Paid'}</span>
                                    </button>
                                  )}
                                  <div className="dropdown-divider" />
                                  <button
                                    className={`dropdown-item ${doc.status === 'CANCELLED' ? 'text-emerald' : 'text-danger'}`}
                                    onClick={() => handleToggleCancel(doc)}
                                  >
                                    {doc.status === 'CANCELLED' ? (
                                      <>
                                        <CheckCircle2 size={14} />
                                        <span>Restore Document</span>
                                      </>
                                    ) : (
                                      <>
                                        <Ban size={14} />
                                        <span>Cancel Document</span>
                                      </>
                                    )}
                                  </button>
                                  <button
                                    className="dropdown-item text-danger"
                                    onClick={() => handleTriggerDelete(doc)}
                                  >
                                    <Trash2 size={14} />
                                    <span>Delete Document</span>
                                  </button>
                                </div>
                              </>,
                              document.body
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer */}
        <div className="doc-table-footer">
          <span>Showing <strong>{filteredDocuments.length}</strong> of <strong>{documents.length}</strong> system documents</span>
          <span className="footer-sub">Official Regulatory & Consignment Records</span>
        </div>
      </div>

      {/* =========================================================================
          6. DOCUMENT PREVIEW MODAL / PANEL
          ========================================================================= */}
      {previewDoc && (
        <div className="doc-preview-modal-backdrop" onClick={() => setPreviewDoc(null)}>
          <div className="doc-preview-modal-container animate-fade-in" onClick={e => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="preview-modal-header">
              <div className="header-left">
                <div className="doc-tag-pill">
                  {getDocTypeMeta(previewDoc.docType).icon}
                  <span>{getDocTypeMeta(previewDoc.docType).label}</span>
                </div>
                <h3 className="font-mono">{previewDoc.id}</h3>
                {previewDoc.version > 1 && (
                  <span className="preview-version-pill font-mono">
                    Version {previewDoc.version} — Current
                  </span>
                )}
              </div>

              <div className="header-actions-right">
                <button
                  className="btn-preview-action"
                  onClick={() => handleDownloadPdf(previewDoc)}
                >
                  <Download size={15} />
                  <span>Download PDF</span>
                </button>
                <button
                  className="btn-preview-action"
                  onClick={() => handlePrint(previewDoc)}
                >
                  <Printer size={15} />
                  <span>Print</span>
                </button>
                <button
                  className="btn-preview-action"
                  onClick={() => handleTriggerRegenerate(previewDoc)}
                >
                  <RotateCcw size={15} />
                  <span>Regenerate</span>
                </button>
                {previewDoc.charges && (previewDoc.docType === 'RECEIPT' || previewDoc.docType === 'INVOICE' || previewDoc.docType === 'BOL') && (
                  <button
                    className="btn-preview-action"
                    onClick={() => handleTogglePaymentStatus(previewDoc)}
                  >
                    <DollarSign size={15} />
                    <span>Mark as {previewDoc.charges.paymentStatus === 'PAID' ? 'Pending' : 'Paid'}</span>
                  </button>
                )}
                <button
                  className="btn-preview-action btn-preview-delete"
                  onClick={() => handleTriggerDelete(previewDoc)}
                >
                  <Trash2 size={15} />
                  <span>Delete</span>
                </button>
                <button
                  className="btn-preview-close"
                  onClick={() => setPreviewDoc(null)}
                  title="Close preview"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Version History Subdeck (if updated) */}
            {previewDoc.versionHistory && previewDoc.versionHistory.length > 1 && (
              <div className="preview-version-history-bar">
                <div className="version-bar-title">
                  <Clock size={13} className="text-blue" />
                  <span>Audit Trail Version History:</span>
                </div>
                <div className="version-chips-list">
                  {previewDoc.versionHistory.map((vh, i) => (
                    <span key={i} className={`v-chip font-mono ${i === 0 ? 'current' : 'previous'}`}>
                      v{vh.version} ({vh.createdDate}) · {vh.notes || 'Document modified'}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Modal Document Body (The Paper Sheet) */}
            <div className="preview-sheet-scroll-container">
              {/* =================================================================
                  DOCUMENT TYPE 1: SHIPPING LABEL (4x6 Real Courier Layout)
                  ================================================================= */}
              {previewDoc.docType === 'SHIPPING_LABEL' && (
                <div className="shipping-label-paper" ref={paperRef}>
                  {/* Label Top Bar */}
                  <div className="lbl-top-row">
                    <div className="lbl-brand-block">
                      <img src="/logo.png" alt="Duolingo Express" className="doc-preview-logo-img" />
                      <span className="lbl-brand-sub font-mono">PRIORITY AIR & GROUND COURIER NETWORK</span>
                    </div>
                    <div className="lbl-service-stamp font-mono">
                      <span>SERVICE CLASS</span>
                      <strong>{previewDoc.service.toUpperCase()}</strong>
                    </div>
                  </div>

                  {/* Shipment Tracking Box */}
                  <div className="lbl-tracking-masthead">
                    <div className="lbl-tracking-label">SHIPMENT WAYBILL NUMBER</div>
                    <div className="lbl-tracking-code font-mono">{previewDoc.shipmentTracking}</div>
                  </div>

                  {/* Sender & Recipient Section */}
                  <div className="lbl-parties-grid">
                    {/* FROM */}
                    <div className="lbl-from-box">
                      <span className="lbl-role-tag font-mono">FROM / SHIPPER</span>
                      <strong className="lbl-party-name">{previewDoc.senderName}</strong>
                      {previewDoc.senderCompany && <div className="lbl-company">{previewDoc.senderCompany}</div>}
                      <div className="lbl-address">{previewDoc.senderAddress}</div>
                      <div className="lbl-city-state font-bold">{previewDoc.senderCity}, {previewDoc.senderState} {previewDoc.senderZip}</div>
                      <div className="lbl-phone font-mono">{previewDoc.senderPhone}</div>
                      {previewDoc.senderEmail && <div className="lbl-email font-mono">{previewDoc.senderEmail}</div>}
                    </div>

                    {/* TO */}
                    <div className="lbl-to-box">
                      <div className="lbl-to-head">
                        <span className="lbl-role-tag font-mono">SHIP TO / CONSIGNEE</span>
                        <span className="lbl-hub-route-tag font-mono">{getZoneTag(previewDoc)}</span>
                      </div>
                      <strong className="lbl-to-name">{previewDoc.recipientName}</strong>
                      {previewDoc.recipientCompany && <div className="lbl-to-company">{previewDoc.recipientCompany}</div>}
                      <div className="lbl-to-address">{previewDoc.recipientAddress}</div>
                      <div className="lbl-to-city-state">{previewDoc.recipientCity}, {previewDoc.recipientState} {previewDoc.recipientZip}</div>
                      <div className="lbl-to-phone font-mono">{previewDoc.recipientPhone}</div>
                      {previewDoc.recipientEmail && <div className="lbl-to-email font-mono">{previewDoc.recipientEmail}</div>}
                    </div>
                  </div>

                  {/* Cargo Specifications Strip */}
                  <div className="lbl-specs-strip">
                    <div className="lbl-spec-col">
                      <span className="s-lbl">SHIPMENT TYPE</span>
                      <strong className="s-val">{previewDoc.shipmentType}</strong>
                    </div>
                    <div className="lbl-spec-col">
                      <span className="s-lbl">WEIGHT</span>
                      <strong className="s-val font-mono">{previewDoc.weightLbs} LB</strong>
                    </div>
                    <div className="lbl-spec-col">
                      <span className="s-lbl">PIECES</span>
                      <strong className="s-val font-mono">{previewDoc.pieces} / {previewDoc.pieces}</strong>
                    </div>
                    <div className="lbl-spec-col">
                      <span className="s-lbl">DIMENSIONS</span>
                      <strong className="s-val font-mono">{previewDoc.dimensions || '72 × 24 × 18 in'}</strong>
                    </div>
                  </div>

                  {/* Contents Description */}
                  <div className="lbl-contents-bar font-mono">
                    <span>CARGO: <strong>{previewDoc.cargoDescription}</strong></span>
                  </div>

                  {/* BARCODE SECTION (Code 128 ONLY - NO QR CODES) */}
                  <div className="lbl-barcode-area">
                    <div className="barcode-render-box">
                      <Barcode
                        value={previewDoc.shipmentTracking}
                        width={2.4}
                        height={75}
                        fontSize={14}
                      />
                    </div>
                    <div className="barcode-sub-text font-mono">
                      TSA CARRIER VERIFIED · CODE 128 AIR-GROUND MANIFEST
                    </div>
                  </div>

                  {/* Label Footer */}
                  <div className="lbl-footer-row font-mono">
                    <span>DOC ID: <strong className="lbl-footer-id">{previewDoc.id}</strong></span>
                    <span>ISSUED: {previewDoc.createdDate}</span>
                    <span>PAGE 1 OF 1</span>
                  </div>
                </div>
              )}

              {/* =================================================================
                  DOCUMENT TYPE 2: SHIPMENT RECEIPT
                  ================================================================= */}
              {previewDoc.docType === 'RECEIPT' && (
                <div className="receipt-paper" ref={paperRef}>
                  {/* Receipt Header */}
                  <div className="rec-header">
                    <div className="rec-brand">
                      <img src="/logo.png" alt="Duolingo Express" className="doc-preview-logo-img" />
                      <p>Official Shipment Receipt & Intake Manifest</p>
                    </div>
                    <div className="rec-meta font-mono">
                      <div className="m-row"><span>Receipt No:</span> <strong className="rec-meta-id">{previewDoc.id}</strong></div>
                      <div className="m-row"><span>Date:</span> <strong>{previewDoc.createdDate}</strong></div>
                      <div className="m-row">
                        <span>Status:</span>
                        <strong className={`rec-status-pill ${previewDoc.charges?.paymentStatus === 'PENDING' ? 'pending' : 'paid'}`}>
                          {previewDoc.charges?.paymentStatus === 'PENDING' ? 'PENDING' : 'PAID'}
                        </strong>
                      </div>
                    </div>
                  </div>

                  <div className="rec-divider" />

                  {/* Shipment Information Card */}
                  <div className="rec-section-title">CONSIGNMENT & ROUTE SUMMARY</div>
                  <div className="rec-summary-grid">
                    <div className="rec-card">
                      <span className="rec-card-lbl">SENDER / SHIPPER</span>
                      <strong>{previewDoc.senderName}</strong>
                      {previewDoc.senderCompany && <div className="rec-card-company">{previewDoc.senderCompany}</div>}
                      <div>{previewDoc.senderAddress}</div>
                      <div>{previewDoc.senderCity}, {previewDoc.senderState} {previewDoc.senderZip}</div>
                      {previewDoc.senderPhone && <div className="rec-card-contact font-mono">{previewDoc.senderPhone}</div>}
                      {previewDoc.senderEmail && <div className="rec-card-contact font-mono">{previewDoc.senderEmail}</div>}
                    </div>
                    <div className="rec-card">
                      <span className="rec-card-lbl">DESTINATION RECIPIENT</span>
                      <strong>{previewDoc.recipientName}</strong>
                      {previewDoc.recipientCompany && <div className="rec-card-company">{previewDoc.recipientCompany}</div>}
                      <div>{previewDoc.recipientAddress}</div>
                      <div>{previewDoc.recipientCity}, {previewDoc.recipientState} {previewDoc.recipientZip}</div>
                      {previewDoc.recipientPhone && <div className="rec-card-contact font-mono">{previewDoc.recipientPhone}</div>}
                      {previewDoc.recipientEmail && <div className="rec-card-contact font-mono">{previewDoc.recipientEmail}</div>}
                    </div>
                  </div>

                  {/* Cargo Specifications */}
                  <div className="rec-section-title">CARGO SPECIFICATIONS</div>
                  <div className="table-responsive-wrapper">
                    <table className="rec-items-table">
                      <thead>
                        <tr>
                          <th>Item Description</th>
                          <th>Type</th>
                          <th>Service</th>
                          <th>Weight</th>
                          <th>Pieces</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td><strong>{previewDoc.cargoDescription}</strong></td>
                          <td>{previewDoc.shipmentType}</td>
                          <td>{previewDoc.service}</td>
                          <td className="font-mono">{previewDoc.weightLbs} lb</td>
                          <td className="font-mono">{previewDoc.pieces}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Financial Charges */}
                  <div className="rec-section-title">TARIFF & CHARGES BREAKDOWN</div>
                  <div className="rec-charges-container">
                    <div className="charge-row">
                      <span>Base Linehaul Transportation ({previewDoc.senderCity} → {previewDoc.recipientCity})</span>
                      <strong className="font-mono">${(previewDoc.charges?.baseAmount || 300).toFixed(2)}</strong>
                    </div>
                    {previewDoc.charges?.oversizeFee ? (
                      <div className="charge-row">
                        <span>Oversize Cargo Handling Surcharge</span>
                        <strong className="font-mono">${previewDoc.charges.oversizeFee.toFixed(2)}</strong>
                      </div>
                    ) : null}
                    {previewDoc.charges?.specialHandlingFee ? (
                      <div className="charge-row">
                        <span>Special Handling & Fragile Protocol</span>
                        <strong className="font-mono">${previewDoc.charges.specialHandlingFee.toFixed(2)}</strong>
                      </div>
                    ) : null}
                    <div className={`charge-row total-row ${previewDoc.charges?.paymentStatus === 'PENDING' ? 'pending' : ''}`}>
                      <span>TOTAL CHARGES {previewDoc.charges?.paymentStatus === 'PENDING' ? 'DUE' : 'PAID'} (USD)</span>
                      <strong className={`font-mono ${previewDoc.charges?.paymentStatus === 'PENDING' ? 'text-amber-strong' : 'text-emerald'}`}>${(previewDoc.charges?.totalAmount || 350).toFixed(2)}</strong>
                    </div>
                  </div>

                  {/* Barcode & Signature Footprint */}
                  <div className="rec-footer-barcode-box">
                    <Barcode
                      value={previewDoc.shipmentTracking}
                      width={2.0}
                      height={50}
                      fontSize={12}
                    />
                    <div className="rec-footer-note font-mono">
                      TRACKING REF: {previewDoc.shipmentTracking} · THANK YOU FOR SHIPPING WITH DUOLINGO EXPRESS
                    </div>
                  </div>
                </div>
              )}

              {/* =================================================================
                  DOCUMENT TYPE 3: INVOICE
                  ================================================================= */}
              {previewDoc.docType === 'INVOICE' && (
                <div className="invoice-paper" ref={paperRef}>
                  {/* Invoice Header */}
                  <div className="inv-top-bar">
                    <div className="inv-brand">
                      <img src="/logo.png" alt="Duolingo Express" className="doc-preview-logo-img" />
                      <p>Freight & Logistics Financial Services</p>
                      <small className="font-mono">100 Logistics Blvd, Suite 500, New York, NY 10001</small>
                    </div>
                    <div className="inv-masthead-title">
                      <h1>INVOICE</h1>
                      <div className="inv-id-badge font-mono">{previewDoc.id}</div>
                    </div>
                  </div>

                  <div className="inv-divider" />

                  {/* Parties Info Grid */}
                  <div className="inv-parties-grid">
                    <div className="inv-parties-left">
                      <div className="inv-billed-to">
                        <span className="inv-section-tag">BILLED TO (CUSTOMER)</span>
                        <strong className="inv-party-name">{previewDoc.senderName}</strong>
                        {previewDoc.senderCompany && <div className="inv-company">{previewDoc.senderCompany}</div>}
                        <div>{previewDoc.senderAddress}</div>
                        <div>{previewDoc.senderCity}, {previewDoc.senderState} {previewDoc.senderZip}</div>
                        <div className="font-mono">{previewDoc.senderPhone}</div>
                        {previewDoc.senderEmail && <div className="font-mono">{previewDoc.senderEmail}</div>}
                      </div>

                      <div className="inv-ship-to">
                        <span className="inv-section-tag">SHIP TO (CONSIGNEE)</span>
                        <strong className="inv-party-name">{previewDoc.recipientName}</strong>
                        {previewDoc.recipientCompany && <div className="inv-company">{previewDoc.recipientCompany}</div>}
                        <div>{previewDoc.recipientAddress}</div>
                        <div>{previewDoc.recipientCity}, {previewDoc.recipientState} {previewDoc.recipientZip}</div>
                        <div className="font-mono">{previewDoc.recipientPhone}</div>
                        {previewDoc.recipientEmail && <div className="font-mono">{previewDoc.recipientEmail}</div>}
                      </div>
                    </div>

                    <div className="inv-meta-card font-mono">
                      <div className="inv-m-row">
                        <span>Invoice Date:</span>
                        <strong>{previewDoc.createdDate}</strong>
                      </div>
                      <div className="inv-m-row">
                        <span>Shipment Waybill:</span>
                        <strong>{previewDoc.shipmentTracking}</strong>
                      </div>
                      <div className="inv-m-row">
                        <span>Service Speed:</span>
                        <strong>{previewDoc.service}</strong>
                      </div>
                      <div className="inv-m-row">
                        <span>Payment Status:</span>
                        <strong className={previewDoc.charges?.paymentStatus === 'PENDING' ? 'text-amber-strong' : 'text-emerald'}>
                          {previewDoc.charges?.paymentStatus === 'PENDING' ? 'PAYMENT DUE' : 'PAID IN FULL'}
                        </strong>
                      </div>
                    </div>
                  </div>

                  {/* Consignment Details Table */}
                  <div className="inv-items-section">
                    <table className="inv-items-table">
                      <thead>
                        <tr>
                          <th>Item Description</th>
                          <th>Route Corridor</th>
                          <th>Weight</th>
                          <th>Pieces</th>
                          <th style={{ textAlign: 'right' }}>Amount (USD)</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>
                            <strong>{previewDoc.cargoDescription}</strong>
                            <div className="text-xs text-slate">{previewDoc.dimensions || '72 × 24 × 18 in'}</div>
                          </td>
                          <td>{previewDoc.senderCity}, {previewDoc.senderState} → {previewDoc.recipientCity}, {previewDoc.recipientState}</td>
                          <td className="font-mono">{previewDoc.weightLbs} lb</td>
                          <td className="font-mono">{previewDoc.pieces}</td>
                          <td className="font-mono" style={{ textAlign: 'right' }}>
                            ${(previewDoc.charges?.baseAmount || 300).toFixed(2)}
                          </td>
                        </tr>
                        {previewDoc.charges?.oversizeFee ? (
                          <tr>
                            <td>Oversize Handling Surcharge</td>
                            <td>Dimension compliance surcharge</td>
                            <td className="font-mono">-</td>
                            <td className="font-mono">-</td>
                            <td className="font-mono" style={{ textAlign: 'right' }}>
                              ${previewDoc.charges.oversizeFee.toFixed(2)}
                            </td>
                          </tr>
                        ) : null}
                        {previewDoc.charges?.specialHandlingFee ? (
                          <tr>
                            <td>Special Accessorial Handling Fee</td>
                            <td>Non-stackable fragile care</td>
                            <td className="font-mono">-</td>
                            <td className="font-mono">-</td>
                            <td className="font-mono" style={{ textAlign: 'right' }}>
                              ${previewDoc.charges.specialHandlingFee.toFixed(2)}
                            </td>
                          </tr>
                        ) : null}
                      </tbody>
                    </table>
                  </div>

                  {/* Totals Summary */}
                  <div className="inv-totals-wrap">
                    <div className="inv-totals-box">
                      <div className="t-row">
                        <span>Subtotal:</span>
                        <strong className="font-mono">${(previewDoc.charges?.totalAmount || 350).toFixed(2)}</strong>
                      </div>
                      <div className="t-row">
                        <span>Tax / Tariff (0%):</span>
                        <strong className="font-mono">$0.00</strong>
                      </div>
                      <div className="t-row grand-total">
                        <span>{previewDoc.charges?.paymentStatus === 'PENDING' ? 'TOTAL DUE:' : 'TOTAL AMOUNT:'}</span>
                        <strong className={`font-mono ${previewDoc.charges?.paymentStatus === 'PENDING' ? 'text-amber-strong' : 'text-emerald'}`}>${(previewDoc.charges?.totalAmount || 350).toFixed(2)} USD</strong>
                      </div>
                    </div>
                  </div>

                  {/* Invoice Footer Barcode */}
                  <div className="inv-footer-barcode">
                    <Barcode
                      value={previewDoc.shipmentTracking}
                      width={1.8}
                      height={45}
                      fontSize={11}
                    />
                    <div className="font-mono text-xs text-slate mt-1">
                      INVOICE REF: {previewDoc.id} · AUTH REF: DXP-CORP-PAY-4091
                    </div>
                  </div>
                </div>
              )}

              {/* =================================================================
                  DOCUMENT TYPE 4: BILL OF LADING (BOL)
                  ================================================================= */}
              {previewDoc.docType === 'BOL' && (
                <div className="bol-paper" ref={paperRef}>
                  {/* BOL Header Grid */}
                  <div className="bol-top-header">
                    <div className="bol-carrier-brand">
                      <img src="/logo.png" alt="Duolingo Express" className="doc-preview-logo-img" />
                      <span className="font-mono font-bold text-xs">UNIFORM STRAIGHT BILL OF LADING · ORIGINAL - NOT NEGOTIABLE</span>
                    </div>
                    <div className="bol-id-box font-mono">
                      <div className="b-row"><span>BOL NUMBER:</span> <strong className="bol-id-value">{previewDoc.id}</strong></div>
                      <div className="b-row"><span>SHIPMENT NO:</span> <strong>{previewDoc.shipmentTracking}</strong></div>
                      <div className="b-row"><span>DATE:</span> <strong>{previewDoc.createdDate}</strong></div>
                    </div>
                  </div>

                  {/* BOL Parties Section */}
                  <div className="bol-parties-container">
                    <div className="bol-party-cell">
                      <span className="bol-cell-label">SHIPPER / CONSIGNOR</span>
                      <strong className="bol-name">{previewDoc.senderName}</strong>
                      {previewDoc.senderCompany && <div>{previewDoc.senderCompany}</div>}
                      <div>{previewDoc.senderAddress}</div>
                      <div>{previewDoc.senderCity}, {previewDoc.senderState} {previewDoc.senderZip}</div>
                      <div className="font-mono text-xs">{previewDoc.senderPhone}</div>
                      {previewDoc.senderEmail && <div className="font-mono text-xs">{previewDoc.senderEmail}</div>}
                    </div>

                    <div className="bol-party-cell">
                      <span className="bol-cell-label">CONSIGNEE / SHIP TO</span>
                      <strong className="bol-name">{previewDoc.recipientName}</strong>
                      {previewDoc.recipientCompany && <div>{previewDoc.recipientCompany}</div>}
                      <div>{previewDoc.recipientAddress}</div>
                      <div>{previewDoc.recipientCity}, {previewDoc.recipientState} {previewDoc.recipientZip}</div>
                      <div className="font-mono text-xs">{previewDoc.recipientPhone}</div>
                      {previewDoc.recipientEmail && <div className="font-mono text-xs">{previewDoc.recipientEmail}</div>}
                    </div>
                  </div>

                  {/* Carrier & Equipment Details */}
                  <div className="bol-carrier-strip font-mono">
                    <div className="c-field"><span>CARRIER:</span> <strong>{previewDoc.bolCarrier || 'Duolingo Express Linehaul'}</strong></div>
                    <div className="c-field"><span>TRAILER NO:</span> <strong>{previewDoc.bolTrailerNumber || 'TR-4091-E'}</strong></div>
                    <div className="c-field"><span>SEAL NO:</span> <strong>{previewDoc.bolSealNumber || 'SL-99420'}</strong></div>
                  </div>

                  {/* Freight Commodity Grid */}
                  <div className="table-responsive-wrapper">
                    <table className="bol-freight-table">
                      <thead>
                        <tr>
                          <th>HANDLING UNITS</th>
                          <th>PACKAGE TYPE</th>
                          <th>DESCRIPTION OF ARTICLES & SPECIAL MARKS</th>
                          <th>WEIGHT (LBS)</th>
                          <th>DIMENSIONS</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="font-mono font-bold text-center">{previewDoc.pieces}</td>
                          <td>{previewDoc.shipmentType}</td>
                          <td>
                            <strong>{previewDoc.cargoDescription}</strong>
                          </td>
                          <td className="font-mono font-bold text-center">{previewDoc.weightLbs} lb</td>
                          <td className="font-mono text-center">{previewDoc.dimensions || '72 × 24 × 18 in'}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Special Handling Instructions */}
                  <div className="bol-instructions-box">
                    <span className="font-mono font-bold text-xs text-slate">SPECIAL HANDLING & ACCESSORIAL INSTRUCTIONS:</span>
                    <p className="bol-instruct-text">
                      {previewDoc.bolSpecialInstructions || 'Fragile automotive fiberglass. Do not double stack. Liftgate required at destination.'}
                    </p>
                  </div>

                  {/* Freight Charges — a standard BOL field (Prepaid/Collect terms). Every
                      BOL already carries real charges data computed at generation time; this
                      was previously never shown anywhere, so there was no way to see or mark
                      it paid short of opening the Receipt/Invoice for the same shipment. */}
                  {previewDoc.charges && (
                    <div className="rec-charges-container">
                      <div className="charge-row">
                        <span>FREIGHT CHARGES</span>
                        <strong className="font-mono">${(previewDoc.charges.baseAmount || 0).toFixed(2)}</strong>
                      </div>
                      {previewDoc.charges.oversizeFee ? (
                        <div className="charge-row">
                          <span>Oversize / Accessorial Fee</span>
                          <strong className="font-mono">${previewDoc.charges.oversizeFee.toFixed(2)}</strong>
                        </div>
                      ) : null}
                      {previewDoc.charges.specialHandlingFee ? (
                        <div className="charge-row">
                          <span>Special Handling Fee</span>
                          <strong className="font-mono">${previewDoc.charges.specialHandlingFee.toFixed(2)}</strong>
                        </div>
                      ) : null}
                      <div className={`charge-row total-row ${previewDoc.charges.paymentStatus === 'PENDING' ? 'pending' : ''}`}>
                        <span>FREIGHT TERMS: {previewDoc.charges.paymentStatus === 'PENDING' ? 'COLLECT' : 'PREPAID'}</span>
                        <strong className={`font-mono ${previewDoc.charges.paymentStatus === 'PENDING' ? 'text-amber-strong' : 'text-emerald'}`}>${(previewDoc.charges.totalAmount || 0).toFixed(2)}</strong>
                      </div>
                    </div>
                  )}

                  {/* Signature Certification Boxes */}
                  <div className="bol-signatures-row">
                    <div className="sig-box">
                      <span className="sig-label font-mono">SHIPPER CERTIFICATION & SIGNATURE</span>
                      <div className="sig-line">
                        <span className="signed-name font-mono">{previewDoc.senderName} (Authorized Signatory)</span>
                      </div>
                      <div className="sig-date font-mono">DATE: {previewDoc.createdDate}</div>
                    </div>

                    <div className="sig-box">
                      <span className="sig-label font-mono">CARRIER ACKNOWLEDGEMENT & RECEIPT</span>
                      <div className="sig-line">
                        <span className="signed-name font-mono">{settings.signatoryName || 'Duolingo Express Dispatch Officer'}</span>
                      </div>
                      {settings.signatoryTitle && <div className="ins-signatory-title font-mono">{settings.signatoryTitle}</div>}
                      <div className="sig-date font-mono">DATE: {previewDoc.createdDate}</div>
                    </div>

                    {settings.signatureStampUrl && (
                      <div className="ins-seal">
                        <img src={settings.signatureStampUrl} alt="Company stamp" className="ins-stamp-img" />
                      </div>
                    )}
                  </div>

                  {/* BOL Barcode */}
                  <div className="bol-barcode-center">
                    <Barcode
                      value={previewDoc.shipmentTracking}
                      width={2.2}
                      height={55}
                      fontSize={12}
                    />
                  </div>
                </div>
              )}

              {/* =================================================================
                  DOCUMENT TYPE 5: CERTIFICATE OF CARGO INSURANCE
                  ================================================================= */}
              {previewDoc.docType === 'INSURANCE' && (
                <div className="ins-paper" ref={paperRef}>
                  {/* Certificate Header */}
                  <div className="ins-top-header">
                    <div className="ins-brand">
                      <img src="/logo.png" alt="Duolingo Express" className="doc-preview-logo-img" />
                      <p>Cargo Insurance Arranged Through Duolingo Express Freight Services</p>
                    </div>
                    <div className="ins-id-box font-mono">
                      <div className="b-row"><span>CERTIFICATE NO:</span> <strong className="ins-id-value">{previewDoc.id}</strong></div>
                      <div className="b-row"><span>MASTER POLICY NO:</span> <strong>{previewDoc.policyNumber || 'MCC-2026-778120'}</strong></div>
                      <div className="b-row"><span>DATE ISSUED:</span> <strong>{previewDoc.createdDate}</strong></div>
                    </div>
                  </div>

                  <div className="ins-title-band">
                    <ShieldCheck size={18} className="text-purple" />
                    <span>CERTIFICATE OF CARGO INSURANCE</span>
                  </div>

                  {/* Certifying Statement */}
                  <p className="ins-certify-text">
                    This is to certify that insurance is effected under Master Policy No. <strong>{previewDoc.policyNumber || 'MCC-2026-778120'}</strong>, issued by <strong>{previewDoc.insurerName || 'Meridian Marine & Cargo Underwriters'}</strong>, on the cargo described below, and that this Certificate represents and takes the place of the Policy and conveys all the rights of the original policyholder for the purpose of collecting any loss or claim thereunder, subject to the terms, conditions, and exclusions of the original policy. Signed for and on behalf of {previewDoc.insurerName || 'Meridian Marine & Cargo Underwriters'} by an authorized agent of Duolingo Express Freight Services under binding open cover authority.
                  </p>

                  {/* Parties Section */}
                  <div className="ins-parties-container">
                    <div className="ins-party-cell">
                      <span className="ins-cell-label">ASSURED / SHIPPER</span>
                      <strong className="ins-name">{previewDoc.senderName}</strong>
                      {previewDoc.senderCompany && <div>{previewDoc.senderCompany}</div>}
                      <div>{previewDoc.senderAddress}</div>
                      <div>{previewDoc.senderCity}, {previewDoc.senderState} {previewDoc.senderZip}</div>
                    </div>
                    <div className="ins-party-cell">
                      <span className="ins-cell-label">CONSIGNEE</span>
                      <strong className="ins-name">{previewDoc.recipientName}</strong>
                      {previewDoc.recipientCompany && <div>{previewDoc.recipientCompany}</div>}
                      <div>{previewDoc.recipientAddress}</div>
                      <div>{previewDoc.recipientCity}, {previewDoc.recipientState} {previewDoc.recipientZip}</div>
                    </div>
                  </div>

                  {/* Conveyance & Transit Details */}
                  <div className="ins-transit-strip font-mono">
                    <div className="c-field"><span>WAYBILL / TRACKING NO:</span> <strong>{previewDoc.shipmentTracking}</strong></div>
                    <div className="c-field"><span>CONVEYANCE:</span> <strong>{previewDoc.bolCarrier || 'Duolingo Express Dedicated Linehaul'}</strong></div>
                    <div className="c-field"><span>ROUTE:</span> <strong>{previewDoc.senderCity}, {previewDoc.senderState} → {previewDoc.recipientCity}, {previewDoc.recipientState}</strong></div>
                  </div>

                  {/* Cargo Description Table */}
                  <div className="table-responsive-wrapper">
                    <table className="ins-cargo-table">
                      <thead>
                        <tr>
                          <th>DESCRIPTION OF INSURED CARGO</th>
                          <th>PACKAGE TYPE</th>
                          <th>WEIGHT</th>
                          <th>PIECES</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td><strong>{previewDoc.cargoDescription}</strong></td>
                          <td>{previewDoc.shipmentType}</td>
                          <td className="font-mono">{previewDoc.weightLbs} lb</td>
                          <td className="font-mono">{previewDoc.pieces}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Coverage & Sum Insured Panel */}
                  <div className="ins-coverage-panel">
                    <div className="ins-sum-insured-block">
                      <span className="ins-sum-label">TOTAL SUM INSURED</span>
                      <strong className="ins-sum-value font-mono">${(previewDoc.declaredValue || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                      <span className="ins-sum-sub">USD · Agreed Value Basis</span>
                    </div>
                    <div className="ins-coverage-details">
                      <div className="ins-cov-row">
                        <span>Coverage Type:</span>
                        <strong>{previewDoc.coverageType || 'All-Risk Cargo Coverage — Institute Cargo Clauses (A)'}</strong>
                      </div>
                      <div className="ins-cov-row">
                        <span>Deductible (Excess):</span>
                        <strong className="font-mono">${(previewDoc.deductible || 250).toLocaleString('en-US')}</strong>
                      </div>
                      <div className="ins-cov-row">
                        <span>Premium Paid:</span>
                        <strong className="font-mono text-emerald">${(previewDoc.premiumAmount || 25).toFixed(2)}</strong>
                      </div>
                      <div className="ins-cov-row">
                        <span>Transit Coverage:</span>
                        <strong>Warehouse-to-Warehouse</strong>
                      </div>
                    </div>
                  </div>

                  {/* Claims Notice */}
                  <div className="ins-claims-box">
                    <span className="font-mono font-bold text-xs text-slate">CLAIMS NOTICE:</span>
                    <p className="ins-claims-text">
                      In the event of loss or damage which may give rise to a claim under this insurance, immediate notice must be given to Duolingo Express Claims Department. Any claim must be supported by this Certificate in original form. Failure to comply with these conditions may prejudice the claim.
                    </p>
                  </div>

                  {/* Signature & Certification Seal */}
                  <div className="ins-signature-row">
                    <div className="ins-sig-block">
                      <span className="sig-label font-mono">AUTHORIZED REPRESENTATIVE</span>
                      <div className="sig-line">
                        <span className="signed-name font-mono">{settings.signatoryName || previewDoc.insurerName || 'Meridian Marine & Cargo Underwriters'}</span>
                      </div>
                      {settings.signatoryTitle && <div className="ins-signatory-title font-mono">{settings.signatoryTitle}</div>}
                      <div className="ins-signatory-onbehalf font-mono">for and on behalf of {previewDoc.insurerName || 'Meridian Marine & Cargo Underwriters'}</div>
                      <div className="sig-date font-mono">DATE: {previewDoc.createdDate}</div>
                      <p className="ins-void-note">This certificate is not valid unless countersigned by an authorized representative and is void if altered.</p>
                    </div>
                    <div className="ins-seal">
                      {settings.signatureStampUrl ? (
                        <img src={settings.signatureStampUrl} alt="Company stamp" className="ins-stamp-img" />
                      ) : (
                        <div className="ins-seal-ring">
                          <ShieldCheck size={22} />
                          <span>CERTIFIED</span>
                          <span className="ins-seal-sub">COVERAGE VERIFIED</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Barcode Footer */}
                  <div className="ins-barcode-center">
                    <Barcode
                      value={previewDoc.shipmentTracking}
                      width={2.0}
                      height={50}
                      fontSize={12}
                    />
                    <div className="ins-footer-note font-mono">
                      CERTIFICATE REF: {previewDoc.id} · UNDERWRITTEN BY {(previewDoc.insurerName || 'MERIDIAN MARINE & CARGO UNDERWRITERS').toUpperCase()}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          7. GENERATE DOCUMENT MODAL
          ========================================================================= */}
      {showGenerateModal && (
        <div className="doc-generate-modal-backdrop" onClick={() => setShowGenerateModal(false)}>
          <div className="doc-generate-modal-card animate-fade-in" onClick={e => e.stopPropagation()}>
            <div className="modal-top-bar">
              <div>
                <h3>Generate New Shipment Document</h3>
                <p>Create an official document from existing shipment telemetry.</p>
              </div>
              <button className="modal-close-btn" onClick={() => setShowGenerateModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleGenerateSubmit} className="generate-form-body">
              {/* Step 1: Select Document Type */}
              <div className="form-field-unit">
                <label className="form-field-label">1. Select Document Type</label>
                <div className="doc-type-radio-grid">
                  <label className={`doc-type-radio-card ${genDocType === 'SHIPPING_LABEL' ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="docType"
                      value="SHIPPING_LABEL"
                      checked={genDocType === 'SHIPPING_LABEL'}
                      onChange={() => setGenDocType('SHIPPING_LABEL')}
                    />
                    <Tag size={18} className="text-blue" />
                    <div>
                      <strong>Shipping Label</strong>
                      <span>Official 4x6 barcode label</span>
                    </div>
                  </label>

                  <label className={`doc-type-radio-card ${genDocType === 'RECEIPT' ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="docType"
                      value="RECEIPT"
                      checked={genDocType === 'RECEIPT'}
                      onChange={() => setGenDocType('RECEIPT')}
                    />
                    <Receipt size={18} className="text-emerald" />
                    <div>
                      <strong>Shipment Receipt</strong>
                      <span>Intake manifest & charges</span>
                    </div>
                  </label>

                  <label className={`doc-type-radio-card ${genDocType === 'INVOICE' ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="docType"
                      value="INVOICE"
                      checked={genDocType === 'INVOICE'}
                      onChange={() => setGenDocType('INVOICE')}
                    />
                    <FileText size={18} className="text-indigo" />
                    <div>
                      <strong>Invoice</strong>
                      <span>Corporate billing declaration</span>
                    </div>
                  </label>

                  <label className={`doc-type-radio-card ${genDocType === 'BOL' ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="docType"
                      value="BOL"
                      checked={genDocType === 'BOL'}
                      onChange={() => setGenDocType('BOL')}
                    />
                    <FileSpreadsheet size={18} className="text-amber" />
                    <div>
                      <strong>Bill of Lading</strong>
                      <span>Freight & carrier manifest</span>
                    </div>
                  </label>

                  <label className={`doc-type-radio-card ${genDocType === 'INSURANCE' ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="docType"
                      value="INSURANCE"
                      checked={genDocType === 'INSURANCE'}
                      onChange={() => setGenDocType('INSURANCE')}
                    />
                    <ShieldCheck size={18} className="text-purple" />
                    <div>
                      <strong>Insurance Certificate</strong>
                      <span>Cargo coverage & policy proof</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Step 2: Select Associated Shipment */}
              <div className="form-field-unit">
                <label className="form-field-label">2. Select Associated Shipment</label>
                <select
                  value={genShipmentTracking}
                  onChange={e => setGenShipmentTracking(e.target.value)}
                  className="modal-shipment-select font-mono"
                  required
                >
                  {shipments.map(s => (
                    <option key={s.trackingNumber} value={s.trackingNumber}>
                      {s.trackingNumber} — {s.sender.name} → {s.recipient.name} ({s.cargoDescription || 'Parcel'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Step 3: Set Insured Value (Insurance Certificate only) */}
              {genDocType === 'INSURANCE' && (
                <div className="form-field-unit">
                  <label className="form-field-label">3. Set Insured Value (Sum Insured)</label>
                  <div className="insured-value-input-wrap">
                    <span className="insured-value-prefix">$</span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      className="insured-value-input font-mono"
                      value={genInsuredValue}
                      onChange={e => {
                        setGenInsuredValue(e.target.value);
                        setGenInsuredValueTouched(true);
                      }}
                      placeholder="1000"
                      required
                    />
                    <span className="insured-value-suffix">USD</span>
                  </div>
                  <p className="insured-value-hint">
                    Defaults to the shipment's declared cargo value. Adjust to set the actual sum insured — premium is calculated automatically at 0.65% of this amount ($25 minimum).
                  </p>
                </div>
              )}

              {/* Auto-populated Preview Summary */}
              {(() => {
                const targetShipment = shipments.find(s => s.trackingNumber === genShipmentTracking) || shipments[0];
                return targetShipment ? (
                  <div className="auto-populated-preview-card">
                    <div className="preview-card-header">
                      <Sparkles size={14} className="text-blue" />
                      <span>Auto-Populated Telemetry Data (No Manual Typing)</span>
                    </div>
                    <div className="preview-data-grid font-mono">
                      <div><span>Shipper:</span> <strong>{targetShipment.sender.name} ({targetShipment.origin.city}, {targetShipment.origin.state})</strong></div>
                      <div><span>Consignee:</span> <strong>{targetShipment.recipient.name} ({targetShipment.destination.city}, {targetShipment.destination.state})</strong></div>
                      <div><span>Cargo:</span> <strong>{targetShipment.cargoDescription}</strong></div>
                      <div><span>Weight / Pieces:</span> <strong>{targetShipment.totalWeightLbs} lb · {targetShipment.totalPieces} pcs</strong></div>
                    </div>
                  </div>
                ) : null;
              })()}

              <div className="modal-actions-footer">
                <button
                  type="button"
                  className="btn-cancel-modal"
                  onClick={() => setShowGenerateModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-submit-generate"
                >
                  <Plus size={16} />
                  <span>Generate Document</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          8. REGENERATE DOCUMENT MODAL
          ========================================================================= */}
      {regenerateDocTarget && (
        <div className="doc-generate-modal-backdrop" onClick={() => setRegenerateDocTarget(null)}>
          <div className="doc-generate-modal-card animate-fade-in" onClick={e => e.stopPropagation()}>
            <div className="modal-top-bar">
              <div>
                <h3>Regenerate Document</h3>
                <p>Create Version {regenerateDocTarget.version + 1} for {regenerateDocTarget.id}.</p>
              </div>
              <button className="modal-close-btn" onClick={() => setRegenerateDocTarget(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="generate-form-body">
              <div className="auto-populated-preview-card">
                <div className="preview-card-header">
                  <Clock size={14} className="text-blue" />
                  <span>Version Preservation</span>
                </div>
                <p className="text-xs text-slate m-0">
                  Version {regenerateDocTarget.version} will be preserved in the document history. Version {regenerateDocTarget.version + 1} will become the new current version.
                </p>
              </div>

              <div className="form-field-unit">
                <label className="form-field-label">Reason / Revision Notes</label>
                <input
                  type="text"
                  value={regenNotes}
                  onChange={e => setRegenNotes(e.target.value)}
                  placeholder="e.g. Updated cargo description and routing corridor"
                  className="modal-shipment-select"
                  required
                />
              </div>

              <div className="modal-actions-footer">
                <button
                  type="button"
                  className="btn-cancel-modal"
                  onClick={() => setRegenerateDocTarget(null)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn-submit-generate"
                  onClick={handleConfirmRegenerate}
                >
                  <RotateCcw size={16} />
                  <span>Regenerate Version {regenerateDocTarget.version + 1}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          9. DELETE DOCUMENT CONFIRMATION MODAL
          ========================================================================= */}
      {deleteDocTarget && (
        <div className="doc-delete-modal-backdrop" onClick={() => setDeleteDocTarget(null)}>
          <div className="doc-delete-modal-card animate-fade-in" onClick={e => e.stopPropagation()}>
            <div className="doc-delete-modal-top">
              <div className="doc-delete-warning-halo">
                <AlertTriangle size={24} className="text-danger" />
              </div>
              <button type="button" className="modal-close-btn" onClick={() => setDeleteDocTarget(null)} title="Cancel">
                <X size={18} />
              </button>
            </div>

            <div className="doc-delete-modal-content">
              <h3 className="doc-delete-modal-title">Delete Document?</h3>
              <p className="doc-delete-modal-desc">
                Are you sure you want to permanently delete <strong className="font-mono">{deleteDocTarget.id}</strong>? This action cannot be undone{deleteDocTarget.version > 1 ? ', and all prior versions in its history will be removed as well.' : '.'}
              </p>

              <div className="doc-delete-preview-card">
                <div className="doc-delete-preview-row">
                  <span className="doc-delete-preview-label">DOCUMENT</span>
                  <strong className="doc-delete-preview-val">{deleteDocTarget.title}</strong>
                </div>
                <div className="doc-delete-preview-row">
                  <span className="doc-delete-preview-label">SHIPMENT</span>
                  <span className="doc-delete-preview-val font-mono">{deleteDocTarget.shipmentTracking}</span>
                </div>
              </div>
            </div>

            <div className="modal-actions-footer">
              <button type="button" className="btn-cancel-modal" onClick={() => setDeleteDocTarget(null)}>
                Cancel
              </button>
              <button type="button" className="btn-confirm-delete-doc" onClick={handleConfirmDelete}>
                <Trash2 size={15} />
                <span>Delete Document</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
