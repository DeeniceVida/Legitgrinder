
import React, { useState, useMemo, useEffect } from 'react';
import {
  LayoutDashboard, ShoppingBag, Users, Plus, RefreshCcw, Calendar, Clock, Box,
  MessageSquare, CreditCard, Trash2, Edit3,
  Info, ChevronRight, X, FileText, BarChart3, TrendingUp, Save, Search,
  User, List, Download, Mail, ExternalLink, Filter, MapPin, Truck,
  Activity, DollarSign, Smartphone, History, Image as ImageIcon, Tag, AlignLeft, Check, Printer,
  ShieldCheck, MessageCircle, Youtube, Book, Lock, ScrollText, Star, Building2 as Buildings, Armchair,
  AlertTriangle
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar
} from 'recharts';
import * as XLSX from 'xlsx';
import { syncBackMarketPrices } from '../services/scraper';
import { seedFullInventory } from '../services/syncLinks';
import { WHATSAPP_NUMBER } from '../constants';
import { supabase } from '../lib/supabase';
import { calculateFinalPrice, updatePricelistItem, updateConsultation, createProduct, updateProduct, deleteProduct, createBlog, updateBlog, deleteBlog, updateClient, deleteClient, fetchSourcingRequests, updateSourcingStatus, updateInvoiceStatus as updateInvoiceStatusInDB, updateInvoicePaymentStatus, updateInvoiceDetails, fetchVisitCount, createEBook, updateEBook, deleteEBook, fetchEBooks, createManualInvoice, deleteInvoice, sendInvoiceEmail, markReviewRequested, notifyBackInStock, fetchWaitlistCounts,
  ShippingAgent, fetchShippingAgents, createShippingAgent, deleteShippingAgent, setInvoiceShippingAgent,
  fetchInventoryProducts } from '../services/supabaseData';
import {
  PricelistItem, Product, OrderStatus, getOrderProgress,
  Consultation, ConsultationStatus, Availability, Invoice, InvoiceItem, PaymentStatus,
  BlogPost, FAQItem, Client, ProductVariation, SourcingRequest, EBook, AdBanner
} from '../types';
import { fetchBanners, addBanner, updateBanner, deleteBanner } from '../services/adBanners';
import SafeImage from '../components/SafeImage';
import BusinessCard from '../components/BusinessCard';
import CatalogAgentPanel from '../components/CatalogAgentPanel';
import MessageAgentPanel from '../components/MessageAgentPanel';
import LogisticsPanel from '../components/LogisticsPanel';
import GroupBuysTab from '../components/GroupBuysTab';
import ReportsTab from '../components/ReportsTab';
import MonitorsTab from '../components/MonitorsTab';
import ChairsTab from '../components/ChairsTab';
import EnquiriesPanel from '../components/EnquiriesPanel';
import SupervisorPanel from '../components/SupervisorPanel';
import { UserGear } from '@phosphor-icons/react';
import type { SupervisorAction } from '../services/supervisor';
import { generateDocumentAttachment } from '../utils/receiptDocument';
import { normalizeKenyanPhone } from '../utils/phone';
import { amountFieldInWords } from '../utils/numberToWords';
import {
  CorporateQuote, CorporateCategory, fetchCorporateQuotes, fetchCorporateCategories,
  upsertCorporateCategory, setCorporateQuoteStatus
} from '../services/corporate';
import { computeAttention } from '../utils/logistics';
import type { MessageIntent } from '../services/messageAgent';



interface AdminDashboardProps {
  blogs: BlogPost[];
  faqs: FAQItem[];
  onUpdateBlogs: (blogs: BlogPost[]) => void;
  onUpdateFaqs: (faqs: FAQItem[]) => void;
  pricelist: PricelistItem[];
  onUpdatePricelist: (list: PricelistItem[]) => void;
  clients: Client[];
  onUpdateClients: (clients: Client[]) => void;
  invoices: Invoice[];
  onUpdateInvoices: (invoices: Invoice[]) => void;
  products: Product[];
  onUpdateProducts: (products: Product[]) => void;
  consultations: Consultation[];
  onUpdateConsultations: (consults: Consultation[]) => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({
  blogs, onUpdateBlogs,
  pricelist, onUpdatePricelist,
  clients, onUpdateClients,
  invoices, onUpdateInvoices,
  products, onUpdateProducts,
  consultations, onUpdateConsultations
}) => {
  // Memoized Live Statistics
  const revenueData = React.useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentYear = new Date().getFullYear();
    const monthlyStats: Record<string, { revenue: number, profit: number }> = {};

    invoices.forEach(inv => {
      if (!inv.date) return;
      const date = new Date(inv.date);
      if (date.getFullYear() !== currentYear) return;
      const monthName = months[date.getMonth()];
      if (!monthlyStats[monthName]) monthlyStats[monthName] = { revenue: 0, profit: 0 };
      const rev = (inv.totalKES || 0) / 1000000;
      monthlyStats[monthName].revenue += rev;
      monthlyStats[monthName].profit += rev * 0.25;
    });

    return months.slice(0, 6).map(name => ({
      name,
      revenue: parseFloat((monthlyStats[name]?.revenue || 0).toFixed(2)),
      profit: parseFloat((monthlyStats[name]?.profit || 0).toFixed(2))
    }));
  }, [invoices]);

  const categoryData = React.useMemo(() => {
    const counts: Record<string, number> = {};
    products.forEach(p => {
      const cat = p.category || 'General';
      counts[cat] = (counts[cat] || 0) + 1;
    });
    const colors = ['#3D8593', '#FF9900', '#6366f1', '#ec4899', '#f59e0b'];
    return Object.entries(counts).map(([name, value], idx) => ({
      name,
      value,
      color: colors[idx % colors.length]
    }));
  }, [products]);

  const [activeTab, setActiveTab] = useState<'overview' | 'reports' | 'monitors' | 'invoices' | 'products' | 'groupbuys' | 'corporate' | 'consultations' | 'pricelist' | 'content' | 'clients' | 'leads' | 'books' | 'security' | 'adbanners' | 'card'>('overview');
  const [syncing, setSyncing] = useState(false);
  const [syncingMaster, setSyncingMaster] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [waitlistCounts, setWaitlistCounts] = useState<Record<string, number>>({});
  // Shipping agents you tag orders with (e.g. "Agent A" = red).
  const [shippingAgents, setShippingAgents] = useState<ShippingAgent[]>([]);
  const [showAgentManager, setShowAgentManager] = useState(false);
  const [newAgentName, setNewAgentName] = useState('');
  const [newAgentColor, setNewAgentColor] = useState('rose');
  const [agentError, setAgentError] = useState<string | null>(null);
  // /corporate — B2B quote requests and the price bands that drive its estimator.
  const [corpQuotes, setCorpQuotes] = useState<CorporateQuote[]>([]);
  const [corpCats, setCorpCats] = useState<CorporateCategory[]>([]);
  const [corpView, setCorpView] = useState<'leads' | 'pricing'>('leads');
  const newCorporateCount = corpQuotes.filter(q => q.status === 'new' && q.leadQuality === 'priority').length;

  const loadCorporate = () => {
    fetchCorporateQuotes().then(setCorpQuotes).catch(() => {});
    fetchCorporateCategories(false).then(setCorpCats).catch(() => {});
  };

  const saveCorpCategory = async (c: CorporateCategory) => {
    const res = await upsertCorporateCategory(c);
    if (!res.success) { alert(`Could not save: ${res.error}`); return; }
    loadCorporate();
  };

  /** Draft the qualifying question before doing any sourcing work. */
  const qualifyLead = (q: CorporateQuote) => {
    const first = (q.fullName || 'there').split(' ')[0];
    const msg = encodeURIComponent(
      `Hi ${first}, thanks for your request for ${q.businessName}. ` +
      `Before I pull exact factory and shipping costs for ${q.categories.join(' and ') || 'your order'}, ` +
      `two quick things: what's your target delivery date, and do you have a target budget per unit? ` +
      `That way the quotation I send you is accurate rather than generic.`
    );
    const phone = q.whatsapp ? normalizeKenyanPhone(q.whatsapp) : '';
    window.open(phone ? `https://wa.me/${phone}?text=${msg}` : `mailto:${q.email}`, '_blank');
  };
  const [syncBrandFilter, setSyncBrandFilter] = useState<'iphone' | 'samsung' | 'pixel'>('iphone');
  const [adminSearchTerm, setAdminSearchTerm] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [editingPrice, setEditingPrice] = useState<{ plId: string, capIdx: number } | null>(null);

  // Product Management State
  const [editingProduct, setEditingProduct] = useState<Product | 'new' | null>(null);
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const [messagingInvoice, setMessagingInvoice] = useState<Invoice | null>(null);
  const [messageIntent, setMessageIntent] = useState<MessageIntent | undefined>(undefined);
  const [trackingInvoice, setTrackingInvoice] = useState<Invoice | null>(null);
  const [supervisorOpen, setSupervisorOpen] = useState(false);

  const handleSupervisorAction = (action: SupervisorAction) => {
    if (action.type === 'open_catalog') {
      setActiveTab('products'); setAiPanelOpen(true);
    } else if (action.type === 'open_group_buys') {
      setActiveTab('groupbuys');
    } else if (action.type === 'draft_message' && action.invoice_number) {
      const inv = invoices.find(i => i.invoiceNumber === action.invoice_number);
      if (inv) { setActiveTab('invoices'); setMessageIntent(action.intent as MessageIntent); setMessagingInvoice(inv); }
    } else if (action.type === 'open_tracking' && action.invoice_number) {
      const inv = invoices.find(i => i.invoiceNumber === action.invoice_number);
      if (inv) { setActiveTab('invoices'); setTrackingInvoice(inv); }
    }
    setSupervisorOpen(false);
  };

  // Price Editing State
  const [priceEditUSD, setPriceEditUSD] = useState<string>('');
  const [priceEditKES, setPriceEditKES] = useState<number | null>(null);
  const [priceManualOverride, setPriceManualOverride] = useState(false);
  const [priceCalculating, setPriceCalculating] = useState(false);
  const [priceSaving, setPriceSaving] = useState(false);

  // Advanced Variation State
  const [localVariations, setLocalVariations] = useState<ProductVariation[]>([]);
  const [bulkVariationInput, setBulkVariationInput] = useState('');

  // Blog Management State
  const [editingBlog, setEditingBlog] = useState<BlogPost | 'new' | null>(null);

  // Printing State
  const [printingInvoice, setPrintingInvoice] = useState<Invoice | null>(null);

  // Sourcing Leads State
  const [leads, setLeads] = useState<SourcingRequest[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(false);
  const [visitCount, setVisitCount] = useState<number>(0);

  const hasNewPaidOrders = invoices.some(inv => inv.isPaid && inv.status === OrderStatus.RECEIVED_BY_AGENT);

  // --- Invoice organization: search / filter / sort / summaries ---
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [invoiceFilterPayment, setInvoiceFilterPayment] = useState<'all' | PaymentStatus>('all');
  const [invoiceFilterMonth, setInvoiceFilterMonth] = useState<string>('all'); // 'all' | 'YYYY-MM'
  const [invoiceFilterDelivery, setInvoiceFilterDelivery] = useState<'all' | 'delivered' | 'undelivered' | 'toreview'>('all');
  const [invoiceFilterAgent, setInvoiceFilterAgent] = useState<string>('all'); // 'all' | 'none' | agent name
  const [invoiceSort, setInvoiceSort] = useState<'newest' | 'oldest' | 'highest' | 'lowest'>('newest');

  const invoiceMonths = useMemo(() => {
    const set = new Set<string>();
    invoices.forEach(inv => {
      const d = inv.createdAt || inv.date;
      if (d) set.add(new Date(d).toISOString().slice(0, 7));
    });
    return [...set].sort().reverse();
  }, [invoices]);

  const filteredInvoices = useMemo(() => {
    const q = invoiceSearch.trim().toLowerCase();
    const list = invoices.filter(inv => {
      if (q && !(`${inv.invoiceNumber}`.toLowerCase().includes(q)
        || inv.clientName?.toLowerCase().includes(q)
        || inv.productName?.toLowerCase().includes(q)
        || inv.paystackReference?.toLowerCase().includes(q))) return false;
      if (invoiceFilterPayment !== 'all' && inv.paymentStatus !== invoiceFilterPayment) return false;
      if (invoiceFilterDelivery !== 'all') {
        const isDelivered = inv.status === OrderStatus.DELIVERED;
        if (invoiceFilterDelivery === 'delivered' && !isDelivered) return false;
        if (invoiceFilterDelivery === 'undelivered' && isDelivered) return false;
        // "To review" = delivered but the review request hasn't been sent yet.
        if (invoiceFilterDelivery === 'toreview' && (!isDelivered || inv.reviewRequestedAt)) return false;
      }
      if (invoiceFilterMonth !== 'all') {
        const d = inv.createdAt || inv.date;
        if (!d || new Date(d).toISOString().slice(0, 7) !== invoiceFilterMonth) return false;
      }
      if (invoiceFilterAgent !== 'all') {
        if (invoiceFilterAgent === 'none' ? !!inv.shippingAgent : inv.shippingAgent !== invoiceFilterAgent) return false;
      }
      return true;
    });
    const time = (inv: Invoice) => new Date(inv.createdAt || inv.date || 0).getTime();
    return list.sort((a, b) =>
      invoiceSort === 'newest' ? time(b) - time(a) :
      invoiceSort === 'oldest' ? time(a) - time(b) :
      invoiceSort === 'highest' ? (b.totalKES || 0) - (a.totalKES || 0) :
      (a.totalKES || 0) - (b.totalKES || 0)
    );
  }, [invoices, invoiceSearch, invoiceFilterPayment, invoiceFilterDelivery, invoiceFilterMonth, invoiceFilterAgent, invoiceSort]);

  const invoiceSummary = useMemo(() => ({
    count: filteredInvoices.length,
    totalKES: filteredInvoices.reduce((s, i) => s + (i.totalKES || 0), 0),
    unpaid: filteredInvoices.filter(i => i.paymentStatus === PaymentStatus.UNPAID).length,
    inTransit: filteredInvoices.filter(i => i.status !== OrderStatus.DELIVERED).length,
  }), [filteredInvoices]);

  // Delivered orders that still need a review request (across ALL orders, not
  // just the filtered view) — powers the "To review" pill badge.
  const toReviewCount = useMemo(
    () => invoices.filter(i => i.status === OrderStatus.DELIVERED && !i.reviewRequestedAt).length,
    [invoices]
  );

  /** Export the CURRENTLY FILTERED orders with full detail (one sheet) */
  const handleExportOrders = () => {
    if (filteredInvoices.length === 0) { alert('No orders match the current filters.'); return; }
    const data = filteredInvoices.map(inv => ({
      'Invoice #': inv.invoiceNumber,
      'Date': inv.createdAt ? new Date(inv.createdAt).toLocaleDateString('en-GB') : (inv.date || 'N/A'),
      'Client': inv.clientName,
      'WhatsApp': inv.clientWhatsapp || '',
      'Product': inv.productName,
      'Qty': inv.quantity || 1,
      'Total': inv.totalKES || 0,
      'Currency': inv.currency || 'KES',
      'Payment': inv.paymentStatus,
      'Order Status': inv.status,
      'Paystack Ref': inv.paystackReference || 'Manual',
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    ws['!cols'] = Object.keys(data[0]).map(k => ({ wch: Math.max(k.length + 2, 14) }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Orders');
    const suffix = invoiceFilterMonth === 'all' ? 'All' : invoiceFilterMonth;
    XLSX.writeFile(wb, `LegitGrinder_Orders_${suffix}.xlsx`);
  };

  const newPaidOrderCount = invoices.filter(inv => inv.isPaid && inv.status === OrderStatus.RECEIVED_BY_AGENT).length;
  // Time-sensitive items (grace elapsed / ready with balance) — badges the Orders tab + Manager button
  const attentionCount = computeAttention(invoices).length;

  // Leads and Ad Banners tabs removed 2026-07 (unused per owner)
  const tabs = [
    { id: 'overview', name: 'Dashboard', group: 'Main', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'reports', name: 'Reports', group: 'Main', icon: <Calendar className="w-4 h-4" /> },
    { id: 'clients', name: 'Clients', group: 'Main', icon: <Users className="w-4 h-4" /> },
    { id: 'invoices', name: 'Orders & Invoices', group: 'Main', badge: (newPaidOrderCount + attentionCount) || undefined, icon: <FileText className="w-4 h-4" /> },
    { id: 'products', name: 'Stock', group: 'Main', icon: <ShoppingBag className="w-4 h-4" /> },
    { id: 'groupbuys', name: 'Group Buys', group: 'Main', icon: <Users className="w-4 h-4" /> },
    // The corporate lines live behind one collapsible entry — they're catalogue
    // maintenance, not somewhere he needs to be every day.
    { id: 'corporate', name: 'Leads & Quotes', group: 'Main', section: 'corporate', badge: newCorporateCount || undefined, icon: <Buildings className="w-4 h-4" /> },
    { id: 'monitors', name: 'Monitors', group: 'Main', section: 'corporate', icon: <Smartphone className="w-4 h-4" /> },
    { id: 'chairs', name: 'Chairs', group: 'Main', section: 'corporate', icon: <Armchair className="w-4 h-4" /> },
    { id: 'consultations', name: 'Consultations', group: 'Operations', icon: <MessageSquare className="w-4 h-4" /> },
    { id: 'content', name: 'Blog Content', group: 'Operations', icon: <List className="w-4 h-4" /> },
    { id: 'pricelist', name: 'Phone Price Sync', group: 'Operations', icon: <RefreshCcw className="w-4 h-4" /> },
    { id: 'books', name: 'eBooks', group: 'Operations', icon: <Book className="w-4 h-4" /> },
    { id: 'security', name: 'Security', group: 'System', icon: <Lock className="w-4 h-4" /> },
    { id: 'card', name: 'Business Card', group: 'System', icon: <CreditCard className="w-4 h-4" /> },
  ] as const;

  /** The corporate group in the sidebar — collapsed until he needs it, and
   *  opened automatically whenever one of its tabs is the active one. */
  const corporateChildActive = (['corporate', 'monitors', 'chairs'] as string[]).includes(activeTab);
  const [corporateNavOpen, setCorporateNavOpen] = useState(corporateChildActive);
  useEffect(() => { if (corporateChildActive) setCorporateNavOpen(true); }, [corporateChildActive]);

  const [ebooks, setEbooks] = useState<EBook[]>([]);
  const [editingBook, setEditingBook] = useState<EBook | 'new' | null>(null);

  // Ad Banners State
  const [adBanners, setAdBanners] = useState<AdBanner[]>([]);
  const [editingAdBanner, setEditingAdBanner] = useState<AdBanner | 'new' | null>(null);

  const [isCreatingManualInvoice, setIsCreatingManualInvoice] = useState(false);
  const [isCreatingRefund, setIsCreatingRefund] = useState(false);
  const [isCreatingImageInvoice, setIsCreatingImageInvoice] = useState(false);
  const [imageInvoiceItems, setImageInvoiceItems] = useState<{name: string, specs: string, imageUrl: string, quantity: number, priceKES: number}[]>([{ name: '', specs: '', imageUrl: '', quantity: 1, priceKES: 0 }]);
  const [imageInvoiceClient, setImageInvoiceClient] = useState({ name: '', whatsapp: '' });
  const [imageInvoiceCurrency, setImageInvoiceCurrency] = useState<'KES' | 'USD'>('KES');
  const [refundData, setRefundData] = useState({ clientName: '', clientWhatsapp: '', amountKES: 0, reason: '', originalInvoiceRef: '', refundItem: '', transactionCode: '' });
  const [manualOrderItems, setManualOrderItems] = useState<{name: string, quantity: number, priceKES: number}[]>([{ name: '', quantity: 1, priceKES: 0 }]);
  const [manualOrderPaymentStatus, setManualOrderPaymentStatus] = useState<PaymentStatus>(PaymentStatus.UNPAID);
  /** Deposit taken at the point the order is created, when it's part-paid. */
  const [manualOrderPaidAmount, setManualOrderPaidAmount] = useState('');
  const [manualOrderCurrency, setManualOrderCurrency] = useState<'KES' | 'USD'>('KES');
  // Receipt form. "Sum in words" writes itself from the amount received, but
  // stays fully editable — once it's been hand-edited we stop overwriting it.
  const [receiptAmount, setReceiptAmount] = useState('');
  const [receiptBalance, setReceiptBalance] = useState('0');
  const [receiptTotal, setReceiptTotal] = useState('');
  const [receiptWords, setReceiptWords] = useState('');
  const [receiptWordsEdited, setReceiptWordsEdited] = useState(false);
  const [receiptBalanceEdited, setReceiptBalanceEdited] = useState(false);
  /**
   * Two very different documents from one button. A RECEIPT says money has been
   * handed over; a STATEMENT says money is still owed. Printing the first when
   * you meant the second tells a client they've paid when they haven't.
   */
  const [receiptDocKind, setReceiptDocKind] = useState<'receipt' | 'statement'>('receipt');
  const [printingReceiptInvoice, setPrintingReceiptInvoice] = useState<Invoice | null>(null);
  // Marking an order part-paid has to capture HOW MUCH, or the balance is
  // unknowable and every downstream figure quotes the full total instead.
  const [depositFor, setDepositFor] = useState<Invoice | null>(null);
  const [depositAmount, setDepositAmount] = useState('');
  const [depositSaving, setDepositSaving] = useState(false);

  // Full invoice amendment — a mistyped figure, a changed price or an extra
  // fee, without deleting and re-issuing the order.
  const [amendingInvoice, setAmendingInvoice] = useState<Invoice | null>(null);
  const [amendItems, setAmendItems] = useState<InvoiceItem[]>([]);
  const [amendCurrency, setAmendCurrency] = useState<'KES' | 'USD'>('KES');
  const [amendSaving, setAmendSaving] = useState(false);
  const [amendError, setAmendError] = useState<string | null>(null);

  /** Load the invoice's lines into the form each time it opens. */
  useEffect(() => {
    if (!amendingInvoice) return;
    setAmendItems(
      amendingInvoice.items?.length
        ? amendingInvoice.items.map(i => ({ ...i }))
        : [{ name: amendingInvoice.productName || '', quantity: amendingInvoice.quantity || 1, priceKES: amendingInvoice.totalKES || 0 }]
    );
    setAmendCurrency(amendingInvoice.currency || 'KES');
    setAmendError(null);
  }, [amendingInvoice]);

  /** Total, paid and outstanding for one order, per the record. */
  const moneyOf = (inv: Invoice) => {
    const total = inv.totalKES || 0;
    // The payment status wins: a settled order owes nothing even if no figure
    // was ever stored against it.
    const settled = inv.paymentStatus === PaymentStatus.PAID || inv.isPaid;
    const paid = settled ? total : (inv.amountPaidKES || 0);
    return {
      total,
      paid,
      settled,
      balance: settled ? 0 : Math.max(total - paid, 0),
      // Part-paid with nothing on record: the balance is unknown, and saying so
      // is far better than quoting the whole total as if it were still owed.
      unrecorded: !settled && inv.paymentStatus === PaymentStatus.PARTIALLY_PAID && paid <= 0,
    };
  };

  /** Change a payment status, capturing the deposit when one is needed. */
  const applyPaymentStatus = async (inv: Invoice, newStatus: PaymentStatus) => {
    if (newStatus === PaymentStatus.PARTIALLY_PAID) {
      setDepositAmount(inv.amountPaidKES ? String(inv.amountPaidKES) : '');
      setDepositFor(inv);
      return;
    }
    const paid = newStatus === PaymentStatus.PAID ? (inv.totalKES || 0) : 0;
    onUpdateInvoices(invoices.map(i =>
      i.id === inv.id
        ? { ...i, paymentStatus: newStatus, isPaid: newStatus === PaymentStatus.PAID, amountPaidKES: paid }
        : i));
    const result = await updateInvoicePaymentStatus(inv.id, newStatus);
    if (!result.success) alert('Failed to update payment status in database');
  };

  /**
   * Seed the receipt form each time it opens — a starting point, never a cage.
   *
   * A receipt records what was handed over TODAY, which is not always what the
   * record predicts: a price can move between deposit and arrival, so the sum
   * received may be more (or less) than the balance we were expecting. Every
   * field stays editable for exactly that reason.
   */
  useEffect(() => {
    const inv = printingReceiptInvoice;
    if (!inv) return;
    const m = moneyOf(inv);
    // Money still owed? Then the document he almost certainly wants is the one
    // that ASKS for it, not one that says it has already arrived.
    const owing = !m.settled && !m.unrecorded && m.balance > 0;
    seedReceiptForm(inv, owing ? 'statement' : 'receipt');
  }, [printingReceiptInvoice]);

  /** Fill the print form for one document type, from the record. */
  const seedReceiptForm = (inv: Invoice, kind: 'receipt' | 'statement') => {
    const m = moneyOf(inv);
    setReceiptDocKind(kind);
    setReceiptWordsEdited(false);
    setReceiptBalanceEdited(false);
    setReceiptTotal(m.total > 0 ? String(m.total) : '');

    if (kind === 'statement') {
      // Paid to date and what is still owed. Nothing here claims a payment.
      setReceiptAmount(m.unrecorded ? '' : String(m.paid));
      setReceiptBalance(String(m.balance));
      // The money that has changed hands is the figure worth spelling out —
      // words exist to make a payment impossible to alter or dispute. Only
      // when nothing has been paid does the balance take that place.
      setReceiptWords(amountFieldInWords(String(m.paid > 0 ? m.paid : m.balance), inv.currency));
      return;
    }

    // A receipt is written when money changes hands, so it opens blank rather
    // than guessing a figure — a prefilled amount is a claim, not a convenience.
    setReceiptAmount('');
    setReceiptBalance(m.total > 0 && !m.settled ? String(m.balance) : '0');
    setReceiptWords('');
  };

  /** Whether a statement's words line is certifying money paid or money owed. */
  const statementWordsUsePaid = (parseFloat((receiptAmount || '').replace(/,/g, '')) || 0) > 0;
  const receiptWordsLabel = receiptDocKind === 'receipt'
    ? 'Sum in Words'
    : (statementWordsUsePaid ? 'Paid in Words' : 'Balance in Words');

  // Security & MFA State
  const [securityLoading, setSecurityLoading] = useState(false);
  const [mfaEnrollData, setMfaEnrollData] = useState<{ id: string; qr_code: string; uri: string } | null>(null);
  const [mfaCode, setMfaCode] = useState('');
  const [mfaError, setMfaError] = useState<string | null>(null);

  // Contract Generator State
  const [isGeneratingContract, setIsGeneratingContract] = useState(false);
  const [contractInvoice, setContractInvoice] = useState<Invoice | null>(null);
  const [contractFormData, setContractFormData] = useState({ clientName: '', clientIdReg: '', itemDescription: '', itemSpecifications: '', shippingMethod: 'Air Freight', totalQuotation: '', upfrontPayment: '', shippingBalanceEstimate: '' });

  const handleUpdateAdminCredentials = async () => {
    if (!confirm('Are you sure you want to update your admin credentials? You will be logged out.')) return;
    setSecurityLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        email: 'mungaimports@gmail.com',
        password: 'Muneneowns_LG_imports01'
      });
      if (error) throw error;
      alert('Credentials updated successfully. Logging out...');
      await supabase.auth.signOut();
      window.location.reload();
    } catch (err: any) {
      alert('Update failed: ' + err.message);
    } finally {
      setSecurityLoading(false);
    }
  };

  const startMFAEnrollment = async () => {
    setSecurityLoading(true);
    setMfaError(null);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp'
      });
      if (error) throw error;
      setMfaEnrollData({
        id: data.id,
        qr_code: data.totp.qr_code,
        uri: data.totp.uri
      });
    } catch (err: any) {
      setMfaError(err.message);
    } finally {
      setSecurityLoading(false);
    }
  };

  const verifyMFAEnrollment = async () => {
    if (!mfaEnrollData) return;
    setSecurityLoading(true);
    setMfaError(null);
    try {
      const { id } = mfaEnrollData;
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({ factorId: id });
      if (challengeError) throw challengeError;

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: id,
        challengeId: challengeData.id,
        code: mfaCode
      });
      if (verifyError) throw verifyError;

      alert('MFA enrolled successfully!');
      setMfaEnrollData(null);
      setMfaCode('');
    } catch (err: any) {
      setMfaError(err.message);
    } finally {
      setSecurityLoading(false);
    }
  };

  const copyTrackingLink = (invoiceNumber: string) => {
    const link = `${window.location.origin}/tracking?id=${invoiceNumber}`;
    navigator.clipboard.writeText(link);
    alert('✅ Tracking link copied to clipboard!');
  };

  const handleExportTaxDocs = () => {
    if (!invoices || invoices.length === 0) {
      alert("No invoices available to export.");
      return;
    }

    // Respect the invoice tab's active filters (month, search, etc.), then keep paid/partial only
    const base = filteredInvoices.length > 0 ? filteredInvoices : invoices;
    const validInvoices = base.filter(inv => inv.paymentStatus !== PaymentStatus.UNPAID && inv.paymentStatus !== 'Unpaid');

    if (validInvoices.length === 0) {
      alert("No paid or partially paid invoices match the current filters.");
      return;
    }

    const data = validInvoices.map(inv => {
      const total = inv.totalKES || 0;
      const deductibles = (inv.buyingPriceKES || 0) + (inv.shippingFeeKES || 0) + (inv.logisticsCostKES || 0);
      const profit = inv.serviceFeeKES || 0;

      return {
        'Invoice #': inv.invoiceNumber,
        'Date': inv.createdAt ? new Date(inv.createdAt).toLocaleDateString('en-GB') : (inv.date || 'N/A'),
        'Client': inv.clientName,
        'Product': inv.productName,
        'Amount (KES)': total,
        'Deductible (KES)': deductibles,
        'Profit (KES)': profit
      };
    });

    // Totals row for quick KRA reconciliation
    data.push({
      'Invoice #': 'TOTAL',
      'Date': '',
      'Client': '',
      'Product': `${data.length} invoices`,
      'Amount (KES)': data.reduce((s, r) => s + (r['Amount (KES)'] as number), 0),
      'Deductible (KES)': data.reduce((s, r) => s + (r['Deductible (KES)'] as number), 0),
      'Profit (KES)': data.reduce((s, r) => s + (r['Profit (KES)'] as number), 0),
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    worksheet['!cols'] = Object.keys(data[0]).map(k => ({ wch: Math.max(k.length + 2, 15) }));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Tax_Invoices");
    const suffix = invoiceFilterMonth === 'all' ? 'All' : invoiceFilterMonth;
    XLSX.writeFile(workbook, `Tax_Supporting_Docs_${suffix}.xlsx`);
  };

  const handleCreateManualOrder = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const paymentStatus = formData.get('paymentStatus') as PaymentStatus;
    const isPaid = paymentStatus === PaymentStatus.PAID;

    // Quantity counts. This used to sum unit prices only, so leaving Total blank
    // on "2 × KES 5,000" saved 5,000 while the form had just promised 10,000.
    const generatedTotalKES = manualOrderItems.reduce(
      (sum, item) => sum + (item.priceKES || 0) * (item.quantity || 1), 0);
    const rawTotal = formData.get('totalKES') as string;
    const isTBD = rawTotal.trim().toUpperCase() === 'TBD' || formData.get('isTBD') === 'on';
    const totalKES = isTBD ? 0 : (parseFloat(rawTotal) || generatedTotalKES); // fallback to auto-computed

    // Construct single productName fallback and extract items
    const fallbackProductName = manualOrderItems.map(i => `${i.quantity}x ${i.name}`).join(' + ');
    const customTitle = formData.get('customTitle') as string;

    const createdAtRaw = formData.get('createdAt') as string;

    const invoiceData: Partial<Invoice> = {
      clientName: formData.get('clientName') as string,
      clientWhatsapp: formData.get('clientWhatsapp') as string,
      clientEmail: (formData.get('clientEmail') as string) || undefined,
      productName: customTitle && customTitle.trim() ? customTitle.trim() : fallbackProductName,
      quantity: 1,
      items: manualOrderItems,
      totalKES: totalKES,
      buyingPriceKES: parseFloat(formData.get('buyingPriceKES') as string) || 0,
      shippingFeeKES: parseFloat(formData.get('shippingFeeKES') as string) || 0,
      logisticsCostKES: parseFloat(formData.get('logisticsCostKES') as string) || 0,
      serviceFeeKES: parseFloat(formData.get('serviceFeeKES') as string) || 0,
      isPaid: isPaid,
      paymentStatus: paymentStatus,
      // Paid settles against the total; a deposit is whatever was typed.
      amountPaidKES: isPaid
        ? totalKES
        : paymentStatus === PaymentStatus.PARTIALLY_PAID
          ? (parseFloat(formData.get('amountPaidKES') as string) || 0)
          : 0,
      paystackReference: (formData.get('paystackReference') as string) || undefined,
      createdAt: createdAtRaw ? new Date(createdAtRaw).toISOString() : undefined,
      currency: manualOrderCurrency
    };

    const result = await createManualInvoice(invoiceData);
    if (result.success) {
      setIsCreatingManualInvoice(false);
      window.location.reload(); // Refresh to show new invoice
    } else {
      alert('Error creating order: ' + JSON.stringify(result.error));
    }
  };

  useEffect(() => {
    if (activeTab === 'books') {
      fetchEBooks().then(setEbooks);
    } else if (activeTab === 'adbanners') {
      fetchBanners().then(setAdBanners);
    } else if (activeTab === 'products') {
      fetchWaitlistCounts().then(setWaitlistCounts).catch(() => {});
    } else if (activeTab === 'invoices') {
      fetchShippingAgents().then(setShippingAgents).catch(() => {});
    } else if (activeTab === 'corporate') {
      loadCorporate();
    }
  }, [activeTab]);

  // Tailwind needs literal class names, so map each agent colour explicitly.
  const AGENT_COLORS: Record<string, string> = {
    rose: 'bg-rose-100 text-rose-700 border-rose-200',
    amber: 'bg-amber-100 text-amber-700 border-amber-200',
    emerald: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    teal: 'bg-teal-100 text-teal-700 border-teal-200',
    violet: 'bg-violet-100 text-violet-700 border-violet-200',
    slate: 'bg-slate-100 text-slate-700 border-slate-200',
  };
  const AGENT_DOTS: Record<string, string> = {
    rose: 'bg-rose-500', amber: 'bg-amber-500', emerald: 'bg-emerald-500',
    teal: 'bg-teal-500', violet: 'bg-violet-500', slate: 'bg-slate-500',
  };
  const agentColorOf = (name?: string) =>
    shippingAgents.find(a => a.name === name)?.color || 'slate';

  const handleAddAgent = async () => {
    setAgentError(null);
    if (!newAgentName.trim()) { setAgentError('Give the agent a name.'); return; }
    const res = await createShippingAgent(newAgentName, newAgentColor);
    if (!res.success) {
      setAgentError(/relation|does not exist|schema cache/i.test(res.error || '')
        ? 'Run add_shipping_agents.sql in Supabase first — the table does not exist yet.'
        : res.error || 'Could not add the agent.');
      return;
    }
    setShippingAgents(prev => [...prev, res.agent!].sort((a, b) => a.name.localeCompare(b.name)));
    setNewAgentName('');
  };

  const handleTagOrder = async (inv: Invoice, agentName: string | null) => {
    onUpdateInvoices(invoices.map(x => x.id === inv.id ? { ...x, shippingAgent: agentName || undefined } : x));
    const res = await setInvoiceShippingAgent(inv.id, agentName);
    if (!res.success) alert(`Could not save the tag: ${res.error || 'unknown error'}`);
  };

  const handleSaveBook = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const bookData: Partial<EBook> = {
      title: formData.get('title') as string,
      author: formData.get('author') as string,
      description: formData.get('description') as string,
      priceKES: parseInt(formData.get('priceKES') as string),
      discountPriceKES: parseInt(formData.get('discountPriceKES') as string) || undefined,
      coverImage: formData.get('coverImage') as string,
      content: formData.get('content') as string,
      pdfUrl: formData.get('pdfUrl') as string || undefined,
    };

    let result;
    if (editingBook === 'new') {
      result = await createEBook(bookData);
    } else if (editingBook) {
      result = await updateEBook(editingBook.id, bookData);
    }

    if (result?.success) {
      setEditingBook(null);
      const updated = await fetchEBooks();
      setEbooks(updated);
    } else {
      alert('Error saving book: ' + JSON.stringify(result?.error));
    }
  };

  const handleSaveAdBanner = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const bannerData: Partial<Omit<AdBanner, 'id'>> = {
      title1: formData.get('title1') as string,
      title2: formData.get('title2') as string,
      subtitle: formData.get('subtitle') as string,
      buttonText: formData.get('buttonText') as string,
      buttonLink: formData.get('buttonLink') as string,
      imageSrc: formData.get('imageSrc') as string,
      backgroundColor: formData.get('backgroundColor') as string,
      textColor: formData.get('textColor') as string,
      isActive: formData.get('isActive') === 'true',
      sortOrder: parseInt(formData.get('sortOrder') as string) || 0,
    };

    try {
      if (editingAdBanner === 'new') {
        const newBanner = await addBanner(bannerData as Omit<AdBanner, 'id'>);
        setAdBanners([...adBanners, newBanner]);
      } else if (editingAdBanner && typeof editingAdBanner !== 'string') {
        await updateBanner(editingAdBanner.id, bannerData);
        setAdBanners(adBanners.map(b => b.id === editingAdBanner.id ? { ...b, ...bannerData } as AdBanner : b));
      }
      setEditingAdBanner(null);
    } catch (err: any) {
      alert('Error saving Ad Banner: ' + err.message);
    }
  };

  const handleDeleteAdBanner = async (id: string) => {
    if (!confirm('Are you sure you want to delete this Ad Banner?')) return;
    try {
      await deleteBanner(id);
      setAdBanners(adBanners.filter(b => b.id !== id));
    } catch (err: any) {
      alert('Error deleting Ad Banner: ' + err.message);
    }
  };

  const handleDeleteBook = async (id: string) => {
    if (!confirm('Are you sure you want to delete this book?')) return;
    const result = await deleteEBook(id);
    if (result.success) {
      setEbooks(ebooks.filter(b => b.id !== id));
    }
  };

  const filteredClients = useMemo(() => {
    return clients.filter(c =>
      c.name.toLowerCase().includes(adminSearchTerm.toLowerCase()) ||
      c.email.toLowerCase().includes(adminSearchTerm.toLowerCase()) ||
      c.location.toLowerCase().includes(adminSearchTerm.toLowerCase())
    );
  }, [clients, adminSearchTerm]);

  const runSync = async () => {
    setSyncing(true);
    const updated = await syncBackMarketPrices(pricelist);
    onUpdatePricelist(updated);
    setSyncing(false);
  };


  const runSeed = async () => {
    if (!window.confirm("Restore full inventory schema? This will create any missing phone models and reset baseline prices.")) return;

    setSeeding(true);
    try {
      console.log("🌱 Admin: Triggering Phone Pricelist Sync...");
      const result = await seedFullInventory();
      console.log("✅ Pricelist Sync Complete:", result);

      // Refresh local state to show new items
      // Assuming fetchPricelistData and fetchInventoryProducts are available or will be added
      // const newList = await fetchPricelistData();
      // onUpdatePricelist(newList);

      // const newProducts = await fetchInventoryProducts();
      console.log("✅ Seed Complete:", result);

      const message = result.productCount > 0
        ? `Success! Created ${result.productCount} new models and synchronized ${result.variantCount} prices.`
        : `Success! Price registry is already full. Synchronized ${result.variantCount} prices across all models.`;

      alert(message);
      window.location.reload();
    } catch (error) {
      console.error("Sync failed:", error);
      alert("Phone Pricelist Sync failed. Check connection.");
    } finally {
      setSeeding(false);
    }
  };

  const refreshLeads = async () => {
    setLoadingLeads(true);
    const data = await fetchSourcingRequests();
    setLeads(data);
    setLoadingLeads(false);
  };

  useEffect(() => {
    refreshLeads();
    const loadVisits = async () => {
      const count = await fetchVisitCount();
      setVisitCount(count);
    };
    loadVisits();
  }, []);

  const handlePrintInvoice = (inv: Invoice) => {
    setPrintingInvoice(inv);
    setTimeout(() => {
      window.print();
    }, 100);
    // Note: We don't nullify printingInvoice immediately so the template stays rendered during print dialog.
    // The user will close the dialog and the site remains.
  };

  // Sync variations when editing starts
  useEffect(() => {
    if (editingProduct && typeof editingProduct === 'object') {
      setLocalVariations(editingProduct.variations || []);
    } else {
      setLocalVariations([]);
    }
    setBulkVariationInput('');
  }, [editingProduct]);

  const addVariation = () => {
    setLocalVariations([...localVariations, { type: 'Color', name: '', priceKES: 0 }]);
  };

  const removeVariation = (index: number) => {
    setLocalVariations(localVariations.filter((_, i) => i !== index));
  };

  const updateVariation = (index: number, updates: Partial<ProductVariation>) => {
    setLocalVariations(localVariations.map((v, i) => i === index ? { ...v, ...updates } : v));
  };

  const addBulkSizes = () => {
    if (!bulkVariationInput.trim()) return;
    const sizes = bulkVariationInput.split(',').map(s => s.trim()).filter(s => s);
    const newVars: ProductVariation[] = sizes.map(s => ({
      type: 'Size',
      name: s,
      priceKES: 0
    }));
    setLocalVariations([...localVariations, ...newVars]);
    setBulkVariationInput('');
  };

  const updateInvoiceStatus = async (id: string, newStatus: OrderStatus) => {
    const progress = getOrderProgress(newStatus);

    // 1. Optimistic Update
    const updated = invoices.map(inv => inv.id === id ? { ...inv, status: newStatus, progress } : inv);
    onUpdateInvoices(updated);

    // 2. Persist to DB
    const result = await updateInvoiceStatusInDB(id, newStatus, progress);
    if (!result.success) {
      alert("⚠️ Service Sync Delayed: Status updated locally but database persistence failed. Check connection.");
    }
  };

  const handleSaveProduct = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const imageUrlsString = formData.get('imageUrls') as string;

    const productData: Partial<Product> = {
      name: formData.get('name') as string,
      priceKES: parseInt(formData.get('priceKES') as string),
      discountPriceKES: formData.get('discountPriceKES') ? parseInt(formData.get('discountPriceKES') as string) : undefined,
      imageUrls: imageUrlsString ? imageUrlsString.split(',').map(u => u.trim()) : [],
      availability: formData.get('availability') as Availability,
      shippingDuration: formData.get('shippingDuration') as string,
      description: formData.get('description') as string,
      category: formData.get('category') as string,
      stockCount: formData.get('stockCount') ? parseInt(formData.get('stockCount') as string) : 0,
      variations: localVariations,
      videoUrl: formData.get('videoUrl') as string,
    };

    console.log('🚀 Initiating Save Protocol:', productData);

    try {
      if (editingProduct === 'new') {
        const result = await createProduct(productData);
        if (result.success && result.id) {
          const newProduct: Product = {
            id: result.id,
            name: productData.name || '',
            priceKES: productData.priceKES || 0,
            imageUrls: productData.imageUrls || [],
            variations: localVariations,
            category: productData.category || 'Electronics',
            availability: productData.availability || Availability.IMPORT,
            shippingDuration: productData.shippingDuration || '',
            description: productData.description || '',
            stockCount: productData.stockCount || 0,
            videoUrl: productData.videoUrl || '',
            ...productData
          };
          onUpdateProducts([...products, newProduct]);
          setEditingProduct(null);
          alert("✅ Asset Registered in Global Inventory");
        } else {
          console.error('❌ Save Error:', result.error);
          alert("❌ Failed to register asset: " + (result.error?.message || "Check console for details"));
        }
      } else if (editingProduct && typeof editingProduct !== 'string') {
        const prev = editingProduct;
        const result = await updateProduct(editingProduct.id, productData);
        if (result.success) {
          onUpdateProducts(products.map(p => p.id === editingProduct.id ? { ...p, ...productData } : p));
          setEditingProduct(null);
          maybeNotifyRestock(prev, { ...prev, ...productData } as Product);
          alert("✅ Specifications Refined & Synced");
        } else {
          console.error('❌ Update Error:', result.error);
          alert("❌ Failed to update specifications: " + (result.error?.message || "Check console for details"));
        }
      }
    } catch (err: any) {
      console.error('💥 Crash in handleSaveProduct:', err);
      alert("💥 System Crash during save: " + err.message);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (confirm('Are you sure you want to remove this item from inventory?')) {
      const result = await deleteProduct(id);
      if (result.success) {
        onUpdateProducts(products.filter(p => p.id !== id));
      }
    }
  };

  // Price Editing Handlers
  const handleOpenPriceEdit = (plId: string, capIdx: number) => {
    const item = pricelist.find(p => p.id === plId);
    if (item && item.capacities[capIdx]) {
      const cap = item.capacities[capIdx];
      setPriceEditUSD(cap.sourcePriceUSD?.toString() || '');
      setPriceEditKES(null);
      setPriceManualOverride(cap.isManualOverride || false);
      setEditingPrice({ plId, capIdx });
    }
  };

  const handlePriceUSDChange = async (value: string) => {
    setPriceEditUSD(value);
    const usd = parseFloat(value);

    if (!isNaN(usd) && usd > 0 && !priceManualOverride) {
      setPriceCalculating(true);
      try {
        const result = await calculateFinalPrice(usd);
        setPriceEditKES(result.totalKES);
      } catch (error) {
        console.error('Price calculation error:', error);
        setPriceEditKES(null);
      }
      setPriceCalculating(false);
    }
  };

  const handleSavePriceEdit = async () => {
    if (!editingPrice) return;

    const usd = parseFloat(priceEditUSD);
    if (isNaN(usd) || usd <= 0) {
      alert('Please enter a valid USD price');
      return;
    }

    setPriceSaving(true);

    try {
      const item = pricelist.find(p => p.id === editingPrice.plId);
      if (item && item.capacities[editingPrice.capIdx]) {
        const cap = item.capacities[editingPrice.capIdx];

        // 1. Persist to DB
        const result = await updatePricelistItem(
          cap.id, // Current capacity variant ID
          usd,
          priceManualOverride,
          priceEditKES || undefined
        );

        if (!result.success) throw result.error;

        // 2. Update local state for immediate feedback
        const updated = pricelist.map(p => {
          if (p.id === editingPrice.plId) {
            const newCaps = [...p.capacities];
            newCaps[editingPrice.capIdx] = {
              ...newCaps[editingPrice.capIdx],
              sourcePriceUSD: usd,
              currentPriceKES: priceEditKES || result.calculatedKES || newCaps[editingPrice.capIdx].currentPriceKES,
              isManualOverride: priceManualOverride,
              lastSynced: new Date().toLocaleString()
            };
            return { ...p, capacities: newCaps };
          }
          return p;
        });

        onUpdatePricelist(updated);
        setEditingPrice(null);
        setPriceEditUSD('');
        setPriceEditKES(null);
        alert('Price strategy cemented successfully!');
      }
    } catch (error) {
      console.error('Error saving price:', error);
      alert('Failed to save price strategy. Check connection.');
    }

    setPriceSaving(false);
  };

  // Blog Management Handlers
  const handleSaveBlog = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const blogData: Partial<BlogPost> = {
      title: formData.get('title') as string,
      excerpt: formData.get('excerpt') as string,
      content: formData.get('content') as string,
      imageUrl: formData.get('imageUrl') as string,
      category: formData.get('category') as string,
      author: formData.get('author') as string,
      date: formData.get('date') as string,
    };

    if (editingBlog === 'new') {
      const result = await createBlog(blogData);
      if (result.success && result.id) {
        onUpdateBlogs([{ ...blogData, id: result.id } as BlogPost, ...blogs]);
        setEditingBlog(null);
      }
    } else if (editingBlog && typeof editingBlog !== 'string') {
      const result = await updateBlog(editingBlog.id, blogData);
      if (result.success) {
        onUpdateBlogs(blogs.map(b => b.id === editingBlog.id ? { ...b, ...blogData } : b));
        setEditingBlog(null);
      }
    }
  };

  const handleDeleteBlog = async (id: string) => {
    if (confirm('Are you sure you want to delete this blog post?')) {
      const result = await deleteBlog(id);
      if (result.success) {
        onUpdateBlogs(blogs.filter(b => b.id !== id));
      }
    }
  };



  const handleUpdateConsultationStatus = async (id: string, status: ConsultationStatus) => {
    const result = await updateConsultation(id, status);
    if (result.success) {
      onUpdateConsultations(consultations.map(c => c.id === id ? { ...c, status } : c));
    }
  };

  // If a product just went from out-of-stock to available, email everyone on its
  // back-in-stock waitlist. Fire-and-forget; reports how many were notified.
  const maybeNotifyRestock = (prev: Product | undefined, merged: Product) => {
    if (!prev) return;
    const wasOut = prev.availability === Availability.LOCAL && (prev.stockCount || 0) === 0;
    const nowAvailable = merged.availability === Availability.IMPORT || (merged.stockCount || 0) > 0;
    if (!wasOut || !nowAvailable) return;
    notifyBackInStock(merged).then(r => {
      if (r.notified > 0) {
        setWaitlistCounts(prev => { const next = { ...prev }; delete next[merged.id]; return next; });
        alert(`📣 Emailed ${r.notified} waitlisted customer${r.notified > 1 ? 's' : ''} that "${merged.name}" is back in stock.`);
      }
    });
  };

  // Quick inline product updates (stock steppers, price edits) — optimistic UI + DB save
  const quickUpdateProduct = async (id: string, updates: Partial<Product>) => {
    const prev = products.find(p => p.id === id);
    onUpdateProducts(products.map(p => p.id === id ? { ...p, ...updates } : p));
    const result = await updateProduct(id, updates);
    if (!result.success) { alert('Quick update failed to save — please retry.'); return; }
    if (prev) maybeNotifyRestock(prev, { ...prev, ...updates });
  };

  const handleDeleteClient = async (id: string) => {
    if (confirm('Are you sure you want to remove this client?')) {
      const result = await deleteClient(id);
      if (result.success) {
        onUpdateClients(clients.filter(c => c.id !== id));
      }
    }
  };

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-[#F9FAFB] pt-24 pb-20">
      {/* Mobile Tab Nav */}
      <div className="lg:hidden sticky top-24 z-40 bg-white border-b border-gray-100 px-4 py-3 overflow-x-auto flex no-scrollbar gap-2">
        {tabs.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`whitespace-nowrap flex items-center gap-2 px-5 py-2.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === item.id ? 'bg-[#3D8593] text-white shadow-lg shadow-teal-100' : 'bg-gray-50 text-gray-400'
              }`}
          >
            {item.icon}
            {item.name}
            {'badge' in item && item.badge ? <span className="ml-1 min-w-4 h-4 px-1 bg-emerald-500 text-white rounded-full text-[8px] flex items-center justify-center">{item.badge}</span> : null}
          </button>
        ))}
      </div>

      {/* Desktop Sidebar — flat, grouped */}
      <aside className="w-64 bg-white border-r border-gray-100 hidden lg:flex flex-col sticky top-24 h-[calc(100vh-6rem)]">
        <div className="px-6 py-7 flex items-center gap-3 border-b border-gray-50">
          <div className="bg-[#3D8593] p-2.5 rounded-xl text-white">
            <LayoutDashboard className="w-4 h-4" />
          </div>
          <div>
            <span className="block text-sm font-black tracking-tight text-gray-900 leading-none">Legit Hub</span>
            <span className="block text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em] mt-1">Admin Console</span>
          </div>
        </div>
        <nav className="flex-1 px-4 py-5 overflow-y-auto">
          {(['Main', 'Operations', 'System'] as const).map((group) => {
            const plain = tabs.filter(t => t.group === group && !('section' in t && t.section));
            const corporateTabs = group === 'Main'
              ? tabs.filter(t => 'section' in t && t.section === 'corporate')
              : [];
            const corporateBadge = corporateTabs.reduce((n, t) => n + (('badge' in t && t.badge) || 0), 0);

            const navButton = (item: typeof tabs[number], nested = false) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 py-2.5 rounded-xl text-[12px] font-bold transition-all ${nested ? 'pl-9 pr-3' : 'px-3'} ${activeTab === item.id
                  ? 'bg-teal-50 text-[#3D8593]'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                  }`}
              >
                <span className={activeTab === item.id ? 'text-[#3D8593]' : 'text-gray-400'}>{item.icon}</span>
                <span className="flex-1 text-left">{item.name}</span>
                {'badge' in item && item.badge ? (
                  <span className="min-w-5 h-5 px-1.5 bg-emerald-500 text-white rounded-full text-[10px] font-black flex items-center justify-center">{item.badge}</span>
                ) : null}
              </button>
            );

            return (
              <div key={group} className="mb-6">
                <p className="px-3 mb-2 text-[9px] font-black uppercase tracking-[0.25em] text-gray-300">{group}</p>
                <div className="space-y-0.5">
                  {plain.map(item => navButton(item))}

                  {corporateTabs.length > 0 && (
                    <>
                      <button
                        onClick={() => setCorporateNavOpen(o => !o)}
                        aria-expanded={corporateNavOpen}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[12px] font-bold transition-all ${corporateChildActive
                          ? 'text-[#3D8593]'
                          : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                          }`}
                      >
                        <span className={corporateChildActive ? 'text-[#3D8593]' : 'text-gray-400'}>
                          <Buildings className="w-4 h-4" />
                        </span>
                        <span className="flex-1 text-left">Corporate</span>
                        {corporateBadge > 0 && !corporateNavOpen ? (
                          <span className="min-w-5 h-5 px-1.5 bg-emerald-500 text-white rounded-full text-[10px] font-black flex items-center justify-center">{corporateBadge}</span>
                        ) : null}
                        <ChevronRight className={`w-3.5 h-3.5 text-gray-300 transition-transform ${corporateNavOpen ? 'rotate-90' : ''}`} />
                      </button>
                      {corporateNavOpen && (
                        <div className="space-y-0.5 border-l border-gray-100 ml-5">
                          {corporateTabs.map(item => navButton(item, true))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </nav>
        <div className="px-6 py-5 border-t border-gray-50">
          <p className="text-[9px] font-bold text-gray-300 uppercase tracking-[0.2em]">LegitGrinder · 2026</p>
        </div>
      </aside>

      <main className="flex-1 p-4 md:p-10 lg:p-12 overflow-y-auto">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 md:mb-10 gap-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tighter text-gray-900 leading-none">
              {tabs.find(t => t.id === activeTab)?.name || activeTab}
            </h1>
            <p className="text-gray-400 font-bold uppercase text-[9px] tracking-[0.3em] mt-2.5">
              {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
          <div className="flex gap-4 w-full md:w-auto">
            {activeTab === 'invoices' && (
              <button
                onClick={handleExportTaxDocs}
                className="flex-1 md:flex-none btn-vibrant-teal px-10 py-4 rounded-full font-black text-[10px] uppercase tracking-widest shadow-2xl flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" /> Export Tax Docs
              </button>
            )}
            {activeTab === 'clients' && (
              <button
                onClick={() => {
                  if (clients.length === 0) { alert('No clients to export yet.'); return; }
                  const data = clients.map(c => ({
                    'Name': c.name,
                    'Email': c.email || '',
                    'Phone': c.phone || '',
                    'Location': c.location || '',
                    'Joined': c.joinedDate || '',
                    'Orders': c.orderCount || 0,
                    'Total Spent (KES)': c.totalSpentKES || 0,
                    'Last Order': c.lastOrderDate || '',
                  }));
                  const ws = XLSX.utils.json_to_sheet(data);
                  ws['!cols'] = Object.keys(data[0]).map(k => ({ wch: Math.max(k.length + 2, 16) }));
                  const wb = XLSX.utils.book_new();
                  XLSX.utils.book_append_sheet(wb, ws, 'Clients');
                  XLSX.writeFile(wb, 'LegitGrinder_Client_Marketing_List.xlsx');
                }}
                className="flex-1 md:flex-none btn-vibrant-teal px-10 py-4 rounded-full font-black text-[10px] uppercase tracking-widest shadow-2xl flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" /> Export Marketing List
              </button>
            )}
            {activeTab === 'products' && (
              <div className="flex gap-4">
                <button
                  onClick={async () => {
                    if (confirm('CRITICAL: This will permanently delete ALL phone models from your Shop Inventory (Pipe B). Your Price List (Pipe A) is safe. Continue?')) {
                      const { error } = await supabase
                        .from('products')
                        .delete()
                        .or('category.ilike.%Phone%,category.ilike.%Smartphone%,name.ilike.%iPhone%,name.ilike.%Galaxy%,name.ilike.%Samsung%,name.ilike.%Pixel%,name.ilike.%Google%,name.ilike.%Ultra%,name.ilike.%S20%,name.ilike.%S21%,name.ilike.%S22%,name.ilike.%S23%,name.ilike.%S24%,name.ilike.%S25%,name.ilike.%Plus%,name.ilike.%Note%,name.ilike.%Fold%,name.ilike.%Flip%,name.ilike.%Apple%,name.ilike.%GB%');

                      if (error) alert("Purge failed: " + error.message);
                      else {
                        alert("✅ Inventory Purged! Refreshing...");
                        window.location.reload();
                      }
                    }
                  }}
                  className="flex-1 md:flex-none bg-rose-50 text-rose-600 px-10 py-4 rounded-full font-black text-[10px] uppercase tracking-widest border border-rose-100 shadow-xl hover:bg-rose-600 hover:text-white transition-all flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" /> Purge Legacy Models
                </button>
                <button
                  onClick={() => setAiPanelOpen(true)}
                  className="flex-1 md:flex-none bg-[#0f1a1c] text-white px-10 py-4 rounded-full font-black text-[10px] uppercase tracking-widest shadow-2xl flex items-center justify-center gap-2 hover:bg-[#3D8593] transition-colors"
                >
                  <Star className="w-4 h-4" /> AI Add Product
                </button>
                <button
                  onClick={() => setEditingProduct('new')}
                  className="flex-1 md:flex-none btn-vibrant-teal px-10 py-4 rounded-full font-black text-[10px] uppercase tracking-widest shadow-2xl flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" /> New Shop Asset
                </button>
              </div>
            )}
          </div>
        </header>

        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="space-y-4 animate-in fade-in duration-700">
            {pricelist.length < 10 && (
              <div className="bg-amber-50 border-l-4 border-amber-500 p-8 rounded-r-xl flex justify-between items-center shadow-lg">
                <div className="flex gap-6 items-center">
                  <div className="p-2 bg-amber-100 rounded-full text-amber-600">
                    <RefreshCcw className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-amber-700 uppercase tracking-tight">Phone Price List: Sync Required</h3>
                    <p className="text-sm font-bold text-amber-500 mt-1">
                      The market price registry for phones is currently empty or incomplete. <br />
                      <span className="text-amber-600 font-black">Note: This will ONLY restore phone prices and will NOT affect your Shop Inventory (golf clubs, kits, etc.)</span>
                    </p>
                  </div>
                </div>
                <button
                  onClick={runSeed}
                  disabled={seeding}
                  className="px-8 py-4 bg-amber-600 text-white rounded-full font-black uppercase text-[10px] tracking-widest hover:bg-black transition-all flex items-center gap-3 shadow-xl"
                >
                  {seeding ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />}
                  {seeding ? 'Syncing Phones...' : 'RESTORE PHONE PRICE LIST'}
                </button>
              </div>
            )}

            {/* NEEDS ATTENTION — the daily action queue */}
            {(() => {
              const newPaidOrders = invoices.filter(i => i.isPaid && i.status === OrderStatus.RECEIVED_BY_AGENT).length;
              const unpaidInvoices = invoices.filter(i => i.paymentStatus === PaymentStatus.UNPAID).length;
              const pendingConsults = consultations.filter(c => c.status === ConsultationStatus.PENDING).length;
              const lowStock = products.filter(p => p.availability === Availability.LOCAL && (p.stockCount || 0) > 0 && (p.stockCount || 0) <= 2).length;
              const outOfStock = products.filter(p => p.availability === Availability.LOCAL && (p.stockCount || 0) === 0).length;
              const actions = [
                { count: newPaidOrders, label: 'New paid orders to process', tab: 'invoices' as const, color: 'text-emerald-600 bg-emerald-50' },
                { count: unpaidInvoices, label: 'Unpaid invoices to follow up', tab: 'invoices' as const, color: 'text-rose-600 bg-rose-50' },
                { count: pendingConsults, label: 'Consultation requests awaiting review', tab: 'consultations' as const, color: 'text-indigo-600 bg-indigo-50' },
                { count: lowStock, label: 'Products running low (≤2 pieces)', tab: 'products' as const, color: 'text-amber-600 bg-amber-50' },
                { count: outOfStock, label: 'Products out of stock', tab: 'products' as const, color: 'text-gray-500 bg-neutral-100' },
              ].filter(a => a.count > 0);

              return (
                <div className="bg-white rounded-2xl border border-neutral-100 overflow-hidden">
                  <div className="px-6 py-4 border-b border-neutral-50 flex items-center justify-between">
                    <h3 className="text-sm font-black text-gray-900 tracking-tight">Needs Attention</h3>
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${actions.length ? 'bg-[#FF9900]/10 text-[#FF9900]' : 'bg-emerald-50 text-emerald-600'}`}>
                      {actions.length ? `${actions.reduce((s, a) => s + a.count, 0)} items` : 'All clear'}
                    </span>
                  </div>
                  {actions.length === 0 ? (
                    <p className="px-6 py-5 text-sm text-gray-400 font-medium">Nothing pending — orders processed, invoices paid, stock healthy. 🎉</p>
                  ) : (
                    <div className="divide-y divide-neutral-50">
                      {actions.map((a) => (
                        <button
                          key={a.label}
                          onClick={() => setActiveTab(a.tab)}
                          className="w-full flex items-center justify-between px-6 py-3 hover:bg-neutral-50/60 transition-colors text-left group"
                        >
                          <span className="flex items-center gap-3">
                            <span className={`min-w-8 h-8 px-2 rounded-lg flex items-center justify-center font-black text-sm ${a.color}`}>{a.count}</span>
                            <span className="font-bold text-[13px] text-gray-900">{a.label}</span>
                          </span>
                          <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-[#3D8593] group-hover:translate-x-1 transition-all" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* STAT TILES — compact, real deltas vs last month */}
            {(() => {
              const now = new Date();
              const monthKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}`;
              const thisKey = monthKey(now);
              const lastKey = monthKey(new Date(now.getFullYear(), now.getMonth() - 1, 1));
              const inMonth = (inv: Invoice, key: string) => {
                const d = inv.createdAt || inv.date;
                return !!d && monthKey(new Date(d)) === key;
              };
              const revThis = invoices.reduce((s, i) => s + (i.isPaid && inMonth(i, thisKey) ? (i.totalKES || 0) : 0), 0);
              const revLast = invoices.reduce((s, i) => s + (i.isPaid && inMonth(i, lastKey) ? (i.totalKES || 0) : 0), 0);
              const ordThis = invoices.filter(i => inMonth(i, thisKey)).length;
              const ordLast = invoices.filter(i => inMonth(i, lastKey)).length;
              const unpaidValue = invoices.reduce((s, i) => s + (i.paymentStatus === PaymentStatus.UNPAID ? (i.totalKES || 0) : 0), 0);
              const unpaidCount = invoices.filter(i => i.paymentStatus === PaymentStatus.UNPAID).length;

              const fmtK = (n: number) => n >= 1000000 ? `${(n / 1000000).toFixed(2)}M` : n >= 1000 ? `${(n / 1000).toFixed(1)}K` : `${n}`;
              const delta = (cur: number, prev: number) => prev > 0 ? ((cur - prev) / prev) * 100 : null;

              const tiles = [
                { label: 'Revenue (Paid)', val: `KES ${fmtK(revThis)}`, d: delta(revThis, revLast), foot: `vs KES ${fmtK(revLast)} last month`, icon: <DollarSign className="w-4 h-4" />, iconBg: 'bg-teal-50 text-[#3D8593]' },
                { label: 'Orders', val: ordThis.toLocaleString(), d: delta(ordThis, ordLast), foot: `vs ${ordLast} last month`, icon: <ShoppingBag className="w-4 h-4" />, iconBg: 'bg-indigo-50 text-indigo-500' },
                { label: 'Outstanding', val: `KES ${fmtK(unpaidValue)}`, d: null, foot: `${unpaidCount} unpaid invoice${unpaidCount === 1 ? '' : 's'}`, icon: <Activity className="w-4 h-4" />, iconBg: 'bg-rose-50 text-rose-500', warn: unpaidCount > 0 },
                { label: 'Visitors', val: visitCount.toLocaleString(), d: null, foot: `${clients.length} registered clients`, icon: <Users className="w-4 h-4" />, iconBg: 'bg-amber-50 text-[#FF9900]' },
              ];
              return (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {tiles.map((t) => (
                    <div key={t.label} className="bg-white px-5 py-4 rounded-2xl border border-neutral-100 hover:border-neutral-200 transition-colors">
                      <div className="flex items-center justify-between mb-2.5">
                        <p className="text-xs font-bold text-gray-500">{t.label}</p>
                        <span className={`w-7 h-7 rounded-lg flex items-center justify-center ${t.iconBg}`}>{t.icon}</span>
                      </div>
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <h2 className="text-2xl font-black text-gray-900 tracking-tight">{t.val}</h2>
                        {t.d !== null && (
                          <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md ${t.d >= 0 ? 'text-emerald-600 bg-emerald-50' : 'text-rose-500 bg-rose-50'}`}>
                            {t.d >= 0 ? '▲' : '▼'} {Math.abs(t.d).toFixed(1)}%
                          </span>
                        )}
                        {t.warn && <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md text-rose-500 bg-rose-50">follow up</span>}
                      </div>
                      <p className="text-[10px] font-medium text-gray-400 mt-1.5">{t.foot}</p>
                    </div>
                  ))}
                </div>
              );
            })()}

            {(() => {
              // --- Monthly paid revenue, last 6 months (current month highlighted) ---
              const now = new Date();
              const months: { key: string; name: string; revenue: number }[] = [];
              for (let i = 5; i >= 0; i--) {
                const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                months.push({ key: `${d.getFullYear()}-${d.getMonth()}`, name: d.toLocaleString('default', { month: 'short' }), revenue: 0 });
              }
              invoices.forEach(inv => {
                if (!inv.isPaid) return;
                const ds = inv.createdAt || inv.date;
                if (!ds) return;
                const d = new Date(ds);
                const m = months.find(x => x.key === `${d.getFullYear()}-${d.getMonth()}`);
                if (m) m.revenue += (inv.totalKES || 0) / 1000; // in thousands
              });
              const currentKey = `${now.getFullYear()}-${now.getMonth()}`;
              const totalPaid = invoices.reduce((s, i) => s + (i.isPaid ? (i.totalKES || 0) : 0), 0);
              const rev5 = months[4].revenue, rev6 = months[5].revenue;
              const trendPct = rev5 > 0 ? ((rev6 - rev5) / rev5) * 100 : null;

              // --- Orders by weekday (most active day) ---
              const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
              const weekdays = dayNames.map(name => ({ name, orders: 0 }));
              invoices.forEach(inv => {
                const ds = inv.createdAt || inv.date;
                if (ds) weekdays[new Date(ds).getDay()].orders++;
              });
              const maxDay = weekdays.reduce((a, b) => (b.orders > a.orders ? b : a), weekdays[0]);

              return (
                <div className="grid lg:grid-cols-3 gap-4">
                  {/* REVENUE — bar chart, current month highlighted */}
                  <div className="lg:col-span-2 bg-white rounded-2xl border border-neutral-100 p-6">
                    <div className="flex items-start justify-between mb-1">
                      <div>
                        <p className="text-xs font-bold text-gray-500 mb-1">Total Paid Revenue</p>
                        <div className="flex items-baseline gap-2">
                          <h3 className="text-3xl font-black text-gray-900 tracking-tight">
                            KES {totalPaid >= 1000000 ? `${(totalPaid / 1000000).toFixed(2)}M` : `${Math.round(totalPaid / 1000)}K`}
                          </h3>
                          {trendPct !== null && (
                            <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md ${trendPct >= 0 ? 'text-emerald-600 bg-emerald-50' : 'text-rose-500 bg-rose-50'}`}>
                              {trendPct >= 0 ? '▲' : '▼'} {Math.abs(trendPct).toFixed(1)}% vs last month
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-gray-300 bg-neutral-50 px-3 py-1.5 rounded-lg">Last 6 months</span>
                    </div>
                    <div className="h-[230px] w-full mt-4">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={months} barCategoryGap="28%">
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 700, fill: '#9ca3af' }} />
                          <YAxis axisLine={false} tickLine={false} width={40} tick={{ fontSize: 10, fontWeight: 700, fill: '#c4c8ce' }} tickFormatter={(v: number) => `${v}K`} />
                          <Tooltip
                            cursor={{ fill: 'rgba(61,133,147,0.05)' }}
                            formatter={(v: number) => [`KES ${(v * 1000).toLocaleString()}`, 'Revenue']}
                            contentStyle={{ borderRadius: '0.75rem', border: '1px solid #f3f4f6', boxShadow: '0 10px 30px rgba(0,0,0,0.08)', fontSize: 12, fontWeight: 700 }}
                          />
                          <Bar dataKey="revenue" radius={[6, 6, 0, 0]}>
                            {months.map(m => (
                              <Cell key={m.key} fill={m.key === currentKey ? '#0f1a1c' : '#e2e8ec'} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* RIGHT COLUMN — activity + categories */}
                  <div className="flex flex-col gap-4">
                    {/* Most active day */}
                    <div className="bg-white rounded-2xl border border-neutral-100 p-6 flex-1">
                      <div className="flex items-center justify-between mb-4">
                        <p className="text-xs font-bold text-gray-500">Most Active Day</p>
                        <span className="text-[10px] font-black uppercase tracking-widest text-[#3D8593] bg-teal-50 px-2.5 py-1 rounded-lg">{maxDay.name}</span>
                      </div>
                      <div className="h-[120px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={weekdays} barCategoryGap="30%">
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 700, fill: '#9ca3af' }} />
                            <Tooltip
                              cursor={{ fill: 'rgba(61,133,147,0.05)' }}
                              formatter={(v: number) => [`${v} orders`, '']}
                              contentStyle={{ borderRadius: '0.75rem', border: '1px solid #f3f4f6', boxShadow: '0 10px 30px rgba(0,0,0,0.08)', fontSize: 11, fontWeight: 700 }}
                            />
                            <Bar dataKey="orders" radius={[4, 4, 4, 4]}>
                              {weekdays.map(d => (
                                <Cell key={d.name} fill={d.name === maxDay.name ? '#3D8593' : '#e2e8ec'} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                      <p className="text-[10px] font-medium text-gray-400 mt-2">Orders received per weekday — schedule posts &amp; restocks around {maxDay.name}.</p>
                    </div>

                    {/* Category donut with centre total */}
                    <div className="bg-white rounded-2xl border border-neutral-100 p-6">
                      <p className="text-xs font-bold text-gray-500 mb-2">Stock by Category</p>
                      <div className="flex items-center gap-4">
                        <div className="relative w-[110px] h-[110px] shrink-0">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie data={categoryData} innerRadius={38} outerRadius={52} paddingAngle={4} dataKey="value" stroke="none">
                                {categoryData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                              </Pie>
                              <Tooltip contentStyle={{ borderRadius: '0.75rem', border: '1px solid #f3f4f6', fontSize: 11, fontWeight: 700 }} />
                            </PieChart>
                          </ResponsiveContainer>
                          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span className="text-lg font-black text-gray-900 leading-none">{products.length}</span>
                            <span className="text-[8px] font-black uppercase tracking-widest text-gray-400 mt-0.5">items</span>
                          </div>
                        </div>
                        <div className="flex-1 space-y-1.5 min-w-0">
                          {categoryData.slice(0, 5).map((c, i) => (
                            <div key={i} className="flex justify-between items-center gap-2">
                              <span className="flex items-center gap-1.5 min-w-0">
                                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: c.color }}></span>
                                <span className="text-[10px] font-bold text-gray-500 truncate">{c.name}</span>
                              </span>
                              <span className="text-[10px] font-black text-gray-900">{c.value}</span>
                            </div>
                          ))}
                          {categoryData.length > 5 && (
                            <p className="text-[9px] font-bold text-gray-300">+{categoryData.length - 5} more categories</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* BEST SELLING PRODUCTS — what's moving fast (from real paid orders) */}
            {(() => {
              const sales: Record<string, { sold: number; revenue: number; lastSold: number }> = {};
              invoices.forEach(inv => {
                if (!inv.isPaid || !inv.productName) return;
                const key = inv.productName.replace(/\s*\(.*\)$/, '').trim();
                if (!sales[key]) sales[key] = { sold: 0, revenue: 0, lastSold: 0 };
                sales[key].sold += inv.quantity || 1;
                sales[key].revenue += inv.totalKES || 0;
                const t = new Date(inv.createdAt || inv.date || 0).getTime();
                if (t > sales[key].lastSold) sales[key].lastSold = t;
              });
              const top = Object.entries(sales).sort((a, b) => b[1].revenue - a[1].revenue).slice(0, 6);
              if (top.length === 0) return null;
              return (
                <div className="bg-white rounded-2xl border border-neutral-100 overflow-hidden">
                  <div className="px-6 py-4 border-b border-neutral-50 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-black text-gray-900 tracking-tight">Best Selling Products</h3>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Ranked by paid revenue — restocking &amp; marketing focus</p>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-neutral-50">
                          <th className="px-8 py-4 text-[9px] font-black uppercase tracking-[0.2em] text-gray-400">#</th>
                          <th className="px-4 py-4 text-[9px] font-black uppercase tracking-[0.2em] text-gray-400">Product</th>
                          <th className="px-4 py-4 text-[9px] font-black uppercase tracking-[0.2em] text-gray-400">Units Sold</th>
                          <th className="px-4 py-4 text-[9px] font-black uppercase tracking-[0.2em] text-gray-400">Revenue</th>
                          <th className="px-8 py-4 text-[9px] font-black uppercase tracking-[0.2em] text-gray-400">Last Sold</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-50">
                        {top.map(([name, s], i) => (
                          <tr key={name} className="hover:bg-neutral-50/50 transition-colors">
                            <td className="px-8 py-4">
                              <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-black ${i === 0 ? 'bg-[#FF9900]/10 text-[#FF9900]' : 'bg-neutral-100 text-gray-500'}`}>{i + 1}</span>
                            </td>
                            <td className="px-4 py-4 font-bold text-sm text-gray-900 max-w-[280px] truncate">{name}</td>
                            <td className="px-4 py-4"><span className="px-2.5 py-1 bg-teal-50 text-[#3D8593] rounded-lg text-xs font-black">{s.sold} sold</span></td>
                            <td className="px-4 py-4 font-black text-sm text-gray-900">KES {s.revenue.toLocaleString()}</td>
                            <td className="px-8 py-4 text-xs text-gray-400 font-medium">{s.lastSold ? new Date(s.lastSold).toLocaleDateString('en-GB') : '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* CLIENTS CRM TAB */}
        {activeTab === 'clients' && (
          <div className="space-y-10 animate-in fade-in duration-700">
            <div className="relative group max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
              <input
                type="search"
                placeholder="Search by name, email, or location…"
                className="w-full h-12 bg-white border border-neutral-200 rounded-full pl-11 pr-5 text-sm font-medium outline-none focus:border-[#3D8593] transition-colors"
                value={adminSearchTerm}
                onChange={(e) => setAdminSearchTerm(e.target.value)}
              />
            </div>

            <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm overflow-hidden overflow-x-auto no-scrollbar">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-neutral-50/50 border-b border-neutral-100">
                    <th className="px-4 py-3 text-[9px] font-black uppercase tracking-[0.2em] text-gray-400">Client Identity</th>
                    <th className="px-3 py-3 text-[9px] font-black uppercase tracking-[0.2em] text-gray-400">HQ & Region</th>
                    <th className="px-3 py-3 text-[9px] font-black uppercase tracking-[0.2em] text-gray-400">Financial Value</th>
                    <th className="px-3 py-3 text-[9px] font-black uppercase tracking-[0.2em] text-gray-400">Buying Pulse</th>
                    <th className="px-4 py-3 text-right text-[9px] font-black uppercase tracking-[0.2em] text-gray-400">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-50">
                  {filteredClients.map(client => (
                    <tr key={client.id} className="hover:bg-neutral-50/30 transition-colors group">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-teal-50 to-indigo-50 rounded-xl flex items-center justify-center text-[#3D8593] font-black text-base border border-white shrink-0">
                            {client.name.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-black text-gray-900 text-sm tracking-tight leading-none truncate max-w-[180px]">{client.name}</p>
                            <p className="text-[10px] text-gray-400 font-bold mt-1 lowercase truncate max-w-[180px]">{client.email}</p>
                            <p className="text-[9px] text-[#3D8593] font-bold mt-0.5">{client.phone}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <p className="font-bold text-sm flex items-center gap-2 text-gray-900"><MapPin className="w-4 h-4 text-[#3D8593]" /> {client.location}</p>
                        <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-widest">Member since {client.joinedDate}</p>
                      </td>
                      <td className="px-3 py-3">
                        <p className="text-xl font-black text-gray-900 tracking-tighter">KES {client.totalSpentKES.toLocaleString()}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest ${client.purchaseFrequency === 'High' ? 'bg-emerald-50 text-emerald-500' : 'bg-orange-50 text-orange-500'}`}>
                            {client.purchaseFrequency} Frequency
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {client.purchasedItems.slice(0, 2).map((item, i) => (
                            <span key={i} className="px-2.5 py-1 bg-white border border-neutral-100 rounded-lg text-[9px] font-black uppercase tracking-widest text-gray-500">{item}</span>
                          ))}
                          {client.purchasedItems.length > 2 && (
                            <span className="px-2 py-1 bg-neutral-100 rounded-lg text-[8px] font-black uppercase tracking-widest text-gray-400">+{client.purchasedItems.length - 2} More</span>
                          )}
                        </div>
                        <p className="text-[9px] text-gray-300 font-bold uppercase tracking-widest">Last Activity: {client.lastOrderDate}</p>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          {client.email && (
                            <a
                              href={`mailto:${client.email}?subject=${encodeURIComponent('LegitGrinder — New arrivals & price drops')}`}
                              title={`Email ${client.name}`}
                              className="p-2 bg-teal-50 text-[#3D8593] rounded-2xl hover:bg-[#3D8593] hover:text-white transition-all"
                            ><Mail className="w-4 h-4" /></a>
                          )}
                          {client.phone && (
                            <a
                              href={`https://wa.me/${client.phone.replace(/\D/g, '').replace(/^0/, '254')}?text=${encodeURIComponent(`Hi ${client.name.split(' ')[0]}! It's LegitGrinder — `)}`}
                              target="_blank" rel="noopener noreferrer"
                              title={`WhatsApp ${client.name}`}
                              className="p-2 bg-emerald-50 text-emerald-600 rounded-2xl hover:bg-[#25D366] hover:text-white transition-all"
                            ><MessageCircle className="w-4 h-4" /></a>
                          )}
                          <button title="Remove Client" onClick={() => handleDeleteClient(client.id)} className="p-2 bg-rose-50 text-rose-500 rounded-2xl hover:bg-rose-500 hover:text-white transition-all"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* INVOICES MANAGEMENT TAB */}
        {activeTab === 'invoices' && (
          <div className="space-y-10 animate-in fade-in duration-700">
            <div className="flex justify-between items-center px-4">
              <h2 className="text-3xl font-black text-gray-900 tracking-tighter uppercase italic">Order <span className="text-[#3D8593]">Control</span></h2>
              <div className="flex gap-4 flex-wrap">
                <button
                  onClick={() => setIsCreatingRefund(true)}
                  className="px-8 py-3 bg-rose-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all flex items-center gap-2 shadow-xl"
                >
                  <RefreshCcw className="w-4 h-4" /> Refund Generator
                </button>
                <button
                  onClick={() => { setImageInvoiceItems([{ name: '', specs: '', imageUrl: '', quantity: 1, priceKES: 0 }]); setImageInvoiceClient({ name: '', whatsapp: '' }); setIsCreatingImageInvoice(true); }}
                  className="px-8 py-3 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all flex items-center gap-2 shadow-xl"
                >
                  <ImageIcon className="w-4 h-4" /> Image Invoice
                </button>
                <button
                  onClick={() => setIsCreatingManualInvoice(true)}
                  className="px-8 py-3 bg-black text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-[#3D8593] transition-all flex items-center gap-2 shadow-xl"
                >
                  <Plus className="w-4 h-4" /> Create Manual Order
                </button>
              </div>
            </div>

            {/* ACTION CENTER — the "watcher": orders needing attention right now */}
            {(() => {
              const attention = computeAttention(invoices);
              if (attention.length === 0) return (
                <div className="rounded-[2rem] border border-teal-100 bg-teal-50/40 px-6 py-5 flex items-center gap-3">
                  <Activity className="w-5 h-5 text-[#3D8593]" />
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-widest text-[#3D8593]">Action Center · All clear</p>
                    <p className="text-xs text-gray-500 font-medium mt-0.5">Nothing needs you right now. Orders past their port grace window or ready-with-a-balance will appear here.</p>
                  </div>
                </div>
              );
              return (
                <div className="rounded-[2rem] border border-amber-200 bg-amber-50/60 p-6 md:p-7">
                  <div className="flex items-center gap-2.5 mb-4">
                    <Activity className="w-5 h-5 text-amber-600" />
                    <h3 className="text-[11px] font-black uppercase tracking-widest text-amber-700">Needs your attention · {attention.length}</h3>
                  </div>
                  <div className="space-y-2.5">
                    {attention.map((a) => (
                      <div key={a.invoice.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white rounded-2xl border border-amber-100 px-5 py-4">
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-gray-900 truncate">{a.invoice.clientName} · {a.invoice.productName}</p>
                          <p className="text-xs text-gray-500 font-medium mt-0.5">{a.message}</p>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <button
                            onClick={() => setTrackingInvoice(a.invoice)}
                            className="px-4 py-2.5 rounded-full bg-teal-50 text-[#3D8593] text-[10px] font-black uppercase tracking-widest hover:bg-[#3D8593] hover:text-white transition-all flex items-center gap-1.5"
                          >
                            <Truck className="w-3.5 h-3.5" /> Tracking
                          </button>
                          {a.suggestedIntent && (
                            <button
                              onClick={() => { setMessageIntent(a.suggestedIntent!); setMessagingInvoice(a.invoice); }}
                              className="px-4 py-2.5 rounded-full bg-[#25D366]/10 text-[#1eb955] text-[10px] font-black uppercase tracking-widest hover:bg-[#25D366] hover:text-white transition-all flex items-center gap-1.5"
                            >
                              <MessageCircle className="w-3.5 h-3.5" /> Draft
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* ORDER CONTROL BAR — search / filter / sort / export */}
            <div className="bg-white rounded-[2rem] border border-neutral-100 shadow-sm p-5 space-y-4">
              <div className="flex flex-col xl:flex-row gap-3">
                <div className="relative flex-1 min-w-[220px]">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                  <input
                    type="search"
                    placeholder="Search invoice #, client, product, Paystack ref…"
                    value={invoiceSearch}
                    onChange={(e) => setInvoiceSearch(e.target.value)}
                    className="w-full h-12 bg-neutral-50 border border-neutral-100 rounded-full pl-11 pr-5 text-sm font-medium outline-none focus:border-[#3D8593] transition-colors"
                  />
                </div>
                <div className="flex flex-wrap gap-3">
                  {/* Delivered / Not-delivered / To-review quick toggle */}
                  <div className="flex h-12 items-center gap-1 bg-neutral-50 border border-neutral-100 rounded-full p-1">
                    {([
                      ['all', 'All'],
                      ['undelivered', 'Not Delivered'],
                      ['delivered', 'Delivered'],
                      ['toreview', 'To Review'],
                    ] as const).map(([val, label]) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setInvoiceFilterDelivery(val)}
                        className={`relative h-full px-4 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
                          invoiceFilterDelivery === val
                            ? 'bg-[#3D8593] text-white shadow-sm'
                            : 'text-gray-400 hover:text-gray-600'
                        }`}
                      >
                        {label}
                        {val === 'toreview' && toReviewCount > 0 && (
                          <span className={`ml-1.5 inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full text-[9px] ${
                            invoiceFilterDelivery === val ? 'bg-white/25 text-white' : 'bg-amber-400 text-white'
                          }`}>
                            {toReviewCount}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                  <select
                    value={invoiceFilterPayment}
                    onChange={(e) => setInvoiceFilterPayment(e.target.value as any)}
                    className="h-12 bg-neutral-50 border border-neutral-100 rounded-full px-5 text-[10px] font-black uppercase tracking-widest outline-none focus:border-[#3D8593]"
                  >
                    <option value="all">All Payments</option>
                    {Object.values(PaymentStatus).map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <select
                    value={invoiceFilterMonth}
                    onChange={(e) => setInvoiceFilterMonth(e.target.value)}
                    className="h-12 bg-neutral-50 border border-neutral-100 rounded-full px-5 text-[10px] font-black uppercase tracking-widest outline-none focus:border-[#3D8593]"
                  >
                    <option value="all">All Months</option>
                    {invoiceMonths.map(m => (
                      <option key={m} value={m}>
                        {new Date(m + '-02').toLocaleString('default', { month: 'long', year: 'numeric' })}
                      </option>
                    ))}
                  </select>
                  <select
                    value={invoiceFilterAgent}
                    onChange={(e) => {
                      if (e.target.value === '__manage') { setShowAgentManager(true); return; }
                      setInvoiceFilterAgent(e.target.value);
                    }}
                    className="h-12 bg-neutral-50 border border-neutral-100 rounded-full px-5 text-[10px] font-black uppercase tracking-widest outline-none focus:border-[#3D8593]"
                    title="Filter by the shipping agent that carried the order"
                  >
                    <option value="all">All Agents</option>
                    {shippingAgents.map(a => <option key={a.id} value={a.name}>{a.name}</option>)}
                    <option value="none">Untagged</option>
                    <option value="__manage">⚙ Manage agents…</option>
                  </select>
                  <select
                    value={invoiceSort}
                    onChange={(e) => setInvoiceSort(e.target.value as any)}
                    className="h-12 bg-neutral-50 border border-neutral-100 rounded-full px-5 text-[10px] font-black uppercase tracking-widest outline-none focus:border-[#3D8593]"
                  >
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                    <option value="highest">Highest Value</option>
                    <option value="lowest">Lowest Value</option>
                  </select>
                  <button
                    onClick={handleExportOrders}
                    className="h-12 px-6 bg-[#3D8593] text-white rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all flex items-center gap-2"
                    title="Export the filtered orders to Excel"
                  >
                    <Download className="w-4 h-4" /> Export Filtered
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-6 pt-3 border-t border-neutral-50">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                  <span className="text-gray-900 text-sm mr-1">{invoiceSummary.count}</span> Orders
                </p>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                  <span className="text-[#3D8593] text-sm mr-1">KES {invoiceSummary.totalKES.toLocaleString()}</span> Filtered Value
                </p>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                  <span className="text-rose-500 text-sm mr-1">{invoiceSummary.unpaid}</span> Unpaid
                </p>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                  <span className="text-[#FF9900] text-sm mr-1">{invoiceSummary.inTransit}</span> Not Yet Delivered
                </p>
                {(invoiceSearch || invoiceFilterPayment !== 'all' || invoiceFilterDelivery !== 'all' || invoiceFilterMonth !== 'all' || invoiceFilterAgent !== 'all') && (
                  <button
                    onClick={() => { setInvoiceSearch(''); setInvoiceFilterPayment('all'); setInvoiceFilterDelivery('all'); setInvoiceFilterMonth('all'); setInvoiceFilterAgent('all'); }}
                    className="text-[10px] font-black uppercase tracking-widest text-[#FF9900] hover:underline ml-auto"
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm overflow-hidden overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-neutral-50/50 border-b border-neutral-100">
                    <th className="px-4 py-3 text-[9px] font-black uppercase tracking-[0.2em] text-gray-400">Order/Invoice</th>
                    <th className="px-3 py-3 text-[9px] font-black uppercase tracking-[0.2em] text-gray-400">QTY</th>
                    <th className="px-3 py-3 text-[9px] font-black uppercase tracking-[0.2em] text-gray-400">Client Status</th>
                    <th className="px-3 py-3 text-[9px] font-black uppercase tracking-[0.2em] text-gray-400">Logistics Phase</th>
                    <th className="px-12 py-10 text-right text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">Management</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-50">
                  {filteredInvoices.map(inv => (
                    <tr key={inv.id} className="hover:bg-neutral-50/30 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-black text-gray-900 text-sm tracking-tight leading-none">#{inv.invoiceNumber}</p>
                        <p className="text-[9px] text-[#3D8593] font-black uppercase tracking-widest mt-1 max-w-[180px] truncate" title={inv.productName}>{inv.productName}</p>
                        <p className="text-[8px] text-gray-400 font-bold mt-0.5 uppercase">{inv.createdAt ? new Date(inv.createdAt).toLocaleDateString('en-GB') : 'Date Unknown'}</p>
                      </td>
                      <td className="px-3 py-3">
                        <span className="bg-neutral-100 text-gray-600 px-3 py-1 rounded-lg text-xs font-black">×{inv.quantity || 1}</span>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-bold text-sm text-gray-900">{inv.clientName}</p>
                            <p className="text-[9px] text-gray-400 font-medium mt-1">Ref: {inv.paystackReference || 'Manual Sync'}</p>
                            {/* What they owe, in figures — a status alone can't
                                answer "how much is left?" */}
                            {(() => {
                              const m = moneyOf(inv);
                              const cur = inv.currency || 'KES';
                              const fig = (n: number) => `${cur} ${n.toLocaleString()}`;
                              if (m.unrecorded) return (
                                <button
                                  onClick={() => { setDepositAmount(''); setDepositFor(inv); }}
                                  className="mt-1 text-[9px] font-black uppercase tracking-wide text-rose-500 hover:text-rose-700 transition-colors"
                                  title="No deposit recorded — the balance can't be worked out until you enter it"
                                >
                                  ⚠ Deposit not recorded — set it
                                </button>
                              );
                              if (inv.isPaid) return (
                                <p className="mt-1 text-[9px] font-black uppercase tracking-wide text-emerald-600">{fig(m.total)} · Settled</p>
                              );
                              return (
                                <p className="mt-1 text-[9px] font-black uppercase tracking-wide text-gray-500">
                                  {m.paid > 0 && <span className="text-emerald-600">Paid {fig(m.paid)} · </span>}
                                  <span className="text-amber-600">Bal {fig(m.balance)}</span>
                                </p>
                              );
                            })()}
                          </div>
                          <select
                            value={inv.paymentStatus}
                            onChange={(e) => applyPaymentStatus(inv, e.target.value as PaymentStatus)}
                            className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest outline-none border transition-all ${inv.paymentStatus === PaymentStatus.PAID ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                              inv.paymentStatus === PaymentStatus.PARTIALLY_PAID ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                'bg-rose-50 text-rose-600 border-rose-100'
                              }`}
                          >
                            {Object.values(PaymentStatus).map(s => (
                              <option key={s} value={s} className="bg-white text-gray-900">{s}</option>
                            ))}
                          </select>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <select
                          value={inv.status}
                          onChange={(e) => updateInvoiceStatusInDB(inv.id, e.target.value as OrderStatus, getOrderProgress(e.target.value as OrderStatus))}
                          className="bg-neutral-50 border border-neutral-100 rounded-lg px-2 py-1.5 text-[9px] font-black uppercase tracking-wide outline-none focus:ring-2 focus:ring-teal-100 max-w-[150px]"
                        >
                          {Object.values(OrderStatus).map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        {/* Shipping agent tag — who carried this order */}
                        <select
                          value={inv.shippingAgent || ''}
                          onChange={(e) => handleTagOrder(inv, e.target.value || null)}
                          title="Tag the shipping agent that carried this order"
                          className={`mt-1.5 block rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-wide outline-none border cursor-pointer max-w-[150px] ${
                            inv.shippingAgent
                              ? AGENT_COLORS[agentColorOf(inv.shippingAgent)] || AGENT_COLORS.slate
                              : 'bg-white text-gray-300 border-dashed border-gray-200'
                          }`}
                        >
                          <option value="">+ Agent</option>
                          {shippingAgents.map(a => <option key={a.id} value={a.name}>{a.name}</option>)}
                        </select>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => setTrackingInvoice(inv)}
                            className="p-2 bg-teal-50 text-[#3D8593] rounded-2xl hover:bg-[#3D8593] hover:text-white transition-all"
                            title="Update tracking / logistics"
                          >
                            <Truck className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => { setMessageIntent(undefined); setMessagingInvoice(inv); }}
                            className="p-2 bg-[#25D366]/10 text-[#1eb955] rounded-2xl hover:bg-[#25D366] hover:text-white transition-all"
                            title="AI writes the update — send it by WhatsApp or email (arrived, shipped, reminder…)"
                          >
                            <MessageCircle className="w-4 h-4" />
                          </button>
                          {inv.status === OrderStatus.DELIVERED && (
                            <button
                              onClick={() => { setMessageIntent('review'); setMessagingInvoice(inv); }}
                              className="p-2 bg-amber-50 text-amber-500 rounded-2xl hover:bg-amber-400 hover:text-white transition-all"
                              title="Request a review — AI writes the WhatsApp message with your Google review link"
                            >
                              <Star className="w-4 h-4" />
                            </button>
                          )}
                          {!inv.isPaid && (
                            <button
                              onClick={() => {
                                const payUrl = `${window.location.origin}/pay/${inv.invoiceNumber}`;
                                navigator.clipboard.writeText(payUrl).then(() => alert(`💳 Pay link copied!\n\n${payUrl}\n\nSend it to ${inv.clientName} — they pay via Paystack (card/M-Pesa) and you get a WhatsApp confirmation with the reference.`));
                              }}
                              className="p-2 bg-emerald-50 text-emerald-600 rounded-2xl hover:bg-emerald-600 hover:text-white transition-all"
                              title="Copy Pay Link (send to client to pay this invoice)"
                            >
                              <CreditCard className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={async () => {
                              const paidSoFar = inv.amountPaidKES || 0;
                              const balance = Math.max((inv.totalKES || 0) - paidSoFar, 0);
                              // Part-paid with no deposit on record: the email would
                              // bill them the whole total again. Stop, don't send.
                              if (moneyOf(inv).unrecorded) {
                                alert(
                                  `Can't email this yet.\n\n${inv.invoiceNumber} is marked Partially Paid, but no deposit amount was ever recorded — ` +
                                  `so this email would ask ${inv.clientName} for the full ${inv.currency || 'KES'} ${(inv.totalKES || 0).toLocaleString()} ` +
                                  `they've already part-paid.\n\nSet the amount received on the order first (the red "Deposit not recorded" link on the row).`
                                );
                                setDepositAmount('');
                                setDepositFor(inv);
                                return;
                              }
                              const isDeposit = !inv.isPaid && paidSoFar > 0;
                              const label = inv.isPaid ? 'receipt' : isDeposit ? 'balance invoice' : 'invoice';
                              const to = inv.clientEmail || prompt(`Email the ${label} for ${inv.invoiceNumber} to which address?`, '');
                              if (!to) return;
                              const kind = inv.isPaid ? 'receipt' as const : 'invoice' as const;
                              const docData = {
                                kind,
                                invoiceNumber: inv.invoiceNumber,
                                clientName: inv.clientName,
                                productName: inv.productName,
                                items: inv.items,
                                currency: inv.currency,
                                totalKES: inv.totalKES || 0,
                                amountPaidKES: inv.isPaid ? (inv.totalKES || 0) : (paidSoFar > 0 ? paidSoFar : undefined),
                                balanceKES: inv.isPaid ? 0 : balance,
                                reference: inv.paystackReference,
                              };
                              const attachment = await generateDocumentAttachment(docData);
                              const r = await sendInvoiceEmail({
                                ...docData,
                                to,
                                payUrl: inv.isPaid ? undefined : `${window.location.origin}/pay/${inv.invoiceNumber}`,
                                attachment,
                              });
                              alert(r.success ? `✅ ${label.charAt(0).toUpperCase() + label.slice(1)} + PDF emailed to ${to}${isDeposit ? ` (balance due: ${inv.currency || 'KES'} ${balance.toLocaleString()})` : ''}` : `❌ Email failed: ${r.error || 'unknown error'}`);
                            }}
                            className={`p-2 rounded-2xl transition-all ${!inv.isPaid && (inv.amountPaidKES || 0) > 0 ? 'bg-amber-50 text-amber-600 hover:bg-amber-500 hover:text-white' : 'bg-teal-50 text-[#3D8593] hover:bg-[#3D8593] hover:text-white'}`}
                            title={inv.isPaid ? 'Email receipt (+PDF) to client' : (inv.amountPaidKES || 0) > 0 ? 'Email pay-balance link (+PDF) to client' : 'Email invoice (+PDF) to client'}
                          >
                            <Mail className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              const printWin = window.open('', '', 'width=900,height=1000');
                              if (!printWin) return;
                              const logoUrl = "https://res.cloudinary.com/dsthpp4oj/image/upload/v1766830586/legitGrinder_PNG_3x-100_oikrja.jpg";
                              const dispTotal = inv.totalKES ? `${inv.currency || 'KES'} ${inv.totalKES.toLocaleString()}` : 'TBD';
                              const dispUnit = inv.totalKES ? (inv.totalKES / (inv.quantity || 1)).toLocaleString() : 'TBD';

                              printWin.document.write(`
                                <html>
                                  <head>
                                    <title>Invoice ${inv.invoiceNumber}</title>
                                    <style>
                                      body { font-family: 'Inter', sans-serif; padding: 60px; color: #1a1a1a; position: relative; }
                                      .watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); opacity: 0.03; width: 80%; z-index: -1; }
                                      .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 60px; }
                                      .brand h1 { margin: 0; font-size: 32px; font-weight: 900; }
                                      .brand p { margin: 5px 0 0; font-size: 14px; font-weight: 500; color: #666; }
                                      .logo { width: 120px; }
                                      .meta { text-align: right; margin-top: 20px; }
                                      .meta p { margin: 5px 0; font-size: 14px; font-weight: 700; }
                                      .meta span { font-weight: 400; color: #666; margin-right: 10px; }
                                      .title { text-align: center; font-size: 24px; font-weight: 500; margin: 40px 0; letter-spacing: 1px; }
                                      table { width: 100%; border-collapse: collapse; margin-bottom: 40px; }
                                      th { background: #3d8593; color: white; padding: 15px; text-align: left; text-transform: uppercase; font-size: 12px; font-weight: 900; letter-spacing: 1px; }
                                      td { padding: 20px 15px; border-bottom: 1px solid #eee; font-size: 14px; }
                                      .total-row td { border: none; padding-top: 30px; font-size: 18px; font-weight: 900; text-align: right; }
                                      .terms { margin-top: 60px; border-top: 2px solid #000; padding-top: 20px; }
                                      .terms h2 { font-size: 14px; font-weight: 900; text-transform: uppercase; margin-bottom: 15px; }
                                      .terms p { font-size: 13px; color: #444; margin: 8px 0; line-height: 1.6; }
                                      .footer { margin-top: 100px; text-align: center; font-size: 12px; font-weight: 500; color: #999; }
                                    </style>
                                  </head>
                                  <body>
                                    <img src="${logoUrl}" class="watermark" />
                                    <div class="header">
                                      <div class="brand">
                                        <h1>LegitGrinder</h1>
                                        <p>+254791873538</p>
                                      </div>
                                      <img src="${logoUrl}" class="logo" />
                                    </div>
                                    <div class="meta">
                                      <p><span>Quote Date:</span> ${new Date(inv.date || inv.createdAt).toLocaleDateString('en-GB')}</p>
                                      <p><span>Client Details:</span> ${inv.clientName}</p>
                                      <p><span>Invoice No:</span> ${inv.invoiceNumber}</p>
                                      <p><span>Web:</span> www.legitgrinder.com</p>
                                    </div>
                                    <div class="title">${inv.productName} Invoice</div>
                                    <table>
                                      <thead>
                                        <tr>
                                          <th style="width: 10%">QTY</th>
                                          <th style="width: 50%">Description</th>
                                          <th style="width: 20%">Unit Price</th>
                                          <th style="width: 20%">Amount</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        ${(inv.items && inv.items.length > 0) ? inv.items.map(item => `
                                          <tr>
                                            <td>${item.quantity.toFixed(2)}</td>
                                            <td>${item.name}</td>
                                            <td>${item.priceKES ? `${inv.currency || 'KES'} ${(item.priceKES / item.quantity).toLocaleString()}` : 'TBD'}</td>
                                            <td>${item.priceKES ? `${inv.currency || 'KES'} ${item.priceKES.toLocaleString()}` : 'TBD'}</td>
                                          </tr>
                                        `).join('') : `
                                          <tr>
                                            <td>${(inv.quantity || 1).toFixed(2)}</td>
                                            <td>${inv.productName}</td>
                                            <td>${inv.totalKES ? `${inv.currency || 'KES'} ${dispUnit}` : 'TBD'}</td>
                                            <td>${dispTotal}</td>
                                          </tr>
                                        `}
                                        <tr class="total-row">
                                          <td colspan="3">Total</td>
                                          <td style="border-bottom: 3px double #000; padding-bottom: 5px;">${dispTotal}</td>
                                        </tr>
                                      </tbody>
                                    </table>
                                    <div class="terms">
                                      <h2>Terms and Conditions</h2>
                                      <p>The total fee is all inclusive to Nairobi, the client will cater for delivery to their home/work location.</p>
                                      <p>Payment is done via mobile money/cash.</p>
                                      <p>Shipping duration via air(2 weeks) sea(30-45days)</p>
                                    </div>
                                    <div class="footer">LegitGrinder KE deals in imports</div>
                                  </body>
                                </html>
                              `);
                              printWin.document.close();
                              printWin.print();
                            }}
                            className="p-2 bg-teal-50 text-[#3D8593] rounded-2xl hover:bg-[#3D8593] hover:text-white transition-all"
                            title="Generate Elite Invoice"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setPrintingReceiptInvoice(inv)}
                            className="p-2 bg-rose-50 text-rose-600 rounded-2xl hover:bg-rose-600 hover:text-white transition-all"
                            title="Print Official Receipt"
                          >
                            <FileText className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              const printWin = window.open('', '', 'width=700,height=800');
                              if (!printWin) return;
                              printWin.document.write(`
                                <html>
                                  <head>
                                    <title>Tax Record - ${inv.invoiceNumber}</title>
                                    <style>
                                      body { font-family: 'Inter', sans-serif; padding: 40px; color: #1a1a1a; }
                                      .header { font-size: 20px; font-weight: bold; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 30px; text-transform: uppercase; }
                                      .meta { margin-bottom: 30px; font-size: 14px; }
                                      .meta p { margin: 5px 0; }
                                      table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                                      th, td { border: 1px solid #ccc; padding: 12px; text-align: left; }
                                      th { background: #f5f5f5; font-weight: bold; }
                                      .amount { text-align: right; font-family: monospace; font-size: 14px; }
                                      .total-row { font-weight: bold; background: #eee; }
                                    </style>
                                  </head>
                                  <body>
                                    <div class="header">INVOICE BREAKDOWN</div>
                                    <div class="meta">
                                      <p><strong>Invoice No:</strong> ${inv.invoiceNumber}</p>
                                      <p><strong>Transaction Code:</strong> ${inv.paystackReference || 'MANUAL-SYNC'}</p>
                                      <p><strong>Date:</strong> ${new Date(inv.date || inv.createdAt).toLocaleString()}</p>
                                      <p><strong>Item:</strong> ${inv.productName}</p>
                                      <p><strong>Client:</strong> ${inv.clientName}</p>
                                    </div>
                                    <table>
                                      <tr>
                                        <th>Cost Component</th>
                                        <th class="amount">Amount (${inv.currency || 'KES'})</th>
                                      </tr>
                                      <tr>
                                        <td>Buying Price</td>
                                        <td class="amount">${(inv.buyingPriceKES || 0).toLocaleString()}</td>
                                      </tr>
                                      <tr>
                                        <td>Shipping Fee</td>
                                        <td class="amount">${(inv.shippingFeeKES || 0).toLocaleString()}</td>
                                      </tr>
                                      <tr>
                                        <td>Logistics / Riders Cost</td>
                                        <td class="amount">${(inv.logisticsCostKES || 0).toLocaleString()}</td>
                                      </tr>
                                      <tr>
                                        <td>Service Fee</td>
                                        <td class="amount">${(inv.serviceFeeKES || 0).toLocaleString()}</td>
                                      </tr>
                                      <tr class="total-row">
                                        <td>Total Collected</td>
                                        <td class="amount">${(inv.totalKES || 0).toLocaleString()}</td>
                                      </tr>
                                    </table>
                                  </body>
                                </html>
                              `);
                              printWin.document.close();
                              printWin.print();
                            }}
                            className="p-2 bg-orange-50 text-orange-600 rounded-2xl hover:bg-orange-600 hover:text-white transition-all"
                            title="Print Admin Tax Record"
                          >
                            <FileText className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setAmendingInvoice(inv)}
                            className="p-2 bg-sky-50 text-sky-600 rounded-2xl hover:bg-sky-600 hover:text-white transition-all"
                            title="Amend this invoice — client, items, totals, fees"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setContractInvoice(inv);
                              setContractFormData({
                                clientName: inv.clientName || '',
                                clientIdReg: '',
                                itemDescription: inv.productName || '',
                                itemSpecifications: inv.items?.map(i => i.name).join(', ') || '',
                                shippingMethod: 'Air Freight',
                                totalQuotation: inv.totalKES ? inv.totalKES.toString() : '',
                                upfrontPayment: '',
                                shippingBalanceEstimate: ''
                              });
                              setIsGeneratingContract(true);
                            }}
                            className="p-2 bg-purple-50 text-purple-600 rounded-2xl hover:bg-purple-600 hover:text-white transition-all"
                            title="Generate Contract"
                          >
                            <ScrollText className="w-4 h-4" />
                          </button>
                          {/* Print Shipping Label & Quick WhatsApp hidden per owner (2026-07) — may re-enable later.
                              Kept in git history; remove the `false &&` to restore. */}
                          {false && (
                          <button
                            className="p-2 bg-neutral-900 text-white rounded-2xl hover:bg-teal-600 transition-all"
                            title="Print Shipping Label"
                          >
                            <Truck className="w-4 h-4" />
                          </button>
                          )}
                          <button
                            onClick={async () => {
                              if (!confirm('Are you sure you want to delete this invoice?')) return;
                              const result = await deleteInvoice(inv.id);
                              if (result.success) {
                                onUpdateInvoices(invoices.filter(i => i.id !== inv.id));
                                alert("✅ Invoice Deleted");
                              } else {
                                alert("❌ Failed to delete invoice: " + (result.error?.message || "Check console for details"));
                              }
                            }}
                            className="p-2 bg-rose-50 text-rose-500 rounded-2xl hover:bg-rose-500 hover:text-white transition-all"
                            title="Delete Invoice"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* LEADS MANAGEMENT TAB (PHASE 4) */}
        {
          activeTab === 'leads' && (
            <div className="space-y-10 animate-in fade-in duration-700">
              <div className="flex justify-between items-center px-4">
                <h2 className="text-3xl font-black text-gray-900 tracking-tighter uppercase italic">Sourcing <span className="text-[#3D8593]">Intelligence</span></h2>
                <button
                  onClick={refreshLeads}
                  disabled={loadingLeads}
                  className="px-6 py-3 bg-[#3D8593] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all flex items-center gap-2"
                >
                  <RefreshCcw className={`w-3.5 h-3.5 ${loadingLeads ? 'animate-spin' : ''}`} /> Refresh Nodes
                </button>
              </div>

              <div className="bg-white rounded-[4rem] border border-neutral-100 shadow-2xl overflow-hidden overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-neutral-50/50 border-b border-neutral-100">
                      <th className="px-4 py-3 text-[9px] font-black uppercase tracking-[0.2em] text-gray-400">Target Asset</th>
                      <th className="px-3 py-3 text-[9px] font-black uppercase tracking-[0.2em] text-gray-400">Client Protocol</th>
                      <th className="px-3 py-3 text-[9px] font-black uppercase tracking-[0.2em] text-gray-400">Nodes & Logistics</th>
                      <th className="px-12 py-10 text-right text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-50">
                    {leads.map((lead) => (
                      <tr key={lead.id} className="hover:bg-neutral-50/50 transition-colors group">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-5">
                            <div className="w-14 h-14 bg-neutral-100 rounded-[1.2rem] flex items-center justify-center text-neutral-400 group-hover:bg-[#3D8593]/10 group-hover:text-[#3D8593] transition-all">
                              <Box className="w-6 h-6" />
                            </div>
                            <div>
                              <p className="font-black text-gray-900 text-lg tracking-tight uppercase leading-none">{lead.productName}</p>
                              <div className="flex items-center gap-3 mt-2">
                                <span className="text-[10px] font-black text-[#3D8593] tracking-widest uppercase">Budget: KES {lead.targetBudgetKES?.toLocaleString()}</span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <p className="font-bold text-sm text-gray-900 flex items-center gap-2"><User className="w-3.5 h-3.5 text-[#3D8593]" /> {lead.clientName}</p>
                          <p className="text-[10px] font-black text-gray-400 mt-1 uppercase tracking-widest italic">{lead.clientWhatsapp}</p>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex flex-col gap-2 mb-2">
                            <div className="flex items-center gap-3">
                              <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest ${lead.shippingPreference === 'Air' ? 'bg-cyan-50 text-cyan-600' : 'bg-blue-50 text-blue-600'}`}>
                                {lead.shippingPreference} Freight
                              </span>
                              <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest ${lead.urgency === 'High' ? 'bg-rose-50 text-rose-500' : 'bg-neutral-50 text-gray-400'}`}>
                                {lead.urgency} Urgency
                              </span>
                            </div>

                            {/* Shipping Calculator Data */}
                            <div className="space-y-1">
                              {lead.shippingPreference === 'Air' && lead.shippingWeight && (
                                <p className="text-[10px] font-black text-cyan-700 uppercase tracking-widest">Weight: {lead.shippingWeight} kg</p>
                              )}
                              {lead.shippingPreference === 'Sea' && lead.calculatedCBM && (
                                <div className="space-y-0.5">
                                  <p className="text-[10px] font-black text-blue-700 uppercase tracking-widest">Volume: {lead.calculatedCBM.toFixed(4)} CBM</p>
                                  <p className="text-[9px] font-bold text-gray-400 uppercase italic">Dim: {lead.packageLength || '?'}{'x'}{lead.packageWidth || '?'}{'x'}{lead.packageHeight || '?'} cm</p>
                                </div>
                              )}
                              {lead.estimatedShippingCost && (
                                <p className="text-[11px] font-black text-[#FF9900] uppercase tracking-widest">Est. Shipping: KES {lead.estimatedShippingCost.toLocaleString()}</p>
                              )}
                            </div>
                          </div>
                          <p className="text-[10px] font-bold text-gray-300 uppercase italic">Type: {lead.itemType}</p>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <select
                            value={lead.status}
                            onChange={async (e) => {
                              const newStatus = e.target.value;
                              await updateSourcingStatus(lead.id!, newStatus);
                              refreshLeads();
                            }}
                            className={`bg-neutral-50 border border-neutral-100 rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest outline-none focus:ring-4 focus:ring-teal-100 transition-all ${lead.status === 'completed' ? 'text-emerald-600 font-black' :
                              lead.status === 'contacted' ? 'text-amber-600 font-black' :
                                'text-neutral-400 font-bold'
                              }`}
                          >
                            <option value="pending">Pending</option>
                            <option value="viewed">Viewed</option>
                            <option value="contacted">Contacted</option>
                            <option value="completed">Completed</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                    {leads.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-12 py-20 text-center">
                          <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.3em] italic">No active quest intelligence available.</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )
        }

        {/* SHOP INVENTORY TAB (STOCK) */}
        {
          activeTab === 'products' && (
            <div className="space-y-6 animate-in fade-in duration-700">
              <div className="bg-amber-50 border-l-4 border-amber-500 p-5 rounded-r-xl">
                <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest flex items-center gap-2">
                  <Info className="w-4 h-4" /> Phones are managed in the Phone Price Sync tab — this list is your shop stock.
                </p>
              </div>

              {/* Sales that happened off-site still have to come off the shelf */}
              <EnquiriesPanel
                products={products}
                onProductsChanged={() => fetchInventoryProducts().then(onUpdateProducts).catch(() => {})}
              />

              {/* Search + quick stats */}
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                  <input
                    type="search"
                    placeholder="Search products or categories…"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="w-full h-12 bg-white border border-neutral-200 rounded-full pl-11 pr-5 text-sm font-medium outline-none focus:border-[#3D8593] transition-colors"
                  />
                </div>
                <div className="flex gap-4 text-[10px] font-black uppercase tracking-widest text-gray-400">
                  <span><span className="text-gray-900 text-sm mr-1">{products.length}</span> Products</span>
                  <span><span className="text-amber-500 text-sm mr-1">{products.filter(p => p.availability === Availability.LOCAL && (p.stockCount || 0) > 0 && (p.stockCount || 0) <= 2).length}</span> Low</span>
                  <span><span className="text-rose-500 text-sm mr-1">{products.filter(p => p.availability === Availability.LOCAL && (p.stockCount || 0) === 0).length}</span> Out</span>
                </div>
              </div>

              {/* Stock management table — inline price & quantity edits */}
              <div className="bg-white rounded-[2rem] border border-neutral-100 shadow-sm overflow-hidden overflow-x-auto">
                <table className="w-full text-left min-w-[820px]">
                  <thead>
                    <tr className="border-b border-neutral-100 bg-neutral-50/50">
                      <th className="px-6 py-4 text-[9px] font-black uppercase tracking-[0.2em] text-gray-400">Product</th>
                      <th className="px-4 py-4 text-[9px] font-black uppercase tracking-[0.2em] text-gray-400">Availability</th>
                      <th className="px-4 py-4 text-[9px] font-black uppercase tracking-[0.2em] text-gray-400">Price (KES)</th>
                      <th className="px-4 py-4 text-[9px] font-black uppercase tracking-[0.2em] text-gray-400">Pieces in Stock</th>
                      <th className="px-6 py-4 text-right text-[9px] font-black uppercase tracking-[0.2em] text-gray-400">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-50">
                    {products
                      .filter(p => !productSearch || p.name.toLowerCase().includes(productSearch.toLowerCase()) || p.category?.toLowerCase().includes(productSearch.toLowerCase()))
                      .map(p => {
                        const isLocal = p.availability === Availability.LOCAL;
                        const qty = p.stockCount || 0;
                        return (
                          <tr key={p.id} className="hover:bg-neutral-50/40 transition-colors">
                            <td className="px-6 py-3.5">
                              <div className="flex items-center gap-3">
                                <div className="w-11 h-11 rounded-xl overflow-hidden bg-neutral-100 shrink-0 border border-neutral-100">
                                  <SafeImage src={p.imageUrls[0]} className="w-full h-full object-cover" />
                                </div>
                                <div className="min-w-0">
                                  <p className="font-bold text-sm text-gray-900 truncate max-w-[240px]">{p.name}</p>
                                  <div className="flex items-center gap-2">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-gray-300">{p.category}</p>
                                    {waitlistCounts[p.id] > 0 && (
                                      <span
                                        title={`${waitlistCounts[p.id]} shopper${waitlistCounts[p.id] > 1 ? 's are' : ' is'} waiting for this to come back in stock — they'll be emailed automatically when you restock it.`}
                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#FF9900]/10 text-[#FF9900] text-[9px] font-black uppercase tracking-widest"
                                      >
                                        🔔 {waitlistCounts[p.id]} waiting
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3.5">
                              <select
                                value={p.availability}
                                onChange={(e) => quickUpdateProduct(p.id, { availability: e.target.value as Availability })}
                                className={`px-2.5 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border-0 outline-none cursor-pointer ${isLocal ? (qty === 0 ? 'bg-rose-50 text-rose-500' : qty <= 2 ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600') : 'bg-teal-50 text-[#3D8593]'}`}
                                title="Switch between local stock and import-on-order"
                              >
                                <option value={Availability.LOCAL}>{isLocal ? (qty === 0 ? 'Out of Stock' : qty <= 2 ? 'Low Stock' : 'In Stock') : 'In Stock (Local)'}</option>
                                <option value={Availability.IMPORT}>Import on Order</option>
                              </select>
                            </td>
                            <td className="px-4 py-3.5">
                              {/* Edits the price customers actually pay (discount price when set, else base) */}
                              {(() => {
                                const selling = p.discountPriceKES || p.priceKES;
                                return (
                                  <div>
                                    <input
                                      type="number"
                                      key={`${p.id}-price-${selling}`}
                                      defaultValue={selling}
                                      min={0}
                                      onBlur={(e) => {
                                        const val = parseInt(e.target.value, 10);
                                        if (isNaN(val) || val <= 0 || val === selling) return;
                                        quickUpdateProduct(p.id, p.discountPriceKES ? { discountPriceKES: val } : { priceKES: val });
                                      }}
                                      onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                                      className="w-28 h-9 bg-neutral-50 border border-neutral-100 rounded-lg px-3 text-sm font-bold text-gray-900 outline-none focus:border-[#3D8593] focus:bg-white transition-colors"
                                      title="Selling price — what customers pay. Press Enter or click away to save."
                                    />
                                    {p.discountPriceKES ? (
                                      <p className="text-[9px] text-gray-400 mt-1">was <s>KES {p.priceKES.toLocaleString()}</s> (sale price active)</p>
                                    ) : null}
                                  </div>
                                );
                              })()}
                            </td>
                            <td className="px-4 py-3.5">
                              {isLocal ? (
                                <div className="inline-flex items-center bg-neutral-50 border border-neutral-100 rounded-full">
                                  <button
                                    onClick={() => quickUpdateProduct(p.id, { stockCount: Math.max(0, qty - 1) })}
                                    className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-rose-500 transition-colors"
                                    aria-label="Remove one piece"
                                  >−</button>
                                  <span className={`min-w-8 text-center text-sm font-black ${qty === 0 ? 'text-rose-500' : 'text-gray-900'}`}>{qty}</span>
                                  <button
                                    onClick={() => quickUpdateProduct(p.id, { stockCount: qty + 1 })}
                                    className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-emerald-500 transition-colors"
                                    aria-label="Add one piece"
                                  >+</button>
                                </div>
                              ) : (
                                <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">Sourced per order</span>
                              )}
                            </td>
                            <td className="px-6 py-3.5 text-right">
                              <div className="inline-flex gap-2">
                                <button
                                  onClick={() => quickUpdateProduct(p.id, { isFeatured: !p.isFeatured } as any)}
                                  className={`p-2.5 rounded-xl transition-all ${p.isFeatured ? 'bg-[#FF9900] text-white' : 'bg-neutral-50 text-gray-400 hover:bg-amber-50 hover:text-[#FF9900]'}`}
                                  title={p.isFeatured ? 'Featured in Shop banner — click to remove' : 'Feature in Shop banner'}
                                >
                                  <Star className="w-4 h-4" fill={p.isFeatured ? 'currentColor' : 'none'} />
                                </button>
                                <button
                                  onClick={() => setEditingProduct(p)}
                                  className="p-2.5 bg-neutral-50 text-gray-500 rounded-xl hover:bg-neutral-900 hover:text-white transition-all"
                                  title="Full edit (images, description, variations)"
                                >
                                  <Edit3 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteProduct(p.id)}
                                  className="p-2.5 bg-rose-50 text-rose-500 rounded-xl hover:bg-rose-500 hover:text-white transition-all"
                                  title="Delete product"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
                {products.length === 0 && (
                  <p className="px-8 py-10 text-sm text-gray-400 font-medium text-center">No products yet — add your first with "New Shop Asset" above.</p>
                )}
              </div>
            </div>
          )
        }

        {/* SYNC TOOLS TAB */}
        {
          activeTab === 'pricelist' && (
            <div className="space-y-12 animate-in fade-in duration-700">
              <div className="flex flex-col gap-10">
                <div className="flex justify-center">
                  <div className="glass p-2 rounded-[3rem] flex shadow-2xl overflow-x-auto no-scrollbar max-w-full">
                    {(['iphone', 'samsung', 'pixel'] as const).map((brand) => (
                      <button key={brand} onClick={() => setSyncBrandFilter(brand)} className={`whitespace-nowrap px-10 py-5 rounded-[2.5rem] text-[10px] font-black uppercase tracking-widest transition-all ${syncBrandFilter === brand ? 'bg-[#3D8593] text-white' : 'text-gray-400 hover:text-[#3D8593]'}`}>
                        {brand}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="relative max-w-2xl mx-auto w-full group">
                  <Search className="absolute left-8 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300 group-focus-within:text-[#3D8593] transition-colors" />
                  <input type="text" placeholder="Search Master Pricelist Registry..." className="w-full bg-white border border-neutral-100 rounded-[2.5rem] pl-20 pr-10 py-6 text-sm font-black uppercase tracking-widest outline-none focus:ring-8 focus:ring-[#3D8593]/5 transition-all shadow-xl" value={adminSearchTerm} onChange={(e) => setAdminSearchTerm(e.target.value)} />
                </div>
                <div className="flex justify-center flex-col items-center gap-4">
                  <div className="flex gap-4">
                    <button onClick={runSeed} disabled={seeding} className="px-10 py-5 bg-emerald-600 text-white rounded-full font-black uppercase text-[11px] tracking-widest flex items-center justify-center gap-4 shadow-2xl hover:bg-emerald-700 transition-all">
                      {seeding ? <RefreshCcw className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                      {seeding ? 'Restoring Global Inventory...' : 'RESTORE PHONE MODELS'}
                    </button>
                  </div>
                  <div className="flex items-center gap-2 px-5 py-2.5 bg-teal-50 border border-teal-100 rounded-full">
                    <span className="w-2 h-2 rounded-full bg-[#3D8593] animate-pulse"></span>
                    <p className="text-[10px] font-black text-[#3D8593] uppercase tracking-widest">
                      Auto-Sync Active · Back Market prices refresh monthly (16th) · Manual edits create overrides
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-[4rem] border border-neutral-100 shadow-2xl overflow-hidden divide-y divide-neutral-50">
                {pricelist.filter(item => item.brand.toLowerCase() === syncBrandFilter.toLowerCase() && item.modelName.toLowerCase().includes(adminSearchTerm.toLowerCase())).map(item => (
                  <div key={item.id} className="p-12 hover:bg-neutral-50/50 transition-all">
                    <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-6">
                      <div>
                        <h4 className="text-3xl font-black text-gray-900 tracking-tight">{item.modelName}</h4>
                        <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.4em] mt-2">{item.series}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                      {item.capacities.map((cap, idx) => (
                        <div key={idx} className={`p-8 rounded-[3rem] border transition-all relative ${cap.isManualOverride ? 'bg-orange-50 border-orange-100' : 'bg-white border-neutral-100 hover:border-teal-100 shadow-sm'}`}>
                          <div className="flex justify-between items-center mb-8">
                            <span className="px-4 py-2 bg-neutral-900 text-white text-[9px] font-black rounded-xl uppercase tracking-widest">{cap.capacity}</span>
                            <span className={`px-3 py-1.5 text-[8px] font-black rounded-full uppercase tracking-widest ${cap.isManualOverride ? 'bg-orange-100 text-orange-600' : 'bg-teal-50 text-[#3D8593]'}`}>
                              {cap.isManualOverride ? 'Manual Override' : 'Auto-Synced'}
                            </span>
                          </div>
                          <div>
                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-3">
                              Live KES Price {cap.sourcePriceUSD ? <span className="text-gray-300">· Source ${cap.sourcePriceUSD}</span> : null} <span className="text-gray-300">· {cap.lastSynced}</span>
                            </label>
                            <div className="flex justify-between items-end">
                              <p className="text-3xl font-black text-gray-900 tracking-tighter">KES {cap.currentPriceKES.toLocaleString()}</p>
                              <button onClick={() => handleOpenPriceEdit(item.id, idx)} className="p-2 bg-neutral-50 rounded-2xl text-gray-300 hover:text-[#3D8593] shadow-inner">
                                <Edit3 className="w-5 h-5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        }

        {/* CONSULTATIONS REGISTRY */}
        {
          activeTab === 'consultations' && (
            <div className="bg-white rounded-[4rem] border border-neutral-100 shadow-2xl overflow-hidden divide-y divide-neutral-50 animate-in fade-in duration-700">
              <div className="p-12 bg-neutral-50/30 flex justify-between items-center">
                <h3 className="text-2xl font-black tracking-tight text-gray-900">Expert Booking Pipeline</h3>
                <span className="text-[10px] font-black uppercase tracking-widest text-[#3D8593] bg-teal-50 px-4 py-1.5 rounded-full">{consultations.length} Active Requests</span>
              </div>
              {consultations.map(c => (
                <div key={c.id} className="p-12 flex flex-col xl:flex-row gap-12 hover:bg-neutral-50/20 transition-all border-b border-neutral-50 last:border-none">
                  <div className="flex-1">
                    <div className="flex items-center gap-6 mb-8">
                      <div className={`w-20 h-20 rounded-[2.5rem] flex items-center justify-center shadow-sm border border-white transition-all ${c.status === ConsultationStatus.PAID ? 'bg-emerald-50 text-emerald-600' : 'bg-indigo-50 text-indigo-600'}`}>
                        {c.status === ConsultationStatus.PAID ? <ShieldCheck className="w-10 h-10" /> : <User className="w-10 h-10" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-3">
                          <h4 className="text-3xl font-black text-gray-900 tracking-tight leading-none">{c.name}</h4>
                          {c.status === ConsultationStatus.PAID && (
                            <span className="bg-emerald-500 text-white text-[8px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-lg shadow-emerald-100 flex items-center gap-1">
                              <Check className="w-3 h-3" /> Locked
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-gray-400 font-bold mt-4 uppercase tracking-[0.2em]">{c.whatsapp} • {c.email}</p>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6 mb-8">
                      <div className="bg-white/80 p-8 rounded-[2rem] border border-neutral-100 shadow-sm">
                        <p className="text-[10px] font-black uppercase tracking-widest text-[#3D8593] mb-3 flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5" /> Booked Timeline
                        </p>
                        <div className="flex items-end gap-3">
                          <p className="text-xl font-black text-gray-900 leading-none">{c.date}</p>
                          <span className="text-sm font-bold text-gray-300">at</span>
                          <p className="text-xl font-black text-gray-900 leading-none">{c.time}</p>
                        </div>
                      </div>
                      <div className="bg-white/80 p-8 rounded-[2rem] border border-neutral-100 shadow-sm">
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-300 mb-3">Strategic Objective</p>
                        <p className="text-sm font-bold text-gray-600 leading-relaxed italic truncate">"{c.topic}"</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-4">
                      <button
                        onClick={() => {
                          const message = encodeURIComponent(
                            `Hi ${c.name}, your expert logistics consultation for "${c.topic}" is suggested for ${c.date} at ${c.time}.\n\n` +
                            `Please confirm if this works for you and complete the $15 (approx. KES 2,025) commitment fee to lock your slot.\n\n` +
                            `Once confirmed, the date will be locked in our master calendar.`
                          );
                          window.open(`https://wa.me/${normalizeKenyanPhone(c.whatsapp)}?text=${message}`, '_blank');
                        }}
                        className="px-6 py-4 bg-emerald-50 text-emerald-600 rounded-2xl text-[9px] font-black uppercase tracking-widest hover:bg-emerald-600 hover:text-white transition-all shadow-sm flex items-center gap-2 border border-emerald-100"
                      >
                        <MessageCircle className="w-4 h-4" /> Confirm & Request $15
                      </button>
                      {c.status === ConsultationStatus.PAID && (
                        <button className="px-6 py-4 bg-indigo-50 text-indigo-600 rounded-2xl text-[9px] font-black uppercase tracking-widest opacity-50 cursor-not-allowed flex items-center gap-2 border border-indigo-100">
                          <Calendar className="w-4 h-4" /> Locked on Calendar
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="w-full xl:w-80 flex flex-col justify-center gap-6">
                    <div className="grid grid-cols-2 gap-3">
                      {[ConsultationStatus.PENDING, ConsultationStatus.DOABLE, ConsultationStatus.PAID, ConsultationStatus.CANCELLED].map(s => (
                        <button key={s} onClick={() => handleUpdateConsultationStatus(c.id, s)} className={`px-4 py-4 rounded-2xl text-[8px] font-black uppercase tracking-widest transition-all ${c.status === s ? 'bg-[#3D8593] text-white shadow-xl' : 'bg-white border border-neutral-100 text-gray-400'}`}>
                          {s.split(' ')[0]}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-gray-400 bg-neutral-50 p-6 rounded-2xl">
                      <span>Phase: {c.status}</span>
                      <span className="text-[#3D8593]">Fee: ${c.feeUSD}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        }

        {/* CONTENT MANAGER */}
        {
          activeTab === 'content' && (
            <div className="grid md:grid-cols-2 gap-12 animate-in fade-in duration-700">
              {blogs.map(b => (
                <div key={b.id} className="bg-white rounded-[4rem] p-10 border border-neutral-100 shadow-2xl group relative overflow-hidden">
                  <div className="aspect-video rounded-[2.5rem] overflow-hidden mb-8 relative">
                    <SafeImage src={b.imageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" />
                    <div className="absolute top-6 right-6 flex gap-3">
                      <button onClick={() => setEditingBlog(b)} className="p-2 bg-white/90 backdrop-blur rounded-2xl shadow-xl hover:bg-white hover:scale-110 transition-all"><Edit3 className="w-5 h-5" /></button>
                      <button onClick={() => handleDeleteBlog(b.id)} className="p-2 bg-rose-500 text-white rounded-2xl shadow-xl hover:bg-rose-600 hover:scale-110 transition-all"><Trash2 className="w-5 h-5" /></button>
                    </div>
                  </div>
                  <span className="text-[10px] font-black text-[#3D8593] uppercase tracking-widest bg-teal-50 px-4 py-2 rounded-full">{b.category}</span>
                  <h3 className="text-3xl font-black text-gray-900 mt-6 mb-4 leading-tight">{b.title}</h3>
                  <p className="text-gray-400 text-sm font-medium leading-relaxed line-clamp-3 mb-8">{b.excerpt}</p>
                </div>
              ))}
              <button onClick={() => setEditingBlog('new')} className="aspect-video border-4 border-dashed border-neutral-100 rounded-[4rem] flex flex-col items-center justify-center text-neutral-200 hover:border-[#3D8593] hover:text-[#3D8593] transition-all group">
                <Plus className="w-16 h-16 mb-4 group-hover:rotate-90 transition-transform duration-500" />
                <span className="font-black uppercase text-[12px] tracking-widest">New Intelligence Piece</span>
              </button>
            </div>
          )
        }

        {/* EBOOK MANAGEMENT */}
        {
          activeTab === 'books' && (
            <div className="space-y-12 animate-in fade-in duration-700">
              <div className="flex justify-between items-end">
                <div>
                  <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-400 mb-4">Digital Assets</h2>
                  <h3 className="text-4xl font-bold text-gray-900 tracking-tighter">eBook <span className="text-[#3D8593]">Library</span></h3>
                </div>
                <button
                  onClick={() => setEditingBook('new')}
                  className="px-8 h-16 bg-black text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-[#3D8593] transition-all flex items-center gap-3 shadow-2xl"
                >
                  <Plus className="w-4 h-4" /> Add New eBook
                </button>
              </div>

              {editingBook && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 md:p-12">
                  <div className="absolute inset-0 bg-white/80 backdrop-blur-2xl" onClick={() => setEditingBook(null)} />
                  <div className="relative w-full max-w-4xl bg-white rounded-[4rem] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.15)] border border-neutral-100 overflow-hidden animate-in zoom-in-95 duration-500">
                    <div className="h-2 bg-gradient-to-r from-[#3D8593] to-teal-200" />
                    <form onSubmit={handleSaveBook} className="p-12 md:p-20 overflow-y-auto max-h-[85vh] no-scrollbar">
                      <div className="flex justify-between items-start mb-16">
                        <div>
                          <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-[#3D8593] mb-4">Book Configuration</h4>
                          <h5 className="text-4xl font-bold text-gray-900 tracking-tighter">
                            {editingBook === 'new' ? 'Publish New Title' : 'Edit Book Metadata'}
                          </h5>
                        </div>
                        <button type="button" onClick={() => setEditingBook(null)} className="w-16 h-16 bg-neutral-50 rounded-full flex items-center justify-center hover:bg-rose-50 hover:text-rose-500 transition-all">
                          <X className="w-6 h-6" />
                        </button>
                      </div>

                      <div className="grid md:grid-cols-2 gap-10">
                        <div className="space-y-8">
                          <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4 block">Book Title</label>
                            <input name="title" defaultValue={editingBook !== 'new' ? editingBook.title : ''} required className="w-full bg-neutral-50 border-none rounded-3xl px-8 py-6 font-bold focus:ring-4 focus:ring-teal-100 transition-all" />
                          </div>
                          <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4 block">Author / Knowledge Expert</label>
                            <input name="author" defaultValue={editingBook !== 'new' ? editingBook.author : ''} required className="w-full bg-neutral-50 border-none rounded-3xl px-8 py-6 font-bold focus:ring-4 focus:ring-teal-100 transition-all" />
                          </div>
                          <div className="grid grid-cols-2 gap-6">
                            <div>
                              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4 block">Base Price (KES)</label>
                              <input name="priceKES" type="number" defaultValue={editingBook !== 'new' ? editingBook.priceKES : 0} required className="w-full bg-neutral-50 border-none rounded-3xl px-8 py-6 font-bold" />
                            </div>
                            <div>
                              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4 block">Sale Price (Optional)</label>
                              <input name="discountPriceKES" type="number" defaultValue={editingBook !== 'new' ? editingBook.discountPriceKES : ''} className="w-full bg-neutral-50 border-none rounded-3xl px-8 py-6 font-bold" />
                            </div>
                          </div>
                        </div>

                        <div className="space-y-8">
                          <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4 block">Cover Image URL</label>
                            <input name="coverImage" defaultValue={editingBook !== 'new' ? editingBook.coverImage : ''} required placeholder="https://..." className="w-full bg-neutral-50 border-none rounded-3xl px-8 py-6 font-bold" />
                          </div>
                          <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4 block">PDF Download URL (Optional)</label>
                            <input name="pdfUrl" defaultValue={editingBook !== 'new' ? editingBook.pdfUrl : ''} placeholder="https://..." className="w-full bg-neutral-50 border-none rounded-3xl px-8 py-6 font-bold" />
                          </div>
                          <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4 block">Short Description</label>
                            <textarea name="description" defaultValue={editingBook !== 'new' ? editingBook.description : ''} rows={3} className="w-full bg-neutral-50 border-none rounded-3xl px-8 py-6 font-bold resize-none" />
                          </div>
                        </div>
                      </div>

                      <div className="mt-12">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4 block">Digital Content (HTML Recommended)</label>
                        <textarea name="content" defaultValue={editingBook !== 'new' ? editingBook.content : ''} rows={10} required className="w-full bg-neutral-50 border-none rounded-[2.5rem] px-8 py-6 font-medium leading-relaxed" placeholder="<h1>Chapter 1</h1><p>Welcome to the masterclass...</p>" />
                      </div>

                      <div className="mt-16 flex justify-end gap-6">
                        <button type="button" onClick={() => setEditingBook(null)} className="px-10 py-6 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-black">Cancel</button>
                        <button type="submit" className="px-12 py-6 bg-[#3D8593] text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-black transition-all shadow-xl shadow-teal-100">
                          Deploy Changes
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {ebooks.map(book => (
                  <div key={book.id} className="bg-white rounded-[3rem] p-8 border border-neutral-100 shadow-sm hover:shadow-xl transition-all group">
                    <div className="relative aspect-[3/4] rounded-[2rem] overflow-hidden mb-6 shadow-lg">
                      <SafeImage src={book.coverImage} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" />
                    </div>
                    <h4 className="text-xl font-bold text-gray-900 mb-1">{book.title}</h4>
                    <p className="text-[10px] font-black text-[#3D8593] uppercase tracking-widest mb-6">by {book.author}</p>
                    <div className="flex items-center justify-between pt-6 border-t border-neutral-50">
                      <div>
                        <p className="text-lg font-black text-gray-900">KES {(book.discountPriceKES || book.priceKES).toLocaleString()}</p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => setEditingBook(book)} className="p-3 bg-neutral-50 text-gray-400 rounded-xl hover:bg-[#3D8593] hover:text-white transition-all">
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDeleteBook(book.id)} className="p-3 bg-neutral-50 text-gray-400 rounded-xl hover:bg-rose-500 hover:text-white transition-all">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        }
        {activeTab === 'security' && (
          <div className="max-w-4xl mx-auto space-y-12 animate-in fade-in duration-700">
            <div className="bg-white rounded-[4rem] p-12 border border-neutral-100 shadow-2xl">
              <div className="flex items-center gap-6 mb-10">
                <div className="p-5 bg-rose-50 rounded-3xl text-rose-500">
                  <ShieldCheck className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-3xl font-black text-gray-900 tracking-tight">Admin Access Control</h3>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Personnel & Authentication Matrix</p>
                </div>
              </div>

              <div className="space-y-10">
                <div className="p-10 bg-neutral-50 rounded-[3rem] border border-neutral-100">
                  <div className="flex justify-between items-start mb-8">
                    <div>
                      <h4 className="text-xl font-black text-gray-900">Credential Refresh</h4>
                      <p className="text-xs font-bold text-gray-400 mt-1 uppercase tracking-widest">Update Primary Access Keys</p>
                    </div>
                    <button
                      onClick={handleUpdateAdminCredentials}
                      disabled={securityLoading}
                      className="px-8 py-4 bg-black text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-[#3D8593] transition-all flex items-center gap-2 shadow-xl"
                    >
                      {securityLoading ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      Sync New Credentials
                    </button>
                  </div>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="bg-white p-6 rounded-2xl border border-neutral-100">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">New Identity (Email)</p>
                      <p className="font-bold text-gray-900">mungaimports@gmail.com</p>
                    </div>
                    <div className="bg-white p-6 rounded-2xl border border-neutral-100">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Security Key (Password)</p>
                      <p className="font-bold text-gray-900">Muneneowns_LG_imports01</p>
                    </div>
                  </div>
                  <p className="mt-6 text-[10px] font-bold text-rose-500 flex items-center gap-2">
                    <Info className="w-3.5 h-3.5" /> Warning: This action will expire your current session.
                  </p>
                </div>

                <div className="p-10 bg-[#0f1a1c] text-white rounded-[3rem] border border-white/5 relative overflow-hidden">
                  <div className="relative z-10">
                    <div className="flex justify-between items-start mb-8">
                      <div>
                        <h4 className="text-xl font-black">Two-Step Verification</h4>
                        <p className="text-xs font-bold text-gray-500 mt-1 uppercase tracking-widest">Multi-Factor Authentication (MFA)</p>
                      </div>
                      <button
                        onClick={startMFAEnrollment}
                        disabled={securityLoading || !!mfaEnrollData}
                        className="px-8 py-4 bg-[#3D8593] text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-white hover:text-[#0f1a1c] transition-all flex items-center gap-2 shadow-xl shadow-teal-900/40"
                      >
                        <ShieldCheck className="w-4 h-4" /> Initialize Enrollment
                      </button>
                    </div>

                    {mfaEnrollData ? (
                      <div className="mt-8 animate-in slide-in-from-top-4 duration-500 bg-white/5 p-8 rounded-[2.5rem] border border-white/10">
                        <div className="flex flex-col md:flex-row gap-10 items-center">
                          <div className="bg-white p-4 rounded-3xl shrink-0">
                            <img
                              src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(mfaEnrollData.uri)}`}
                              alt="MFA QR Code"
                              className="w-40 h-40"
                            />
                          </div>
                          <div className="flex-1 space-y-6">
                            <div>
                              <h5 className="font-black text-lg mb-2">Link Authenticator</h5>
                              <p className="text-sm text-gray-400 font-medium">Scan the QR code with Google Authenticator or Microsoft Authenticator, then enter the 6-digit verification code below.</p>
                            </div>
                            <div className="flex gap-4">
                              <input
                                type="text"
                                maxLength={6}
                                value={mfaCode}
                                onChange={(e) => setMfaCode(e.target.value)}
                                className="flex-1 bg-white/10 border border-white/20 rounded-2xl px-6 py-4 font-black text-2xl tracking-[0.5em] text-center focus:outline-none focus:ring-4 focus:ring-[#3D8593]"
                                placeholder="000000"
                              />
                              <button
                                onClick={verifyMFAEnrollment}
                                disabled={securityLoading || mfaCode.length !== 6}
                                className="px-10 py-4 bg-white text-black rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-[#3D8593] hover:text-white transition-all shadow-xl disabled:opacity-50"
                              >
                                {securityLoading ? <RefreshCcw className="w-4 h-4 animate-spin" /> : 'Finalize'}
                              </button>
                            </div>
                            {mfaError && <p className="text-sm font-bold text-rose-400">{mfaError}</p>}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-gray-400 text-sm font-medium leading-relaxed max-w-lg">
                        Layered security prevents unauthorized access even if credentials are compromised. We use TOTP protocol compatible with most authentication apps.
                      </p>
                    )}
                  </div>
                  <Lock className="absolute -bottom-10 -right-10 w-64 h-64 text-white/5 -rotate-12" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* AD BANNERS MANAGEMENT */}
        {activeTab === 'adbanners' && (
          <div className="space-y-12 animate-in fade-in duration-700">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {adBanners.length === 0 ? (
                <div className="col-span-full py-20 flex flex-col items-center justify-center text-gray-400 bg-white rounded-[3rem] border border-neutral-100 border-dashed">
                  <ImageIcon className="w-16 h-16 mb-4 opacity-20" />
                  <p className="font-bold text-lg">No Ad Banners Found</p>
                  <p className="text-sm mt-2">Create your first ad banner using the 'New Ad Banner' button above.</p>
                </div>
              ) : (
                adBanners.sort((a, b) => a.sortOrder - b.sortOrder).map((banner) => (
                  <div key={banner.id} className="bg-white rounded-[3rem] p-8 border border-neutral-100 shadow-sm hover:shadow-xl transition-all flex flex-col group relative">
                    <div 
                      className="relative aspect-video rounded-[2rem] overflow-hidden mb-6 flex items-center justify-center p-6 border border-neutral-100 shadow-inner" 
                      style={{ backgroundColor: banner.backgroundColor }}
                    >
                      <SafeImage src={banner.imageSrc} className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-700 drop-shadow-2xl" />
                      {!banner.isActive && (
                        <div className="absolute inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center">
                          <span className="bg-rose-500 text-white px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl">Inactive</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <h4 className="text-xl font-black text-gray-900 leading-tight line-clamp-2 mb-1">{banner.title1}</h4>
                      <h5 className="text-md font-bold italic text-[#3D8593] mb-3">{banner.title2}</h5>
                      <p className="text-sm font-medium leading-relaxed line-clamp-3 text-gray-400">{banner.subtitle}</p>
                    </div>
                    
                    <div className="flex items-center justify-between pt-6 mt-6 border-t border-neutral-50">
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-[#3D8593] bg-teal-50 px-3 py-1.5 rounded-full">Sort: {banner.sortOrder}</span>
                      </div>
                      <div className="flex gap-2 relative z-10">
                        <button onClick={() => setEditingAdBanner(banner)} className="p-3 bg-neutral-50 text-gray-400 rounded-xl hover:bg-[#3D8593] hover:text-white transition-all shadow-sm">
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDeleteAdBanner(banner.id)} className="p-3 bg-neutral-50 text-gray-400 rounded-xl hover:bg-rose-500 hover:text-white transition-all shadow-sm">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
        {activeTab === 'card' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <BusinessCard />
          </div>
        )}
        {activeTab === 'reports' && <ReportsTab invoices={invoices} clients={clients} />}

        {activeTab === 'monitors' && <MonitorsTab />}

        {activeTab === 'chairs' && <ChairsTab />}

        {activeTab === 'groupbuys' && <GroupBuysTab />}

        {activeTab === 'corporate' && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-wrap items-center justify-between gap-4 px-1">
              <div>
                <h2 className="text-3xl font-black text-gray-900 tracking-tighter uppercase italic">Corporate <span className="text-[#3D8593]">Procurement</span></h2>
                <p className="text-[11px] font-black uppercase tracking-widest text-gray-400 mt-1">
                  legitgrinder.com/corporate · B2B bulk quote requests
                </p>
              </div>
              <div className="flex items-center gap-1 bg-neutral-50 border border-neutral-100 rounded-full p-1">
                {([['leads', `Leads (${corpQuotes.length})`], ['pricing', 'Price bands']] as const).map(([v, l]) => (
                  <button key={v} onClick={() => setCorpView(v)}
                    className={`px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${corpView === v ? 'bg-[#3D8593] text-white shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>
                    {l}
                  </button>
                ))}
              </div>
            </div>

            {corpView === 'pricing' ? (
              <>
                <div className="bg-amber-50 border border-amber-200 rounded-[1.5rem] p-5">
                  <p className="text-sm text-amber-800 font-medium">
                    The instant estimate on <strong>/corporate</strong> only appears for lines that have a price band here.
                    Leave a band blank and that category can still be requested — buyers just won't see a figure you haven't approved.
                  </p>
                </div>
                <div className="bg-white rounded-[2rem] border border-neutral-100 shadow-sm overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-[10px] font-black uppercase tracking-widest text-gray-400 border-b border-neutral-100">
                        <th className="px-5 py-4">Category</th>
                        <th className="px-4 py-4 text-right">Landed / unit — from</th>
                        <th className="px-4 py-4 text-right">to</th>
                        <th className="px-4 py-4 text-center">Min qty</th>
                        <th className="px-4 py-4 text-center">Live</th>
                      </tr>
                    </thead>
                    <tbody>
                      {corpCats.map(c => (
                        <tr key={c.id} className="border-b border-neutral-50">
                          <td className="px-5 py-3.5">
                            <p className="font-bold text-gray-900">{c.name}</p>
                            {c.blurb && <p className="text-[11px] text-gray-400 font-medium">{c.blurb}</p>}
                          </td>
                          {(['minKES', 'maxKES'] as const).map(key => (
                            <td key={key} className="px-4 py-3.5 text-right">
                              <input
                                type="number" min={0}
                                key={`${c.id}-${key}-${c[key] ?? ''}`}
                                defaultValue={c[key] ?? ''}
                                placeholder="—"
                                onBlur={(e) => {
                                  const val = e.target.value === '' ? undefined : parseInt(e.target.value, 10);
                                  if (val === c[key]) return;
                                  saveCorpCategory({ ...c, [key]: val });
                                }}
                                className="w-28 h-9 bg-neutral-50 border border-neutral-100 rounded-lg px-3 text-sm font-bold text-right outline-none focus:border-[#3D8593] focus:bg-white"
                              />
                            </td>
                          ))}
                          <td className="px-4 py-3.5 text-center">
                            <input
                              type="number" min={1}
                              key={`${c.id}-moq-${c.moq}`}
                              defaultValue={c.moq}
                              onBlur={(e) => {
                                const val = parseInt(e.target.value, 10) || 1;
                                if (val === c.moq) return;
                                saveCorpCategory({ ...c, moq: val });
                              }}
                              className="w-20 h-9 bg-neutral-50 border border-neutral-100 rounded-lg px-3 text-sm font-bold text-center outline-none focus:border-[#3D8593] focus:bg-white"
                            />
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            <button
                              onClick={() => saveCorpCategory({ ...c, isActive: !c.isActive })}
                              className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${c.isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-400'}`}
                            >
                              {c.isActive ? 'Live' : 'Hidden'}
                            </button>
                          </td>
                        </tr>
                      ))}
                      {corpCats.length === 0 && (
                        <tr><td colSpan={5} className="px-5 py-12 text-center text-gray-400 font-medium">
                          No categories yet — run <span className="font-mono text-xs">add_corporate_quotes.sql</span> in Supabase.
                        </td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="space-y-3">
                {corpQuotes.length === 0 && (
                  <div className="bg-white rounded-[2rem] border border-neutral-100 shadow-sm py-16 text-center">
                    <Buildings className="w-10 h-10 text-gray-300 mx-auto mb-4" />
                    <p className="font-bold text-gray-900 mb-1">No requests yet</p>
                    <p className="text-sm text-gray-500 font-light">Share legitgrinder.com/corporate with businesses.</p>
                  </div>
                )}
                {corpQuotes.map(q => (
                  <div key={q.id} className={`bg-white rounded-[1.5rem] border p-5 ${q.leadQuality === 'priority' ? 'border-neutral-100' : 'border-dashed border-neutral-200 opacity-70'}`}>
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-black text-gray-900">{q.businessName}</h3>
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${q.leadQuality === 'priority' ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-400'}`}>
                            {q.leadQuality}
                          </span>
                        </div>
                        <p className="text-[11px] font-bold text-gray-500">
                          {q.fullName} · {q.email}{q.whatsapp ? ` · ${q.whatsapp}` : ''}{q.location ? ` · ${q.location}` : ''}
                        </p>
                        <p className="text-xs text-gray-600 font-medium mt-2">
                          {q.categories.join(' · ') || '—'} · <strong>{q.quantityBand || '?'}</strong>
                          {q.timeline ? ` · ${q.timeline}` : ''}{q.budgetBand ? ` · ${q.budgetBand}` : ''}
                          {q.buyerType ? ` · ${q.buyerType}` : ''}
                        </p>
                        {/* The schedule they actually configured — this is the brief */}
                        {q.lineItems?.length ? (
                          <div className="mt-2 rounded-xl bg-neutral-50 border border-neutral-100 p-3 space-y-1">
                            {q.lineItems.map((l, i) => (
                              <p key={`${l.code}-${i}`} className="text-[11px] font-bold text-gray-700">
                                {l.qty} × {l.name} <span className="text-gray-400">({l.code}{l.color ? ` · ${l.color}` : ''})</span>
                                {l.unitKES ? <span className="text-[#3D8593]"> · KES {l.unitKES.toLocaleString()}/ea</span> : null}
                              </p>
                            ))}
                          </div>
                        ) : null}
                        {q.estimateLow ? (
                          <p className="text-[11px] font-bold text-[#3D8593] mt-1">
                            Estimate shown: KES {q.estimateLow.toLocaleString()} – {q.estimateHigh?.toLocaleString()}
                          </p>
                        ) : null}
                        {q.notes && <p className="text-xs text-gray-500 font-light mt-2 whitespace-pre-line border-l-2 border-neutral-100 pl-3">{q.notes}</p>}
                      </div>
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <select
                          value={q.status}
                          onChange={async (e) => {
                            const s = e.target.value as CorporateQuote['status'];
                            setCorpQuotes(prev => prev.map(x => x.id === q.id ? { ...x, status: s } : x));
                            await setCorporateQuoteStatus(q.id, s);
                          }}
                          className="bg-neutral-50 border border-neutral-100 rounded-full px-4 py-2 text-[10px] font-black uppercase tracking-widest outline-none focus:border-[#3D8593]"
                        >
                          {(['new', 'quoted', 'won', 'lost'] as const).map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <button onClick={() => qualifyLead(q)}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#25D366]/10 text-[#1eb955] text-[10px] font-black uppercase tracking-widest hover:bg-[#25D366] hover:text-white transition-all">
                          <MessageCircle className="w-3.5 h-3.5" /> Qualify
                        </button>
                        <span className="text-[10px] font-bold text-gray-300">{new Date(q.createdAt).toLocaleDateString('en-KE')}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main >

      {/* AI Catalog Agent */}
      <CatalogAgentPanel
        isOpen={aiPanelOpen}
        onClose={() => setAiPanelOpen(false)}
        existingCategories={Array.from(new Set(products.map(p => p.category).filter(Boolean))).sort()}
        onCreated={(newProduct) => onUpdateProducts([...products, newProduct])}
      />

      {/* SHIPPING AGENT MANAGER */}
      {showAgentManager && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-white rounded-[2rem] w-full max-w-md shadow-2xl p-8 relative">
            <button onClick={() => { setShowAgentManager(false); setAgentError(null); }} aria-label="Close"
              className="absolute top-6 right-6 p-2.5 bg-neutral-100 rounded-xl hover:bg-neutral-200 transition-all">
              <X className="w-4 h-4 text-gray-400" />
            </button>

            <h3 className="text-2xl font-black text-gray-900 tracking-tight uppercase mb-1">Shipping <span className="text-[#3D8593]">Agents</span></h3>
            <p className="text-xs text-gray-500 font-light mb-6">Tag each order with the agent that carried it, then filter by agent.</p>

            {agentError && (
              <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3.5 mb-4">
                <p className="text-xs text-rose-700 font-medium">{agentError}</p>
              </div>
            )}

            <div className="space-y-2 mb-6 max-h-56 overflow-y-auto">
              {shippingAgents.length === 0 && (
                <p className="text-sm text-gray-400 font-light py-4 text-center">No agents yet — add your first below.</p>
              )}
              {shippingAgents.map(a => (
                <div key={a.id} className={`flex items-center justify-between gap-3 px-4 py-2.5 rounded-2xl border ${AGENT_COLORS[a.color] || AGENT_COLORS.slate}`}>
                  <span className="flex items-center gap-2.5 font-black text-xs uppercase tracking-widest">
                    <span className={`w-2.5 h-2.5 rounded-full ${AGENT_DOTS[a.color] || AGENT_DOTS.slate}`} />
                    {a.name}
                  </span>
                  <button
                    onClick={async () => {
                      if (!confirm(`Remove "${a.name}"? Orders already tagged keep the label.`)) return;
                      await deleteShippingAgent(a.id);
                      setShippingAgents(prev => prev.filter(x => x.id !== a.id));
                    }}
                    aria-label={`Remove ${a.name}`}
                    className="opacity-50 hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="border-t border-neutral-100 pt-5">
              <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Add an agent</label>
              <input
                value={newAgentName}
                onChange={(e) => { setNewAgentName(e.target.value); setAgentError(null); }}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAddAgent(); }}
                placeholder="e.g. Agent A · Kenya Cargo"
                className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:border-[#3D8593] mb-3"
              />
              <div className="flex items-center gap-2 mb-4">
                {Object.keys(AGENT_DOTS).map(c => (
                  <button
                    key={c}
                    onClick={() => setNewAgentColor(c)}
                    aria-label={`Colour ${c}`}
                    className={`w-8 h-8 rounded-full ${AGENT_DOTS[c]} transition-all ${newAgentColor === c ? 'ring-2 ring-offset-2 ring-gray-900 scale-110' : 'opacity-60 hover:opacity-100'}`}
                  />
                ))}
              </div>
              <button onClick={handleAddAgent}
                className="w-full py-3.5 bg-[#0f1a1c] text-white rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-[#3D8593] transition-all">
                Add agent
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI WhatsApp Message Agent */}
      <MessageAgentPanel
        key={`${messagingInvoice?.id || 'none'}-${messageIntent || 'default'}`}
        invoice={messagingInvoice}
        initialIntent={messageIntent}
        onClose={() => { setMessagingInvoice(null); setMessageIntent(undefined); }}
        onReviewRequested={(inv) => {
          markReviewRequested(inv.id);
          const stamped = new Date().toISOString();
          onUpdateInvoices(invoices.map(x => x.id === inv.id ? { ...x, reviewRequestedAt: stamped } : x));
        }}
      />

      {/* The Manager (Supervisor) — floating launcher + chat */}
      {!supervisorOpen && (
        <button
          onClick={() => setSupervisorOpen(true)}
          className="fixed bottom-6 right-6 z-[90] inline-flex items-center gap-2.5 pl-5 pr-6 py-4 rounded-full bg-[#0f1a1c] text-white shadow-2xl shadow-teal-900/30 hover:bg-[#3D8593] transition-colors"
        >
          <UserGear size={20} weight="duotone" className="text-[#7fc2ce]" />
          <span className="text-[11px] font-black uppercase tracking-widest">Manager</span>
          {attentionCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[22px] h-[22px] px-1.5 rounded-full bg-[#FF9900] text-white text-[11px] font-black flex items-center justify-center border-2 border-white">
              {attentionCount}
            </span>
          )}
        </button>
      )}
      <SupervisorPanel
        isOpen={supervisorOpen}
        onClose={() => setSupervisorOpen(false)}
        invoices={invoices}
        products={products}
        onAction={handleSupervisorAction}
        onOrderCreated={(inv) => onUpdateInvoices([inv, ...invoices])}
        onProductCreated={(p) => onUpdateProducts([...products, p])}
        onInvoiceUpdated={(inv) => onUpdateInvoices(invoices.map(x => x.id === inv.id ? inv : x))}
      />

      {/* AI Logistics / Tracking Agent */}
      <LogisticsPanel
        key={trackingInvoice?.id || 'none'}
        invoice={trackingInvoice}
        allInvoices={invoices}
        onClose={() => setTrackingInvoice(null)}
        onUpdated={(updated) => {
          const byId = new Map(updated.map(u => [u.id, u]));
          onUpdateInvoices(invoices.map(inv => byId.get(inv.id) || inv));
        }}
        onDraftMessage={(inv, intent) => {
          setTrackingInvoice(null);
          setMessageIntent(intent);
          setMessagingInvoice(inv);
        }}
      />

      {/* Product Edit/Add Modal */}
      {
        editingProduct && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-10 animate-in fade-in duration-300">
            <div className="absolute inset-0 bg-[#0f1a1c]/60 backdrop-blur-sm" onClick={() => setEditingProduct(null)}></div>
            <div className="relative bg-white w-full max-w-4xl max-h-[90vh] rounded-[3.5rem] shadow-2xl border border-white/20 overflow-hidden flex flex-col animate-in slide-in-from-bottom-10 duration-500">
              <header className="px-10 py-8 bg-neutral-50 border-b border-neutral-100 flex justify-between items-center shrink-0">
                <div>
                  <h3 className="text-3xl font-black tracking-tight text-gray-900">
                    {editingProduct === 'new' ? 'New Global Stock Unit' : 'Refine Stock Specifications'}
                  </h3>
                  <p className="text-[10px] font-black uppercase text-[#3D8593] tracking-[0.3em] mt-1">Inventory Management Suite</p>
                </div>
                <button onClick={() => setEditingProduct(null)} className="p-3 hover:bg-white rounded-2xl transition-all">
                  <X className="w-6 h-6 text-gray-400" />
                </button>
              </header>

              <form onSubmit={handleSaveProduct} className="flex-1 overflow-y-auto p-10 space-y-10">
                <div className="grid md:grid-cols-2 gap-10">
                  <div className="space-y-6">
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2 mb-2"><Smartphone className="w-3.5 h-3.5" /> Product Name</label>
                      <input
                        required
                        name="name"
                        defaultValue={typeof editingProduct === 'object' ? editingProduct.name : ''}
                        className="w-full bg-neutral-50 border-none rounded-2xl px-6 py-4 font-bold focus:ring-4 focus:ring-teal-100 transition-all"
                        placeholder="e.g. iPhone 15 Pro Max"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2 mb-2"><DollarSign className="w-3.5 h-3.5" /> Price (KES)</label>
                        <input
                          required
                          type="number"
                          name="priceKES"
                          defaultValue={typeof editingProduct === 'object' ? editingProduct.priceKES : ''}
                          className="w-full bg-neutral-50 border-none rounded-2xl px-6 py-4 font-bold focus:ring-4 focus:ring-teal-100 transition-all"
                          placeholder="120000"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2 mb-2"><TrendingUp className="w-3.5 h-3.5" /> Old Price (Optional)</label>
                        <input
                          type="number"
                          name="discountPriceKES"
                          defaultValue={typeof editingProduct === 'object' ? editingProduct.discountPriceKES : ''}
                          className="w-full bg-neutral-50 border-none rounded-2xl px-6 py-4 font-bold focus:ring-4 focus:ring-teal-100 transition-all"
                          placeholder="135000"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2 mb-2"><ImageIcon className="w-3.5 h-3.5" /> Image URLs (Comma separated)</label>
                      <input
                        name="imageUrls"
                        defaultValue={typeof editingProduct === 'object' ? editingProduct.imageUrls.join(', ') : ''}
                        className="w-full bg-neutral-50 border-none rounded-2xl px-6 py-4 font-medium focus:ring-4 focus:ring-teal-100 transition-all text-xs"
                        placeholder="https://image1.com, https://image2.com"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2 mb-2"><Youtube className="w-3.5 h-3.5" /> Product Video URL (Optional)</label>
                      <input
                        name="videoUrl"
                        defaultValue={typeof editingProduct === 'object' ? editingProduct.videoUrl : ''}
                        className="w-full bg-neutral-50 border-none rounded-2xl px-6 py-4 font-medium focus:ring-4 focus:ring-teal-100 transition-all text-xs"
                        placeholder="https://youtube.com/watch?v=..."
                      />
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2 mb-2"><Tag className="w-3.5 h-3.5" /> Global Category</label>
                      <input
                        required
                        name="category"
                        defaultValue={typeof editingProduct === 'object' ? editingProduct.category : 'Electronics'}
                        className="w-full bg-neutral-50 border-none rounded-2xl px-6 py-4 font-bold focus:ring-4 focus:ring-teal-100 transition-all"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2 mb-2"><RefreshCcw className="w-3.5 h-3.5" /> Availability</label>
                        <select
                          name="availability"
                          defaultValue={typeof editingProduct === 'object' ? editingProduct.availability : Availability.IMPORT}
                          className="w-full bg-neutral-50 border-none rounded-2xl px-6 py-4 font-bold focus:ring-4 focus:ring-teal-100 transition-all"
                        >
                          <option value={Availability.LOCAL}>Local Stock</option>
                          <option value={Availability.IMPORT}>On Import</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2 mb-2"><Truck className="w-3.5 h-3.5" /> Shipping ETA</label>
                        <input
                          name="shippingDuration"
                          defaultValue={typeof editingProduct === 'object' ? editingProduct.shippingDuration : '2-3 Weeks Air'}
                          className="w-full bg-neutral-50 border-none rounded-2xl px-6 py-4 font-bold focus:ring-4 focus:ring-teal-100 transition-all"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2 mb-2"><List className="w-3.5 h-3.5" /> Stock Count & Meta</label>
                      <div className="flex gap-2">
                        <input
                          name="stockCount"
                          type="number"
                          placeholder="Quantity"
                          defaultValue={typeof editingProduct === 'object' ? editingProduct.stockCount : 0}
                          className="flex-1 bg-neutral-50 border-none rounded-2xl px-4 py-3 text-xs font-bold"
                        />
                        <div className="flex-1 bg-neutral-50 border-none rounded-2xl px-4 py-3 text-xs font-bold text-gray-400 flex items-center">
                          {typeof editingProduct === 'object' ? editingProduct.variations.length : 0} Variants
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ADVANCED VARIATION MANAGER */}
                <div className="bg-neutral-50 rounded-[2.5rem] p-8 space-y-6">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-black uppercase tracking-widest text-[#3D8593] flex items-center gap-2">
                      <Box className="w-3.5 h-3.5" /> High-Ticket Variations
                    </label>
                    <div className="flex gap-2">
                      <div className="flex bg-white rounded-xl border border-neutral-100 overflow-hidden shadow-sm">
                        <input
                          type="text"
                          placeholder="Bulk sizes (S, M, L...)"
                          value={bulkVariationInput}
                          onChange={(e) => setBulkVariationInput(e.target.value)}
                          className="px-4 py-2 text-[9px] font-bold outline-none w-40"
                        />
                        <button
                          type="button"
                          onClick={addBulkSizes}
                          className="px-3 py-2 bg-teal-50 text-[#3D8593] hover:bg-teal-100 transition-all font-black"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={addVariation}
                        className="px-4 py-2 bg-[#3D8593] text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-neutral-900 transition-all flex items-center gap-2"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add Option
                      </button>
                    </div>
                  </div>

                  {localVariations.length === 0 ? (
                    <p className="text-[10px] text-gray-400 font-bold italic py-4 text-center">No variations defined for this asset.</p>
                  ) : (
                    <div className="space-y-3">
                      {localVariations.map((v, idx) => (
                        <div key={idx} className="flex gap-3 animate-in slide-in-from-right-2 duration-300">
                          <select
                            value={v.type}
                            onChange={(e) => updateVariation(idx, { type: e.target.value as any })}
                            className="w-32 bg-white border border-neutral-100 rounded-xl px-3 py-3 text-[10px] font-black uppercase outline-none focus:ring-2 focus:ring-teal-100"
                          >
                            <option value="Color">Color</option>
                            <option value="Capacity">Capacity</option>
                            <option value="Size">Size</option>
                            <option value="Design">Design</option>
                            <option value="Bundle">Bundle</option>
                          </select>
                          <input
                            type="text"
                            placeholder="Name (e.g. Titanium Blue)"
                            value={v.name}
                            onChange={(e) => updateVariation(idx, { name: e.target.value })}
                            className="flex-1 bg-white border border-neutral-100 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-teal-100"
                          />
                          <input
                            type="text"
                            placeholder="Variation Image URL"
                            value={v.imageUrl || ''}
                            onChange={(e) => updateVariation(idx, { imageUrl: e.target.value })}
                            className="flex-1 bg-white border border-neutral-100 rounded-xl px-4 py-3 text-[10px] font-bold outline-none focus:ring-2 focus:ring-teal-100"
                          />
                          <div className="relative w-28" title="What this option costs, in full. Type 4500 and the customer pays 4500 — nothing is added on top. Leave blank to charge the product's own price.">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[9px] font-black text-gray-400">KES</span>
                            <input
                              type="number"
                              placeholder="Price"
                              value={v.priceKES || ''}
                              onChange={(e) => updateVariation(idx, { priceKES: parseInt(e.target.value) || 0 })}
                              className="w-full bg-white border border-neutral-100 rounded-xl pl-11 pr-2 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-teal-100"
                            />
                          </div>
                          <div className="relative w-24" title="Pieces in stock for this variant (leave blank to not track)">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[9px] font-black text-gray-400">PCS</span>
                            <input
                              type="number"
                              min={0}
                              placeholder="Stock"
                              value={v.stockCount ?? ''}
                              onChange={(e) => updateVariation(idx, { stockCount: e.target.value === '' ? undefined : Math.max(0, parseInt(e.target.value) || 0) })}
                              className="w-full bg-white border border-neutral-100 rounded-xl pl-9 pr-2 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-teal-100"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => removeVariation(idx)}
                            className="p-3 bg-rose-50 text-rose-500 rounded-xl hover:bg-rose-500 hover:text-white transition-all"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2 mb-2"><AlignLeft className="w-3.5 h-3.5" /> Detailed Strategic Description</label>
                  <textarea
                    required
                    name="description"
                    defaultValue={typeof editingProduct === 'object' ? editingProduct.description : ''}
                    rows={4}
                    className="w-full bg-neutral-50 border-none rounded-3xl px-8 py-6 font-medium text-sm focus:ring-4 focus:ring-teal-100 transition-all resize-none"
                    placeholder="The most premium device featuring AI capabilities and titanium structure..."
                  />
                </div>

                <div className="flex gap-4 pt-4 shrink-0">
                  <button
                    type="submit"
                    className="flex-1 py-6 bg-neutral-900 text-white rounded-[2rem] font-black uppercase text-[11px] tracking-widest shadow-2xl hover:bg-black transition-all"
                  >
                    Confirm Stock Update
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingProduct(null)}
                    className="px-10 py-6 bg-neutral-100 text-gray-400 rounded-[2rem] font-black uppercase text-[11px] tracking-widest hover:bg-neutral-200 transition-all"
                  >
                    Discard
                  </button>
                </div>
              </form>
            </div>
          </div>
        )
      }

      {/* PRICE EDIT MODAL */}
      {
        editingPrice && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-[3rem] p-8 md:p-12 w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-teal-400 to-[#3D8593]" />

              <div className="mb-8">
                <h3 className="text-3xl font-black text-gray-900 tracking-tight mb-2">Adjust Strategy</h3>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                  Live Currency Sync & Margin Calc
                </p>
              </div>

              <div className="space-y-8">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2 mb-3">
                    <DollarSign className="w-3.5 h-3.5" /> Source Base Price (USD)
                  </label>
                  <div className="relative">
                    <span className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
                    <input
                      type="number"
                      autoFocus
                      value={priceEditUSD}
                      onChange={(e) => handlePriceUSDChange(e.target.value)}
                      className="w-full bg-neutral-50 border-none rounded-[2rem] pl-10 pr-6 py-5 text-xl font-black focus:ring-4 focus:ring-teal-100 transition-all outline-none"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className={`p-8 rounded-[2.5rem] transition-all bg-neutral-50 border border-neutral-100`}>
                  <div className="flex justify-between items-start mb-4">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                      <RefreshCcw className="w-3.5 h-3.5" /> Calculated Output
                    </label>
                    <button
                      onClick={() => setPriceManualOverride(!priceManualOverride)}
                      className={`px-4 py-2 rounded-full text-[8px] font-black uppercase tracking-widest transition-all border ${priceManualOverride ? 'bg-orange-50 text-orange-600 border-orange-100' : 'bg-white text-gray-400 border-neutral-200 hover:border-gray-300'}`}
                    >
                      {priceManualOverride ? 'Manual Mode Active' : 'Auto-Sync Mode'}
                    </button>
                  </div>

                  {priceCalculating ? (
                    <div className="flex items-center gap-2 text-teal-600 font-medium py-2">
                      <RefreshCcw className="w-4 h-4 animate-spin" />
                      <span className="text-xs uppercase tracking-widest">Calculating...</span>
                    </div>
                  ) : (
                    <div className="relative">
                      {priceManualOverride ? (
                        <div className="relative">
                          <span className="absolute left-0 top-1/2 -translate-y-1/2 text-gray-900 font-black text-sm">KES</span>
                          <input
                            type="number"
                            value={priceEditKES || ''}
                            onChange={(e) => setPriceEditKES(parseFloat(e.target.value))}
                            className="w-full bg-white border-2 border-orange-100 rounded-2xl pl-12 pr-4 py-3 font-black text-2xl text-gray-900 focus:outline-none focus:border-orange-300"
                          />
                        </div>
                      ) : (
                        <p className="text-4xl font-black text-gray-900 tracking-tighter">
                          KES {(priceEditKES || 0).toLocaleString()}
                        </p>
                      )}
                    </div>
                  )}

                  {!priceManualOverride && (
                    <p className="text-[9px] font-bold text-gray-400 mt-4 leading-relaxed">
                      Includes flat logistics fee ($20 + 3.5%) + service fee. Strategy auto-rounds up.
                    </p>
                  )}
                </div>

                <div className="flex gap-4 pt-2">
                  <button
                    onClick={handleSavePriceEdit}
                    disabled={priceSaving || priceCalculating}
                    className="flex-1 py-5 bg-neutral-900 text-white rounded-[2rem] font-black uppercase text-[10px] tracking-widest shadow-xl hover:bg-black hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {priceSaving ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {priceSaving ? 'Syncing...' : 'Save Strategy'}
                  </button>
                  <button
                    onClick={() => setEditingPrice(null)}
                    disabled={priceSaving}
                    className="px-8 py-5 bg-white border border-neutral-100 text-gray-400 rounded-[2rem] font-black uppercase text-[10px] tracking-widest hover:bg-neutral-50 transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      }

      {/* BLOG EDIT MODAL */}
      {
        editingBlog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-[3rem] p-8 md:p-12 w-full max-w-2xl shadow-2xl animate-in zoom-in-95 duration-200 relative overflow-hidden h-[90vh]">
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-teal-400 to-[#3D8593]" />
              <div className="absolute top-0 right-0 p-8 z-10">
                <button
                  onClick={() => setEditingBlog(null)}
                  className="p-2 bg-white rounded-full hover:bg-neutral-50 transition-colors shadow-sm"
                >
                  <X className="w-6 h-6 text-gray-400" />
                </button>
              </div>

              <div className="h-full flex flex-col">
                <div className="mb-6 shrink-0">
                  <h3 className="text-3xl font-black text-gray-900 tracking-tight mb-2">
                    {editingBlog === 'new' ? 'New Intelligence Piece' : 'Edit Intelligence'}
                  </h3>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                    Content Management System
                  </p>
                </div>

                <form onSubmit={handleSaveBlog} className="flex-1 overflow-y-auto pr-2 space-y-6 no-scrollbar pb-6">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2 mb-2">
                      <FileText className="w-3.5 h-3.5" /> Headline / Title
                    </label>
                    <input
                      required
                      name="title"
                      defaultValue={editingBlog !== 'new' ? editingBlog.title : ''}
                      className="w-full bg-neutral-50 border-none rounded-2xl px-6 py-4 font-bold text-lg focus:ring-4 focus:ring-teal-100 transition-all"
                      placeholder="Enter article title..."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2 mb-2">
                        <Tag className="w-3.5 h-3.5" /> Category
                      </label>
                      <select
                        name="category"
                        defaultValue={editingBlog !== 'new' ? editingBlog.category : 'Tech Insights'}
                        className="w-full bg-neutral-50 border-none rounded-2xl px-6 py-4 font-bold text-sm focus:ring-4 focus:ring-teal-100 transition-all"
                      >
                        <option value="Tech Insights">Tech Insights</option>
                        <option value="Market Analysis">Market Analysis</option>
                        <option value="Product Reviews">Product Reviews</option>
                        <option value="Company News">Company News</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2 mb-2">
                        <User className="w-3.5 h-3.5" /> Author
                      </label>
                      <input
                        name="author"
                        defaultValue={editingBlog !== 'new' ? editingBlog.author : 'Admin'}
                        className="w-full bg-neutral-50 border-none rounded-2xl px-6 py-4 font-bold text-sm focus:ring-4 focus:ring-teal-100 transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2 mb-2">
                      <ImageIcon className="w-3.5 h-3.5" /> Cover Image URL
                    </label>
                    <input
                      required
                      name="imageUrl"
                      defaultValue={editingBlog !== 'new' ? editingBlog.imageUrl : ''}
                      className="w-full bg-neutral-50 border-none rounded-2xl px-6 py-4 font-medium text-sm focus:ring-4 focus:ring-teal-100 transition-all"
                      placeholder="https://..."
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2 mb-2">
                      <AlignLeft className="w-3.5 h-3.5" /> Short Excerpt
                    </label>
                    <textarea
                      required
                      name="excerpt"
                      defaultValue={editingBlog !== 'new' ? editingBlog.excerpt : ''}
                      rows={2}
                      className="w-full bg-neutral-50 border-none rounded-2xl px-6 py-4 font-medium text-sm focus:ring-4 focus:ring-teal-100 transition-all resize-none"
                      placeholder="Brief summary for the card view..."
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2 mb-2">
                      <FileText className="w-3.5 h-3.5" /> Full Article Content
                    </label>
                    <textarea
                      required
                      name="content"
                      defaultValue={editingBlog !== 'new' ? editingBlog.content : ''}
                      rows={12}
                      className="w-full bg-neutral-50 border-none rounded-3xl px-8 py-6 font-medium text-base focus:ring-4 focus:ring-teal-100 transition-all resize-none leading-relaxed"
                      placeholder="Write your article content here..."
                    />
                  </div>

                  <div className="flex gap-4 pt-4 shrink-0">
                    <button
                      type="submit"
                      className="flex-1 py-6 bg-neutral-900 text-white rounded-[2rem] font-black uppercase text-[11px] tracking-widest shadow-2xl hover:bg-black transition-all"
                    >
                      {editingBlog === 'new' ? 'Publish Piece' : 'Save Changes'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingBlog(null)}
                      className="px-10 py-6 bg-neutral-100 text-gray-400 rounded-[2rem] font-black uppercase text-[11px] tracking-widest hover:bg-neutral-200 transition-all"
                    >
                      Discard
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )
      }

      {/* HIDDEN PRINT TEMPLATE */}
      {
        printingInvoice && (
          <div id="printable-invoice" className="hidden print:block fixed inset-0 z-[-1] bg-white p-12 text-black">
            <div className="flex justify-between items-start border-b-2 border-black pb-8 mb-8">
              <div>
                <h1 className="text-4xl font-black tracking-tighter uppercase mb-2">LEGIT GRINDER</h1>
                <p className="text-xs font-bold uppercase tracking-[0.3em] text-gray-500 mb-2">Official Sales Invoice / Ship Label</p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#3D8593]">Web: www.legitgrinder.com • IG: @legitgrinderimports</p>
              </div>
              <div className="text-right">
                <p className="text-xl font-black">#{printingInvoice.invoiceNumber}</p>
                <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase">{new Date().toLocaleDateString()}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-12 mb-12">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4">Consignee Details</p>
                <p className="text-2xl font-black mb-2">{printingInvoice.clientName}</p>
                <p className="text-sm font-bold text-gray-600 mb-1">{printingInvoice.email}</p>
                <p className="text-sm font-bold text-gray-600">{printingInvoice.phone}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4">Shipping Destination</p>
                <p className="text-lg font-bold mb-2">{printingInvoice.location}</p>
                <p className="text-[10px] font-black uppercase py-2 px-4 bg-black text-white rounded inline-block">
                  Priority Fulfillment
                </p>
              </div>
            </div>

            <div className="border-t-2 border-neutral-100 pt-8">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b-2 border-black">
                    <th className="py-4 text-[10px] font-black uppercase tracking-widest">Article Description</th>
                    <th className="py-4 text-right text-[10px] font-black uppercase tracking-widest">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {printingInvoice.items && printingInvoice.items.length > 0 ? (
                    printingInvoice.items.map((item, idx) => (
                      <tr key={idx} className="border-b border-neutral-100">
                        <td className="py-6">
                          <p className="text-lg font-black uppercase">{item.quantity}x {item.name}</p>
                          <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-widest">Standard Legit Assurance Warranty Included</p>
                        </td>
                        <td className="py-6 text-right">
                          <p className="text-xl font-black">
                            {item.priceKES ? `KES ${item.priceKES.toLocaleString()}` : "TBD"}
                          </p>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr className="border-b border-neutral-100">
                      <td className="py-6">
                        <p className="text-lg font-black uppercase">{printingInvoice.productName}</p>
                        <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-widest">Standard Legit Assurance Warranty Included</p>
                      </td>
                      <td className="py-6 text-right">
                        <p className="text-xl font-black">
                          {printingInvoice.totalKES ? `KES ${printingInvoice.totalKES.toLocaleString()}` : "TBD"}
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-12 flex justify-between items-end border-t-2 border-black pt-8">
              <div>
                <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-2">Authenticator Signature</p>
                <div className="w-48 h-12 border-b-2 border-neutral-200"></div>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black uppercase text-gray-400 mb-1">Status</p>
                <p className="text-xl font-black uppercase tracking-widest">{printingInvoice.status}</p>
              </div>
            </div>

            <div className="mt-20 pt-8 border-t border-dashed border-gray-200 text-center">
              <p className="text-[9px] font-black uppercase tracking-[0.5em] text-gray-300 italic">Authenticity Guaranteed by LEGIT GRINDER • Logistics Dept</p>
            </div>
          </div>
        )
      }

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        
        @media print {
          body * { visibility: hidden; }
          #printable-invoice, #printable-invoice * { visibility: visible; }
          #printable-invoice {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: white;
            padding: 20px;
          }
        }
      `}</style>
      {/* MANUAL INVOICE CREATION MODAL */}
      {isCreatingManualInvoice && (() => {
        const inputCls = "w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2.5 font-semibold text-sm text-gray-900 outline-none focus:border-[#3D8593] focus:bg-white transition-colors placeholder:text-neutral-300 placeholder:font-medium";
        const labelCls = "text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1.5";
        const itemsTotal = manualOrderItems.reduce((acc, item) => acc + (item.priceKES || 0) * (item.quantity || 1), 0);
        return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-300 relative max-h-[92vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-7 py-5 border-b border-neutral-100">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl bg-teal-50 text-[#3D8593] flex items-center justify-center"><FileText className="w-5 h-5" /></span>
                <div>
                  <h3 className="text-lg font-black text-gray-900 tracking-tight leading-none">New Order</h3>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Create a manual invoice</p>
                </div>
              </div>
              <button onClick={() => setIsCreatingManualInvoice(false)} className="p-2 rounded-lg hover:bg-neutral-100 transition-colors">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <form id="manualOrderForm" onSubmit={handleCreateManualOrder} className="flex-1 overflow-y-auto px-7 py-6 space-y-5">
              {/* Client */}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className={labelCls}>Client Full Name</label>
                  <input required name="clientName" className={inputCls} placeholder="e.g. Dennis Munga" />
                </div>
                <div>
                  <label className={labelCls}>WhatsApp Number</label>
                  <input name="clientWhatsapp" className={inputCls} placeholder="254791873538" />
                </div>
                <div>
                  <label className={labelCls}>Currency</label>
                  <select value={manualOrderCurrency} onChange={(e) => setManualOrderCurrency(e.target.value as 'KES' | 'USD')} className={inputCls}>
                    <option value="KES">KES</option>
                    <option value="USD">USD</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className={labelCls}>Client Email <span className="text-neutral-300 normal-case font-medium">— for emailed invoice/receipt</span></label>
                  <input type="email" name="clientEmail" className={inputCls} placeholder="client@example.com" />
                </div>
                <div className="col-span-2">
                  <label className={labelCls}>Invoice Title <span className="text-neutral-300 normal-case font-medium">— optional</span></label>
                  <input name="customTitle" className={inputCls} placeholder="e.g. Amazon Packages (defaults to items)" />
                </div>
              </div>

              {/* Items */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className={labelCls + " mb-0"}>Items</label>
                  <button type="button" onClick={() => setManualOrderItems([...manualOrderItems, { name: '', quantity: 1, priceKES: 0 }])} className="text-[10px] font-black uppercase tracking-widest text-[#3D8593] hover:text-[#2d626c] flex items-center gap-1">
                    <Plus className="w-3 h-3" /> Add
                  </button>
                </div>
                <div className="space-y-3">
                  {manualOrderItems.map((item, idx) => (
                    <div key={idx} className="bg-neutral-50/60 border border-neutral-100 rounded-xl p-2.5 space-y-2 relative">
                      {/* Product name — full width so there's room to type */}
                      <input required value={item.name} onChange={(e) => {
                        const n = [...manualOrderItems]; n[idx].name = e.target.value; setManualOrderItems(n);
                      }} className={inputCls + " w-full bg-white"} placeholder="Product name (e.g. M3 Pro MacBook)" />
                      {/* Qty + Unit price on their own row */}
                      <div className="flex gap-2">
                        <div className="w-20">
                          <span className="text-[8px] font-black uppercase tracking-widest text-neutral-300 block mb-0.5 ml-1">Qty</span>
                          <input required type="number" min="1" value={item.quantity} onChange={(e) => {
                            const n = [...manualOrderItems]; n[idx].quantity = parseInt(e.target.value) || 1; setManualOrderItems(n);
                          }} className={inputCls + " w-full text-center px-2 bg-white"} />
                        </div>
                        <div className="flex-1">
                          <span className="text-[8px] font-black uppercase tracking-widest text-neutral-300 block mb-0.5 ml-1">Unit Price ({manualOrderCurrency})</span>
                          <input required type="number" min="0" value={item.priceKES} onChange={(e) => {
                            const n = [...manualOrderItems]; n[idx].priceKES = parseFloat(e.target.value) || 0; setManualOrderItems(n);
                          }} className={inputCls + " w-full text-right px-3 bg-white"} placeholder="0" />
                        </div>
                      </div>
                      {manualOrderItems.length > 1 && (
                        <button type="button" onClick={() => setManualOrderItems(manualOrderItems.filter((_, i) => i !== idx))} className="absolute -top-2 -right-2 w-6 h-6 bg-white border border-neutral-200 rounded-full flex items-center justify-center text-neutral-400 hover:text-rose-500 hover:border-rose-200 transition-colors shadow-sm">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Total + date + code */}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className={labelCls}>Total Amount <span className="text-neutral-300 normal-case font-medium">— blank = auto-calculate</span></label>
                  <input type="text" name="totalKES" className={inputCls} placeholder={`Auto: ${manualOrderCurrency} ${itemsTotal.toLocaleString()}`} />
                </div>
                <div>
                  <label className={labelCls}>Order Date <span className="text-neutral-300 normal-case font-medium">— optional</span></label>
                  <input type="date" name="createdAt" className={inputCls + " text-gray-500"} />
                </div>
                <div>
                  <label className={labelCls}>Receipt / M-Pesa Code <span className="text-neutral-300 normal-case font-medium">— optional</span></label>
                  <input type="text" name="paystackReference" className={inputCls} placeholder="e.g. QWX982M21" />
                </div>
              </div>

              {/* Cost breakdown */}
              <details className="group">
                <summary className="flex items-center gap-2 cursor-pointer text-[10px] font-black uppercase tracking-widest text-[#3D8593] list-none">
                  <ChevronRight className="w-3.5 h-3.5 group-open:rotate-90 transition-transform" /> Internal Cost Breakdown (optional)
                </summary>
                <div className="grid grid-cols-2 gap-3 mt-3 pl-1">
                  {[
                    { name: 'buyingPriceKES', label: 'Buying Price' },
                    { name: 'shippingFeeKES', label: 'Shipping Fee' },
                    { name: 'logisticsCostKES', label: 'Logistics / Riders' },
                    { name: 'serviceFeeKES', label: 'Service Fee' },
                  ].map(f => (
                    <div key={f.name}>
                      <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 block mb-1">{f.label} (KES)</label>
                      <input type="number" name={f.name} defaultValue="0" className={inputCls + " py-2"} />
                    </div>
                  ))}
                </div>
              </details>

              {/* Payment status */}
              <div>
                <label className={labelCls}>Payment Status</label>
                <div className="flex gap-2">
                  {Object.values(PaymentStatus).map(status => (
                    <label key={status} className={`flex-1 flex items-center justify-center py-2.5 rounded-xl border cursor-pointer transition-all text-[9px] font-black uppercase tracking-wider ${status === manualOrderPaymentStatus
                      ? 'bg-[#3D8593] border-[#3D8593] text-white'
                      : 'bg-neutral-50 border-neutral-200 text-gray-400 hover:border-[#3D8593]'
                      }`}>
                      <input type="radio" name="paymentStatus" value={status} className="hidden" checked={status === manualOrderPaymentStatus} onChange={() => setManualOrderPaymentStatus(status)} />
                      {status}
                    </label>
                  ))}
                </div>

                {/* "Partially paid" is meaningless without a figure — without it
                    the balance is unknowable and every later document quotes the
                    whole total as still owing. */}
                {manualOrderPaymentStatus === PaymentStatus.PARTIALLY_PAID && (
                  <div className="mt-3">
                    <label className={labelCls}>How much have they paid? <span className="text-neutral-300 normal-case font-medium">— required</span></label>
                    <input
                      type="number"
                      name="amountPaidKES"
                      value={manualOrderPaidAmount}
                      onChange={(e) => setManualOrderPaidAmount(e.target.value)}
                      placeholder="e.g. 40000"
                      className={inputCls}
                    />
                    {(() => {
                      const paid = parseFloat(manualOrderPaidAmount);
                      if (!Number.isFinite(paid) || paid <= 0) return (
                        <p className="text-[10px] font-bold text-amber-600 mt-1.5 leading-snug">
                          Leave this blank and the balance can't be worked out — the order will be flagged until you fill it in.
                        </p>
                      );
                      if (paid >= itemsTotal && itemsTotal > 0) return (
                        <p className="text-[10px] font-bold text-rose-500 mt-1.5 leading-snug">
                          That covers the whole order — mark it Paid instead.
                        </p>
                      );
                      return (
                        <p className="text-[10px] font-bold text-[#3D8593] mt-1.5 leading-snug">
                          Balance due · {manualOrderCurrency} {(itemsTotal - paid).toLocaleString()}
                        </p>
                      );
                    })()}
                  </div>
                )}
              </div>
            </form>

            {/* Footer — live total + actions (sticky) */}
            <div className="px-7 py-4 border-t border-neutral-100 bg-neutral-50/50">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Order Total</span>
                <span className="text-lg font-black text-gray-900 tracking-tight">{manualOrderCurrency} {itemsTotal.toLocaleString()}</span>
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setIsCreatingManualInvoice(false)} className="px-6 py-3 bg-white border border-neutral-200 text-gray-500 rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-neutral-100 transition-all">
                  Cancel
                </button>
                <button type="submit" form="manualOrderForm" className="flex-1 py-3 bg-[#3D8593] text-white rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-[#0f1a1c] transition-all flex items-center justify-center gap-2">
                  <Check className="w-4 h-4" /> Create Order
                </button>
              </div>
            </div>
          </div>
        </div>
        );
      })()}

      {/* CONTRACT GENERATOR MODAL */}
      {isGeneratingContract && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white rounded-[4rem] p-10 w-full max-w-3xl shadow-[0_0_100px_rgba(168,85,247,0.3)] animate-in zoom-in-95 duration-300 relative border border-white/20 max-h-[95vh] overflow-y-auto">
            <button
              onClick={() => setIsGeneratingContract(false)}
              className="absolute top-8 right-8 p-4 bg-neutral-100 rounded-2xl hover:bg-neutral-200 transition-all shadow-sm"
            >
              <X className="w-6 h-6 text-gray-400" />
            </button>

            <div className="mb-10">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-purple-50 rounded-2xl text-purple-600">
                  <ScrollText className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-3xl font-black text-gray-900 tracking-tight leading-none uppercase">Legal <span className="text-purple-600">Contract</span></h3>
                  <p className="text-[10px] font-black text-purple-400 uppercase tracking-[0.3em] mt-1">Sourcing & Freight Agency Agreement</p>
                </div>
              </div>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              if (!contractInvoice) return;

              const printWin = window.open('', '', 'width=900,height=1000');
              if (!printWin) return;

              const logoUrl = "https://res.cloudinary.com/dsthpp4oj/image/upload/v1766830586/legitGrinder_PNG_3x-100_oikrja.jpg";
              const dateString = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

              printWin.document.write(`
                <html>
                  <head>
                    <title>Contract - ${contractFormData.clientName}</title>
                    <style>
                      body { font-family: 'Inter', 'Segoe UI', sans-serif; padding: 60px; color: #1a1a1a; line-height: 1.6; position: relative; }
                      .watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); opacity: 0.03; width: 80%; z-index: -1; }
                      .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; border-bottom: 3px solid #3d8593; padding-bottom: 20px; }
                      .brand h1 { margin: 0; font-size: 28px; font-weight: 900; color: #3d8593; text-transform: uppercase; }
                      .brand p { margin: 5px 0 0; font-size: 12px; font-weight: 600; color: #666; text-transform: uppercase; letter-spacing: 1px; }
                      .logo { width: 100px; }
                      .doc-title { text-align: center; font-size: 24px; font-weight: 900; margin: 30px 0; text-transform: uppercase; letter-spacing: 2px; text-decoration: underline; }
                      .intro { margin-bottom: 30px; font-size: 14px; text-align: justify; }
                      .section { margin-bottom: 25px; }
                      .section h3 { font-size: 16px; font-weight: 800; text-transform: uppercase; margin-bottom: 10px; color: #3d8593; border-bottom: 1px solid #eee; padding-bottom: 5px; }
                      .section p { font-size: 14px; text-align: justify; margin: 8px 0; }
                      .variable { font-weight: 700; text-decoration: underline; }
                      .signatures { margin-top: 60px; display: flex; justify-content: space-between; }
                      .sig-block { width: 45%; }
                      .sig-line { border-bottom: 1px solid #000; margin-top: 50px; margin-bottom: 10px; }
                      .sig-name { font-weight: 800; font-size: 14px; text-transform: uppercase; }
                      .sig-title { font-size: 12px; color: #666; }
                      .footer-note { text-align: center; font-size: 10px; color: #999; margin-top: 40px; text-transform: uppercase; letter-spacing: 1px; }
                    </style>
                  </head>
                  <body>
                    <img src="${logoUrl}" class="watermark" />
                    <div class="header">
                      <div class="brand">
                        <h1>LEGITGRINDER IMPORTS</h1>
                        <p>Business No: BN-RRSK5DDD</p>
                        <p>International Trade & Logistics</p>
                        <p>Nairobi, Kenya | +254 791 873538</p>
                      </div>
                      <img src="${logoUrl}" class="logo" />
                    </div>

                    <div class="doc-title">Sourcing and Freight Agency Agreement</div>

                    <div class="intro">
                      <p>This Sourcing and Freight Agency Agreement (the "Agreement") is entered into on this <span class="variable">${dateString}</span>, by and between:</p>
                      <p><strong>LEGITGRINDER IMPORTS</strong>, a registered business entity in the Republic of Kenya, herein represented by <strong>Dennis Munga</strong> (National ID Number: <strong>39279734</strong>), is acting strictly as an autonomous sourcing and logistics agent (the "Agent") on behalf of:</p>
                      <p><span class="variable">${contractFormData.clientName.toUpperCase()}</span>, holding National ID / Company Registration No. <span class="variable">${contractFormData.clientIdReg || '______________'}</span> (the "Client").</p>
                    </div>

                    <div class="section">
                      <h3>1. Scope of Agreement & Relationship of Parties</h3>
                      <p>1.1. <strong>LegitGrinder Imports</strong>, a registered business entity in the Republic of Kenya, herein represented by <strong>Dennis Munga</strong> (National ID Number: <strong>39279734</strong>), is acting strictly as an autonomous sourcing and logistics agent (the "Agent") on behalf of <span class="variable">${contractFormData.clientName.toUpperCase()}</span> (the "Client").</p>
                      <p>1.2. The Agent's responsibilities include: sourcing the item described herein, placing the order with the supplier, managing international transit via freight forwarding channels, handling customs clearance at the port of entry, and bringing the item to the Agent's warehouse/hub in Nairobi.</p>
                      <p>1.3. <strong>Item Description:</strong> <span class="variable">${contractFormData.itemDescription}</span></p>
                      <p>1.4. <strong>Specifications:</strong> <span class="variable">${contractFormData.itemSpecifications || 'N/A'}</span></p>
                    </div>

                    <div class="section">
                      <h3>2. Payment Terms, Non-Refundability & Price Fluctuations</h3>
                      <p>2.1. <strong>Total Quotation:</strong> ${contractInvoice?.currency || 'KES'} <span class="variable">${contractFormData.totalQuotation || '0'}</span></p>
                      <p>2.2. <strong>Deposit Policy & Non-Arrival Guarantee:</strong> The upfront payment of ${contractInvoice?.currency || 'KES'} <span class="variable">${contractFormData.upfrontPayment || '0'}</span> must be paid in full before the order is placed. This deposit is <strong>100% non-refundable in the event of Client cancellation or 'buyer’s remorse'</strong> once the order has been processed with the supplier. However, if the item fails to arrive or is permanently lost in transit, this non-refundability clause does not apply; the Client is legally entitled to a <strong>full 100% refund</strong> or an immediate replacement item.</p>
                      <p>2.3. <strong>Fixed Shipping Rates Policy:</strong> The shipping balance estimate of ${contractInvoice?.currency || 'KES'} <span class="variable">${contractFormData.shippingBalanceEstimate || '0'}</span> serves as a preliminary figure. The final shipping fee will be permanently <strong>fixed and locked in</strong> with the Client immediately after the goods are received, weighed, and measured by the freight forwarder at the origin warehouse (prior to being loaded onto the ship or plane). Once loaded, no further shipping fluctuations, CBM rate hikes, or forex adjustments will be passed on to the Client.</p>
                      <p>2.4. The item will not be released to the Client until all outstanding balances are cleared.</p>
                    </div>

                    <div class="section">
                      <h3>3. Logistics, Delivery, Collection & Storage Penalties</h3>
                      <p>3.1. <strong>Shipping Method:</strong> <span class="variable">${contractFormData.shippingMethod}</span></p>
                      <p>3.2. <strong>Estimated Delivery:</strong> ${contractFormData.shippingMethod === 'Air Freight' ? '2 to 3 weeks after the item departs the origin country.' : '30 to 45 days after the item departs the origin country.'}</p>
                      <p>3.3. <strong>Grace Period Clause:</strong> Both parties agree to a mandatory 15-day grace period beyond the estimated delivery timelines.</p>
                      <p>3.4. <strong>Collection & Storage Fees:</strong> Upon arrival in Nairobi, the Agent will notify the Client. The Client has exactly <strong>7 days</strong> to collect the item free of charge. Starting on the <strong>8th day</strong>, a mandatory storage fee of <strong>500 KES per day</strong> will accrue.</p>
                      <p>3.5. <strong>Confiscation:</strong> If the item remains uncollected or unpaid for <strong>30 days</strong> after the arrival notification, LEGITGRINDER IMPORTS reserves the legal right to seize, auction, or sell the item to recover all incurred costs, with no refund owed to the Client.</p>
                    </div>

                    <div class="section">
                      <h3>4. Limitation of Liability, Government Holds & Transit Risks</h3>
                      <p>4.1. <strong>Government Delays:</strong> The Agent is completely exempt from liability if the Kenya Revenue Authority (KRA), Kenya Bureau of Standards (KEBS), or any other official government entity holds, inspects, or delays the consolidated container/cargo beyond the 15-day grace period, provided all documentation submitted by the Agent was accurate.</p>
                      <p>4.2. <strong>Cargo Protection & Dispute Handling:</strong> While direct liability for transit damage rests with the third-party freight carrier, the Agent does not alienate themselves from responsibility. The Agent assumes full responsibility for securely packaging/labelling the items at origin (e.g., fragile markers) and <strong>actively managing, filing, and resolving all insurance claims and disputes</strong> with the carrier or supplier on the Client's behalf. The Agent guarantees they will aggressively pursue full compensation, repair, or replacement for the Client at no extra service charge.</p>
                    </div>

                    <div class="section">
                      <h3>5. Prohibited Goods Declaration</h3>
                      <p>5.1. The Client explicitly guarantees and warrants that the item being imported is completely legal, not classified as dangerous goods, and not prohibited or heavily restricted under Kenyan law without the Agent's prior knowledge.</p>
                    </div>

                    <div class="section">
                      <h3>6. Manufacturer Warranties & Product Guarantees</h3>
                      <p>6.1. LEGITGRINDER IMPORTS is a third-party agent and <strong>does not offer any independent warranties, guarantees, or performance assurances</strong> on the sourced items.</p>
                      <p>6.2. In the event of a factory defect, the Agent agrees to act solely as a liaison between the Client and the Supplier.</p>
                    </div>

                    <div class="section">
                      <h3>7. Governing Law</h3>
                      <p>7.1. This agreement shall be governed, construed, and enforced in accordance with the Laws of the Republic of Kenya.</p>
                    </div>

                    <div class="signatures">
                      <div class="sig-block">
                        <p><strong>For the Client:</strong></p>
                        <div class="sig-line"></div>
                        <p class="sig-name">${contractFormData.clientName}</p>
                        <p class="sig-title">Client / Buyer</p>
                        <p class="sig-title">Date: ${dateString}</p>
                      </div>
                      <div class="sig-block">
                        <p><strong>For the Agent:</strong></p>
                        <img src="https://res.cloudinary.com/dsthpp4oj/image/upload/v1779364844/signature_gf4qjn.png" style="height: 60px; margin-top: 10px; margin-bottom: 5px; display: block;" />
                        <div style="border-bottom: 1px solid #000; margin-bottom: 10px;"></div>
                        <p class="sig-name">LEGITGRINDER IMPORTS</p>
                        <p class="sig-title">Represented by: Dennis Munga (ID: 39279734)</p>
                        <p class="sig-title">Date: ${dateString}</p>
                      </div>
                    </div>

                    <div class="footer-note">This document is legally binding and generated electronically.</div>
                  </body>
                </html>
              `);
              printWin.document.close();
              printWin.print();
              setIsGeneratingContract(false);
            }}>
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-2 ml-2">Client Name</label>
                    <input
                      required
                      value={contractFormData.clientName}
                      onChange={e => setContractFormData({ ...contractFormData, clientName: e.target.value })}
                      className="w-full bg-neutral-50 border-none rounded-2xl px-6 py-4 font-bold text-sm focus:ring-4 focus:ring-purple-100 transition-all placeholder:text-neutral-300"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-2 ml-2">Client ID / Reg No</label>
                    <input
                      required
                      value={contractFormData.clientIdReg}
                      onChange={e => setContractFormData({ ...contractFormData, clientIdReg: e.target.value })}
                      className="w-full bg-neutral-50 border-none rounded-2xl px-6 py-4 font-bold text-sm focus:ring-4 focus:ring-purple-100 transition-all placeholder:text-neutral-300"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-2 ml-2">Item Description</label>
                    <input
                      required
                      value={contractFormData.itemDescription}
                      onChange={e => setContractFormData({ ...contractFormData, itemDescription: e.target.value })}
                      className="w-full bg-neutral-50 border-none rounded-2xl px-6 py-4 font-bold text-sm focus:ring-4 focus:ring-purple-100 transition-all placeholder:text-neutral-300"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-2 ml-2">Specifications</label>
                    <input
                      value={contractFormData.itemSpecifications}
                      onChange={e => setContractFormData({ ...contractFormData, itemSpecifications: e.target.value })}
                      className="w-full bg-neutral-50 border-none rounded-2xl px-6 py-4 font-bold text-sm focus:ring-4 focus:ring-purple-100 transition-all placeholder:text-neutral-300"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-2 ml-2">Total Quotation (KES)</label>
                    <input
                      required
                      type="number"
                      value={contractFormData.totalQuotation}
                      onChange={e => setContractFormData({ ...contractFormData, totalQuotation: e.target.value })}
                      className="w-full bg-neutral-50 border-none rounded-2xl px-6 py-4 font-bold text-sm focus:ring-4 focus:ring-purple-100 transition-all placeholder:text-neutral-300"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-2 ml-2">Upfront Payment / Deposit (KES)</label>
                    <input
                      required
                      type="number"
                      value={contractFormData.upfrontPayment}
                      onChange={e => setContractFormData({ ...contractFormData, upfrontPayment: e.target.value })}
                      className="w-full bg-neutral-50 border-none rounded-2xl px-6 py-4 font-bold text-sm focus:ring-4 focus:ring-purple-100 transition-all placeholder:text-neutral-300"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-2 ml-2">Shipping Balance Estimate (KES)</label>
                    <input
                      required
                      type="number"
                      value={contractFormData.shippingBalanceEstimate}
                      onChange={e => setContractFormData({ ...contractFormData, shippingBalanceEstimate: e.target.value })}
                      className="w-full bg-neutral-50 border-none rounded-2xl px-6 py-4 font-bold text-sm focus:ring-4 focus:ring-purple-100 transition-all placeholder:text-neutral-300"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-2 ml-2">Shipping Method</label>
                    <select
                      value={contractFormData.shippingMethod}
                      onChange={e => setContractFormData({ ...contractFormData, shippingMethod: e.target.value })}
                      className="w-full bg-neutral-50 border-none rounded-2xl px-6 py-4 font-bold text-sm focus:ring-4 focus:ring-purple-100 transition-all"
                    >
                      <option value="Air Freight">Air Freight</option>
                      <option value="Sea Freight">Sea Freight</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex gap-4 mt-10">
                <button
                  type="button"
                  onClick={() => setIsGeneratingContract(false)}
                  className="flex-1 py-6 bg-neutral-100 text-gray-400 rounded-3xl font-black uppercase tracking-widest text-[10px] hover:bg-neutral-200 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-[2] py-6 bg-purple-600 text-white rounded-3xl font-black uppercase tracking-widest text-[10px] hover:bg-black transition-all shadow-[0_20px_40px_rgba(168,85,247,0.3)] shadow-purple-200 flex items-center justify-center gap-2"
                >
                  <ScrollText className="w-5 h-5" /> Generate & Print Contract
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* IMAGE INVOICE GENERATOR MODAL */}
      {isCreatingImageInvoice && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white rounded-[4rem] p-10 w-full max-w-2xl shadow-[0_0_100px_rgba(99,102,241,0.3)] animate-in zoom-in-95 duration-300 relative border border-white/20 max-h-[95vh] overflow-y-auto">
            <button
              onClick={() => setIsCreatingImageInvoice(false)}
              className="absolute top-8 right-8 p-4 bg-neutral-100 rounded-2xl hover:bg-neutral-200 transition-all shadow-sm"
            >
              <X className="w-6 h-6 text-gray-400" />
            </button>

            <div className="mb-10">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600">
                  <ImageIcon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-3xl font-black text-gray-900 tracking-tight leading-none uppercase">Image <span className="text-indigo-600">Invoice</span></h3>
                  <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em] mt-1">Visual Product Invoice Generator</p>
                </div>
              </div>
            </div>

            <div className="space-y-8">
              {/* Client Info */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-2 ml-2">Client Name</label>
                  <input
                    value={imageInvoiceClient.name}
                    onChange={e => setImageInvoiceClient({ ...imageInvoiceClient, name: e.target.value })}
                    className="w-full bg-neutral-50 border-none rounded-2xl px-6 py-4 font-bold text-sm focus:ring-4 focus:ring-indigo-100 transition-all placeholder:text-neutral-300"
                    placeholder="e.g. Dennis Munga"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-2 ml-2">WhatsApp Number</label>
                  <input
                    value={imageInvoiceClient.whatsapp}
                    onChange={e => setImageInvoiceClient({ ...imageInvoiceClient, whatsapp: e.target.value })}
                    className="w-full bg-neutral-50 border-none rounded-2xl px-6 py-4 font-bold text-sm focus:ring-4 focus:ring-indigo-100 transition-all placeholder:text-neutral-300"
                    placeholder="254791..."
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-2 ml-2">Currency</label>
                  <select
                    value={imageInvoiceCurrency}
                    onChange={e => setImageInvoiceCurrency(e.target.value as 'KES' | 'USD')}
                    className="w-full bg-neutral-50 border-none rounded-2xl px-6 py-4 font-bold text-sm focus:ring-4 focus:ring-indigo-100 transition-all text-gray-900"
                  >
                    <option value="KES">KES</option>
                    <option value="USD">USD</option>
                  </select>
                </div>
              </div>

              {/* Items */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-2">Line Items</label>
                  <button
                    type="button"
                    onClick={() => setImageInvoiceItems([...imageInvoiceItems, { name: '', specs: '', imageUrl: '', quantity: 1, priceKES: 0 }])}
                    className="text-[10px] font-black uppercase text-indigo-600 hover:text-indigo-800 transition-colors flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Add Item
                  </button>
                </div>

                <div className="space-y-5">
                  {imageInvoiceItems.map((item, idx) => (
                    <div key={idx} className="bg-neutral-50 rounded-3xl p-5 relative group border border-neutral-100">
                      {imageInvoiceItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setImageInvoiceItems(imageInvoiceItems.filter((_, i) => i !== idx))}
                          className="absolute top-4 right-4 w-7 h-7 bg-rose-100 text-rose-500 rounded-full flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Image URL + Preview row */}
                      <div className="flex gap-4 mb-4 items-start">
                        <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-white shadow-md bg-white flex-shrink-0">
                          {item.imageUrl ? (
                            <img src={item.imageUrl} alt="" className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-neutral-200">
                              <ImageIcon className="w-6 h-6" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 block mb-1.5">Product Image URL</label>
                          <input
                            value={item.imageUrl}
                            onChange={e => { const n=[...imageInvoiceItems]; n[idx].imageUrl=e.target.value; setImageInvoiceItems(n); }}
                            className="w-full bg-white border border-neutral-100 rounded-xl px-4 py-2.5 text-xs font-bold focus:ring-2 focus:ring-indigo-100 transition-all placeholder:text-neutral-300"
                            placeholder="https://... (paste image link)"
                          />
                        </div>
                      </div>

                      {/* Name + Specs */}
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div>
                          <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 block mb-1.5">Item Name</label>
                          <input
                            value={item.name}
                            onChange={e => { const n=[...imageInvoiceItems]; n[idx].name=e.target.value; setImageInvoiceItems(n); }}
                            className="w-full bg-white border border-neutral-100 rounded-xl px-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-indigo-100 transition-all placeholder:text-neutral-300"
                            placeholder="e.g. iPhone 15 Pro Max"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 block mb-1.5">Specs / Description</label>
                          <textarea
                            value={item.specs}
                            onChange={e => { const n=[...imageInvoiceItems]; n[idx].specs=e.target.value; setImageInvoiceItems(n); }}
                            rows={2}
                            className="w-full bg-white border border-neutral-100 rounded-xl px-4 py-2 text-xs font-medium focus:ring-2 focus:ring-indigo-100 transition-all resize-none placeholder:text-neutral-300 leading-relaxed"
                            placeholder="256GB, Black Titanium, Air-shipped..."
                          />
                        </div>
                      </div>

                      {/* Qty + Price + Line Total */}
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 block mb-1.5">Qty</label>
                          <input
                            type="number" min="1"
                            value={item.quantity}
                            onChange={e => { const n=[...imageInvoiceItems]; n[idx].quantity=parseInt(e.target.value)||1; setImageInvoiceItems(n); }}
                            className="w-full bg-white border border-neutral-100 rounded-xl px-4 py-2.5 font-bold text-sm focus:ring-2 focus:ring-indigo-100 transition-all text-center"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 block mb-1.5">Unit Price ({imageInvoiceCurrency})</label>
                          <input
                            type="number" min="0"
                            value={item.priceKES}
                            onChange={e => { const n=[...imageInvoiceItems]; n[idx].priceKES=parseFloat(e.target.value)||0; setImageInvoiceItems(n); }}
                            className="w-full bg-white border border-neutral-100 rounded-xl px-4 py-2.5 font-bold text-sm focus:ring-2 focus:ring-indigo-100 transition-all"
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-black uppercase tracking-widest text-indigo-400 block mb-1.5">Line Total</label>
                          <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-2.5 font-black text-sm text-indigo-700">
                            {imageInvoiceCurrency} {(item.quantity * item.priceKES).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Auto Total */}
                <div className="mt-4 bg-indigo-600 rounded-2xl px-6 py-4 flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase tracking-widest text-indigo-200">Grand Total (Auto)</span>
                  <span className="text-xl font-black text-white">
                    {imageInvoiceCurrency} {imageInvoiceItems.reduce((sum, it) => sum + it.quantity * it.priceKES, 0).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Generate Button */}
              <button
                type="button"
                onClick={() => {
                  if (!imageInvoiceClient.name.trim()) { alert('Please enter a client name.'); return; }
                  const grandTotal = imageInvoiceItems.reduce((s, it) => s + it.quantity * it.priceKES, 0);
                  const logoUrl = 'https://res.cloudinary.com/dsthpp4oj/image/upload/v1766830586/legitGrinder_PNG_3x-100_oikrja.jpg';
                  const printWin = window.open('', '', 'width=900,height=1100');
                  if (!printWin) return;
                  const rowsHtml = imageInvoiceItems.map(it => `
                    <tr>
                      <td style="padding:16px 12px; border-bottom:1px solid #f0f0f0; vertical-align:top;">
                        ${it.imageUrl ? `<img src="${it.imageUrl}" style="width:60px;height:60px;object-fit:cover;border-radius:10px;display:block;border:1px solid #eee;" />` : ''}
                      </td>
                      <td style="padding:16px 12px; border-bottom:1px solid #f0f0f0; vertical-align:top;">
                        <strong style="font-size:15px;display:block;margin-bottom:4px;">${it.name}</strong>
                        <span style="font-size:12px;color:#666;line-height:1.5;white-space:pre-wrap;">${it.specs}</span>
                      </td>
                      <td style="padding:16px 12px; border-bottom:1px solid #f0f0f0; text-align:center; font-weight:700;">${it.quantity}</td>
                      <td style="padding:16px 12px; border-bottom:1px solid #f0f0f0; text-align:right; font-weight:700;">${imageInvoiceCurrency} ${it.priceKES.toLocaleString()}</td>
                      <td style="padding:16px 12px; border-bottom:1px solid #f0f0f0; text-align:right; font-weight:900; color:#4f46e5;">${imageInvoiceCurrency} ${(it.quantity*it.priceKES).toLocaleString()}</td>
                    </tr>
                  `).join('');
                  printWin.document.write(`
                    <html><head><title>Image Invoice – ${imageInvoiceClient.name}</title>
                    <style>
                      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;900&display=swap');
                      * { box-sizing: border-box; }
                      body { font-family: 'Inter', sans-serif; padding: 60px; color: #1a1a1a; }
                      .watermark { position: fixed; top:50%; left:50%; transform:translate(-50%,-50%) rotate(-45deg); opacity:0.03; width:80%; z-index:-1; }
                      .header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:50px; border-bottom:3px solid #4f46e5; padding-bottom:30px; }
                      .brand h1 { margin:0; font-size:28px; font-weight:900; color:#4f46e5; }
                      .brand p { margin:4px 0 0; font-size:13px; color:#888; }
                      .logo { width:100px; border-radius:8px; }
                      .meta { text-align:right; }
                      .meta p { margin:4px 0; font-size:13px; font-weight:600; }
                      .meta span { font-weight:400; color:#999; margin-right:8px; }
                      .title { font-size:22px; font-weight:900; letter-spacing:1px; margin:30px 0; }
                      table { width:100%; border-collapse:collapse; margin-bottom:30px; }
                      th { background:#4f46e5; color:white; padding:14px 12px; text-align:left; font-size:11px; font-weight:900; text-transform:uppercase; letter-spacing:1px; }
                      th:last-child, th:nth-last-child(2) { text-align:right; }
                      th:nth-child(3) { text-align:center; }
                      .total-band { background:#4f46e5; color:white; font-size:18px; font-weight:900; }
                      .total-band td { padding:18px 12px; border:none; text-align:right; }
                      .total-band td:first-child { text-align:left; }
                      .terms { margin-top:50px; border-top:2px solid #eee; padding-top:20px; }
                      .terms h2 { font-size:13px; font-weight:900; text-transform:uppercase; margin-bottom:10px; }
                      .terms p { font-size:12px; color:#555; margin:6px 0; line-height:1.6; }
                      .footer { margin-top:60px; text-align:center; font-size:11px; color:#bbb; }
                    </style></head><body>
                    <img src="${logoUrl}" class="watermark" />
                    <div class="header">
                      <div class="brand">
                        <h1>LegitGrinder</h1>
                        <p>+254 791 873 538 &nbsp;|&nbsp; www.legitgrinder.com</p>
                      </div>
                      <div class="meta">
                        <p><span>Date:</span>${new Date().toLocaleDateString('en-GB')}</p>
                        <p><span>Client:</span>${imageInvoiceClient.name}</p>
                        ${imageInvoiceClient.whatsapp ? `<p><span>WhatsApp:</span>${imageInvoiceClient.whatsapp}</p>` : ''}
                      </div>
                      <img src="${logoUrl}" class="logo" />
                    </div>
                    <div class="title">Product Invoice</div>
                    <table>
                      <thead><tr>
                        <th style="width:80px">Image</th>
                        <th>Product &amp; Specs</th>
                        <th style="width:60px;text-align:center">Qty</th>
                        <th style="width:130px;text-align:right">Unit Price</th>
                        <th style="width:130px;text-align:right">Total</th>
                      </tr></thead>
                      <tbody>${rowsHtml}</tbody>
                      <tfoot><tr class="total-band">
                        <td colspan="4">Grand Total</td>
                        <td style="font-weight:900;">${imageInvoiceCurrency} ${grandTotal.toLocaleString()}</td>
                      </tr></tfoot>
                    </table>
                    <div class="terms">
                      <h2>Terms &amp; Conditions</h2>
                      <p>The total fee is all inclusive to Nairobi. Client caters for delivery to their home/work location.</p>
                      <p>Payment via mobile money/cash. Shipping: Air (2 weeks) | Sea (30–45 days).</p>
                    </div>
                    <div class="footer">LegitGrinder KE – Deals in Imports | Integrity First</div>
                    </body></html>
                  `);
                  printWin.document.close();
                  printWin.print();
                }}
                className="w-full py-6 bg-indigo-600 text-white rounded-3xl font-black uppercase tracking-widest text-[11px] hover:bg-black transition-all shadow-xl shadow-indigo-200 flex items-center justify-center gap-3"
              >
                <Printer className="w-5 h-5" /> Generate &amp; Print Image Invoice
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REFUND INVOICE MODAL */}
      {isCreatingRefund && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white rounded-[4rem] p-12 w-full max-w-xl shadow-[0_0_100px_rgba(225,29,72,0.4)] animate-in zoom-in-95 duration-300 relative border border-white/20 max-h-[95vh] overflow-y-auto">
            <button
              onClick={() => setIsCreatingRefund(false)}
              className="absolute top-10 right-10 p-4 bg-neutral-100 rounded-2xl hover:bg-neutral-200 transition-all shadow-sm"
            >
              <X className="w-6 h-6 text-gray-400" />
            </button>

            <div className="mb-12">
              <h3 className="text-4xl font-black text-gray-900 tracking-tight leading-none mb-4 uppercase">Refund <span className="text-rose-600">Protocol</span></h3>
              <p className="text-[10px] font-black text-rose-500 uppercase tracking-[0.3em]">Generate Refund & Credit Note</p>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              const printWin = window.open('', '', 'width=900,height=1000');
              if (!printWin) return;
              const logoUrl = "https://res.cloudinary.com/dsthpp4oj/image/upload/v1766830586/legitGrinder_PNG_3x-100_oikrja.jpg";
              const d = new Date();
              const refundNum = `RF-${d.getFullYear()}${d.getMonth() + 1}${d.getDate()}-${Math.floor(Math.random() * 1000)}`;

              printWin.document.write(`
                <html>
                  <head>
                    <title>Refund Note ${refundNum}</title>
                    <style>
                      body { font-family: 'Inter', sans-serif; padding: 60px; color: #1a1a1a; position: relative; }
                      .watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); opacity: 0.03; width: 80%; z-index: -1; }
                      .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 60px; }
                      .brand h1 { margin: 0; font-size: 32px; font-weight: 900; }
                      .brand p { margin: 5px 0 0; font-size: 14px; font-weight: 500; color: #666; }
                      .logo { width: 120px; }
                      .meta { text-align: right; margin-top: 20px; }
                      .meta p { margin: 5px 0; font-size: 14px; font-weight: 700; }
                      .meta span { font-weight: 400; color: #666; margin-right: 10px; }
                      .title { text-align: center; font-size: 24px; font-weight: 900; margin: 40px 0; letter-spacing: 2px; color: #e11d48; text-transform: uppercase; }
                      table { width: 100%; border-collapse: collapse; margin-bottom: 40px; }
                      th { background: #e11d48; color: white; padding: 15px; text-align: left; text-transform: uppercase; font-size: 12px; font-weight: 900; letter-spacing: 1px; }
                      td { padding: 20px 15px; border-bottom: 1px solid #eee; font-size: 14px; }
                      .total-row td { border: none; padding-top: 30px; font-size: 18px; font-weight: 900; text-align: right; color: #e11d48; }
                      .terms { margin-top: 60px; border-top: 2px solid #000; padding-top: 20px; }
                      .terms h2 { font-size: 14px; font-weight: 900; text-transform: uppercase; margin-bottom: 15px; }
                      .terms p { font-size: 13px; color: #444; margin: 8px 0; line-height: 1.6; }
                      .footer { margin-top: 100px; text-align: center; font-size: 12px; font-weight: 500; color: #999; }
                    </style>
                  </head>
                  <body>
                    <img src="${logoUrl}" class="watermark" />
                    <div class="header">
                      <div class="brand">
                        <h1>LegitGrinder</h1>
                        <p>+254791873538</p>
                      </div>
                      <img src="${logoUrl}" class="logo" />
                    </div>
                    <div class="meta">
                      <p><span>Date:</span> ${d.toLocaleDateString('en-GB')}</p>
                      <p><span>Client Details:</span> ${refundData.clientName} (${refundData.clientWhatsapp})</p>
                      <p><span>Credit Note No:</span> ${refundNum}</p>
                      ${refundData.originalInvoiceRef ? `<p><span>Original Invoice Ref:</span> ${refundData.originalInvoiceRef}</p>` : ''}
                      ${refundData.transactionCode ? `<p><span>Transaction Code:</span> ${refundData.transactionCode}</p>` : ''}
                    </div>
                    <div class="title">OFFICIAL REFUND DRAFT</div>
                    <table>
                      <thead>
                        <tr>
                          <th style="width: 70%">Explanation / Description</th>
                          <th style="width: 30%">Amount Refunded</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>
                            ${refundData.refundItem ? `<strong style="font-size: 11px; text-transform: uppercase; color: #999; display: block; margin-bottom: 4px;">Item: ${refundData.refundItem}</strong>` : ''}
                            ${refundData.reason || 'Client Cancellation / Policy Refund'}
                          </td>
                          <td>KES ${Number(refundData.amountKES).toLocaleString()}</td>
                        </tr>
                        <tr class="total-row">
                          <td>Total Refunded</td>
                          <td style="border-bottom: 3px double #e11d48; padding-bottom: 5px;">- KES ${Number(refundData.amountKES).toLocaleString()}</td>
                        </tr>
                      </tbody>
                    </table>
                    <div class="terms">
                      <h2>Refund Protocol</h2>
                      <p>This document serves as proof of refund request acknowledgement or completion depending on payment provider processing times.</p>
                      <p>Bank/Mobile money transfers can take up to 24-48 business hours to reflect in the destination account.</p>
                    </div>
                    <div class="footer">LegitGrinder KE Deals in Imports. Integrity First.</div>
                  </body>
                </html>
              `);
              printWin.document.close();
              printWin.print();
              setIsCreatingRefund(false);
            }} className="space-y-8">
              <div className="grid grid-cols-2 gap-6">
                <div className="col-span-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-3 ml-2">Client Full Name</label>
                  <input required value={refundData.clientName} onChange={e => setRefundData({ ...refundData, clientName: e.target.value })} className="w-full bg-neutral-50 border-none rounded-2xl px-8 py-5 font-bold text-lg focus:ring-4 focus:ring-rose-100 transition-all placeholder:text-neutral-200" placeholder="e.g. Dennis Munga" />
                </div>
                <div className="col-span-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-3 ml-2">Client WhatsApp Number</label>
                  <input value={refundData.clientWhatsapp} onChange={e => setRefundData({ ...refundData, clientWhatsapp: e.target.value })} className="w-full bg-neutral-50 border-none rounded-2xl px-8 py-5 font-bold text-lg focus:ring-4 focus:ring-rose-100 transition-all placeholder:text-neutral-200" placeholder="e.g. 254791873538" />
                </div>
                <div className="col-span-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-3 ml-2">Original Invoice Ref (Optional)</label>
                  <input value={refundData.originalInvoiceRef} onChange={e => setRefundData({ ...refundData, originalInvoiceRef: e.target.value })} className="w-full bg-neutral-50 border-none rounded-2xl px-8 py-5 font-bold text-lg focus:ring-4 focus:ring-rose-100 transition-all placeholder:text-neutral-200" placeholder="e.g. LG100001 or QWX982M21" />
                </div>
                <div className="col-span-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-3 ml-2">Refunded Item (Optional)</label>
                  <input value={refundData.refundItem} onChange={e => setRefundData({ ...refundData, refundItem: e.target.value })} className="w-full bg-neutral-50 border-none rounded-2xl px-8 py-5 font-bold text-lg focus:ring-4 focus:ring-rose-100 transition-all placeholder:text-neutral-200" placeholder="e.g. M3 Pro MacBook" />
                </div>
                <div className="col-span-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-3 ml-2">Transaction Code (Optional)</label>
                  <input value={refundData.transactionCode} onChange={e => setRefundData({ ...refundData, transactionCode: e.target.value })} className="w-full bg-neutral-50 border-none rounded-2xl px-8 py-5 font-bold text-lg focus:ring-4 focus:ring-rose-100 transition-all placeholder:text-neutral-200" placeholder="e.g. QWX982M21" />
                </div>
                <div className="col-span-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-3 ml-2">Reason for Refund</label>
                  <input required value={refundData.reason} onChange={e => setRefundData({ ...refundData, reason: e.target.value })} className="w-full bg-neutral-50 border-none rounded-2xl px-8 py-5 font-bold text-lg focus:ring-4 focus:ring-rose-100 transition-all placeholder:text-neutral-200" placeholder="e.g. Out of Stock, Client Cancelled" />
                </div>
                <div className="col-span-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-3 ml-2">Refund Amount (KES)</label>
                  <input required type="number" min="1" value={refundData.amountKES || ''} onChange={e => setRefundData({ ...refundData, amountKES: parseInt(e.target.value) || 0 })} className="w-full bg-neutral-50 border-none rounded-2xl px-8 py-5 font-bold text-lg focus:ring-4 focus:ring-rose-100 transition-all placeholder:text-neutral-300" placeholder="e.g. 150000" />
                </div>
              </div>

              <div className="flex gap-4 pt-6">
                <button
                  type="button"
                  onClick={() => setIsCreatingRefund(false)}
                  className="flex-1 py-6 bg-neutral-100 text-gray-400 rounded-3xl font-black uppercase tracking-widest text-[10px] hover:bg-neutral-200 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-[2] py-6 bg-rose-600 text-white rounded-3xl font-black uppercase tracking-widest text-[10px] hover:bg-black transition-all shadow-[0_20px_40px_rgba(225,29,72,0.3)] shadow-rose-100"
                >
                  Generate Refund Document
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RECEIPT DATA CAPTURE MODAL */}
      {printingReceiptInvoice && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white rounded-[4rem] p-10 w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-300 relative border border-white/20">
            <button
              onClick={() => setPrintingReceiptInvoice(null)}
              className="absolute top-8 right-8 p-3 bg-neutral-100 rounded-2xl hover:bg-neutral-200 transition-all shadow-sm"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>

            <div className="mb-8">
              <h3 className="text-2xl font-black text-gray-900 tracking-tight uppercase leading-none">
                Elite <span className="text-rose-500">{receiptDocKind === 'statement' ? 'Statement' : 'Receipting'}</span>
              </h3>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-2">Order Ref: {printingReceiptInvoice.invoiceNumber}</p>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const sumInWords = formData.get('sumInWords') as string;
              const amountReceived = formData.get('amountReceived') as string;
              const balance = formData.get('balance') as string;
              const transactionRef = formData.get('transactionRef') as string;

              const inv = printingReceiptInvoice;
              const curr = inv?.currency || 'KES';
              const isStatement = receiptDocKind === 'statement';
              const fmt = (raw: string) => raw.trim().toUpperCase() === 'TBD'
                ? 'TBD'
                : `${curr} ${(parseFloat(raw || '0') || 0).toLocaleString()}`;

              const amtStr = fmt(amountReceived);
              const balStr = fmt(balance);
              // A receipt totals the transaction in front of you (received +
              // still owed). A statement totals the ORDER, which is a figure of
              // its own and must never be inferred from the two above.
              const isTotalTBD = amountReceived.trim().toUpperCase() === 'TBD' || balance.trim().toUpperCase() === 'TBD';
              const totStr = isStatement
                ? fmt(formData.get('orderTotal') as string || '0')
                : (isTotalTBD ? 'TBD' : `${curr} ${(parseFloat(amountReceived || '0') + parseFloat(balance || '0')).toLocaleString()}`);

              const docLabel = isStatement ? 'Statement' : 'Receipt';
              const payUrl = `${window.location.origin}/pay/${inv.invoiceNumber}`;


              const printWin = window.open('', '', 'width=900,height=800');
              if (!printWin) return;
              const logoUrl = "https://res.cloudinary.com/dsthpp4oj/image/upload/v1766830586/legitGrinder_PNG_3x-100_oikrja.jpg";

              printWin.document.write(`
                <html>
                  <head>
                    <title>${docLabel} ${inv.invoiceNumber}</title>
                    <style>
                      @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
                      @page { size: A4; margin: 10mm; }
                      * { box-sizing: border-box; }
                      body { font-family: 'Plus Jakarta Sans', sans-serif; padding: 24px; color: #1a2223; background: #f4f5f4; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                      .container { max-width: 720px; margin: auto; background: #fff; border-radius: 20px; overflow: hidden; position: relative; box-shadow: 0 20px 50px rgba(15,26,28,0.08); }
                      .accent { height: 8px; background: linear-gradient(90deg, #3D8593, #FF9900); }
                      .inner { padding: 28px 40px; position: relative; }
                      .watermark { position: absolute; top: 52%; left: 50%; transform: translate(-50%, -50%) rotate(-18deg); opacity: 0.04; width: 66%; z-index: 0; }
                      .inner > * { position: relative; z-index: 1; }
                      .header-logo { display: flex; align-items: center; gap: 14px; margin-bottom: 12px; }
                      .header-logo img { width: 48px; height: 48px; border-radius: 12px; object-fit: cover; }
                      .brand-name { font-size: 20px; font-weight: 800; letter-spacing: -0.5px; }
                      .brand-tag { font-size: 9px; font-weight: 800; letter-spacing: 3px; text-transform: uppercase; color: #3D8593; margin-top: 2px; }
                      .contact-bar { display: flex; flex-wrap: wrap; gap: 4px 24px; border-top: 1px solid #eef0ef; border-bottom: 1px solid #eef0ef; padding: 9px 0; font-size: 10.5px; margin-bottom: 18px; font-weight: 600; color: #6b7677; }
                      .receipt-head { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 22px; }
                      .receipt-label { background: #0f1a1c; color: #fff; display: inline-block; padding: 8px 22px; border-radius: 999px; font-size: 12px; font-weight: 800; letter-spacing: 3px; text-transform: uppercase; }
                      .meta-right { text-align: right; font-size: 12px; }
                      .meta-right .k { color: #9aa4a4; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; font-size: 9px; }
                      .meta-right .v { font-weight: 800; font-size: 14px; margin-bottom: 6px; }
                      .field { margin-bottom: 12px; display: flex; align-items: baseline; font-size: 14px; }
                      .field label { font-weight: 600; min-width: 150px; color: #6b7677; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
                      .field .fv { border-bottom: 1px dashed #cfd6d6; flex: 1; margin-left: 8px; padding: 2px 8px; font-weight: 700; font-size: 15px; color: #1a2223; }
                      .financial-summary { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 26px; gap: 24px; }
                      .summary-table { border-collapse: separate; border-spacing: 0; width: 280px; border-radius: 12px; overflow: hidden; border: 1px solid #eef0ef; }
                      .summary-table td { padding: 9px 14px; font-size: 13px; font-weight: 600; color: #4a5556; border-bottom: 1px solid #eef0ef; }
                      .summary-table tr:last-child td { border-bottom: none; }
                      .summary-table .val { text-align: right; font-weight: 800; color: #0f1a1c; }
                      .summary-table .total-row td { background: #3D8593; color: #fff; font-weight: 800; }
                      .signature { border-top: 2px solid #0f1a1c; width: 220px; text-align: center; padding-top: 8px; font-size: 12px; font-weight: 700; }
                      .signature .role { color: #9aa4a4; font-weight: 600; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px; }
                      .thanks { text-align: center; margin-top: 22px; padding-top: 12px; border-top: 1px solid #eef0ef; font-size: 11px; color: #9aa4a4; font-weight: 600; letter-spacing: 0.5px; }
                      .thanks strong { color: #3D8593; }
                      @media print { body { background: #fff; padding: 0; } .container { box-shadow: none; border-radius: 0; max-width: none; } }
                    </style>
                  </head>
                  <body>
                    <div class="container">
                      <div class="accent"></div>
                      <div class="inner">
                        <img src="${logoUrl}" class="watermark" />
                        <div class="header-logo">
                          <img src="${logoUrl}" />
                          <div>
                            <div class="brand-name">LegitGrinder</div>
                            <div class="brand-tag">Global Logistics</div>
                          </div>
                        </div>
                        <div class="contact-bar">
                          <div>Mungaimports@gmail.com</div>
                          <div>@Legitgrinderimports</div>
                          <div>+254 791 873 538</div>
                          <div>www.legitgrinder.com</div>
                        </div>

                        <div class="receipt-head">
                          <div class="receipt-label">${docLabel}</div>
                          <div class="meta-right">
                            <div class="k">Date</div>
                            <div class="v">${new Date().toLocaleDateString('en-GB')}</div>
                            <div class="k">${docLabel} No</div>
                            <div class="v">${inv.invoiceNumber}</div>
                          </div>
                        </div>

                        ${isStatement ? `
                        <div class="field"><label>Issued To</label> <div class="fv">${inv.clientName}</div></div>
                        <div class="field"><label>Balance In Words</label> <div class="fv">${sumInWords}</div></div>
                        <div class="field"><label>For</label> <div class="fv">${inv.productName}</div></div>
                        ${transactionRef || inv.paystackReference ? `<div class="field"><label>Reference</label> <div class="fv">${transactionRef || inv.paystackReference}</div></div>` : ''}
                        ` : `
                        <div class="field"><label>Received From</label> <div class="fv">${inv.clientName}</div></div>
                        <div class="field"><label>The Sum Of</label> <div class="fv">${sumInWords}</div></div>
                        <div class="field"><label>Reference</label> <div class="fv">${transactionRef || inv.paystackReference || 'MANUAL-ENTRY'}</div></div>
                        <div class="field"><label>Being Payment Of</label> <div class="fv">${inv.productName}</div></div>
                        `}

                        <div class="financial-summary">
                          <table class="summary-table">
                            ${isStatement ? `
                            <tr><td>Order Total</td> <td class="val">${totStr}</td></tr>
                            <tr><td>Paid To Date</td> <td class="val" style="color:#16a34a;">${amtStr}</td></tr>
                            <tr class="total-row"><td>Balance Due</td> <td class="val" style="color:#fff;">${balStr}</td></tr>
                            ` : `
                            <tr><td>Amount Received</td> <td class="val">${amtStr}</td></tr>
                            <tr><td>Balance Due</td> <td class="val" style="color:#ef4444;">${balStr}</td></tr>
                            <tr class="total-row"><td>Total</td> <td class="val" style="color:#fff;">${totStr}</td></tr>
                            `}
                          </table>

                          <div class="signature">
                            <div class="role">${isStatement ? 'Issued By' : 'Received / Approved By'}</div>
                            Dennis Munga
                          </div>
                        </div>

                        ${isStatement ? `
                        <div style="margin-top:20px;background:#f8fafa;border:1px solid #eef0ef;border-radius:10px;padding:14px 18px;">
                          <div style="font-size:11px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;color:#9aa4a4;margin-bottom:5px;">How to pay</div>
                          <div style="font-size:12.5px;color:#3f4a4b;line-height:1.6;">
                            M-Pesa, card or bank transfer: <strong style="color:#0f1a1c;">${payUrl}</strong><br/>
                            Or reply on WhatsApp and we will send the link. Please quote <strong>${inv.invoiceNumber}</strong>.
                          </div>
                        </div>
                        <div class="thanks">This is a statement of account, not a receipt — <strong>${balStr}</strong> remains payable on ${inv.invoiceNumber}.</div>
                        ` : `
                        <div class="thanks">Thank you for choosing <strong>LegitGrinder</strong> — Authenticity Guaranteed · Invoice ${inv.invoiceNumber}</div>
                        `}
                      </div>
                    </div>
                  </body>
                </html>
              `);
              printWin.document.close();
              setTimeout(() => {
                printWin.print();
                setPrintingReceiptInvoice(null);
              }, 500);
            }} className="space-y-6">
              {/* Which document are we producing? Getting this wrong tells a
                  client they've paid when they haven't, so it leads the form. */}
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-2 ml-2">This document</span>
                <div className="grid grid-cols-2 gap-2.5">
                  {([
                    { id: 'statement', title: 'Statement', sub: 'What they still owe' },
                    { id: 'receipt', title: 'Receipt', sub: 'What they have paid' },
                  ] as const).map(o => {
                    const on = receiptDocKind === o.id;
                    return (
                      <button
                        key={o.id}
                        type="button"
                        onClick={() => seedReceiptForm(printingReceiptInvoice, o.id)}
                        aria-pressed={on}
                        className={`rounded-2xl border px-4 py-3 text-left transition-all ${on ? 'border-rose-400 bg-rose-50' : 'border-neutral-200 bg-neutral-50 hover:border-rose-200'}`}
                      >
                        <span className={`block text-[11px] font-black uppercase tracking-widest ${on ? 'text-rose-600' : 'text-gray-500'}`}>{o.title}</span>
                        <span className="block text-[10px] font-bold text-gray-400 mt-0.5">{o.sub}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* What the record says — for reference only. The document itself
                  is whatever you type; prices move between deposit and arrival. */}
              {(() => {
                const m = moneyOf(printingReceiptInvoice);
                const cur = printingReceiptInvoice.currency || 'KES';
                const fig = (n: number) => `${cur} ${n.toLocaleString()}`;
                if (m.total <= 0) return null;
                return (
                  <div className="rounded-2xl bg-neutral-50 border border-neutral-100 px-5 py-4">
                    <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-2">On record for this order</p>
                    <div className="flex flex-wrap gap-x-6 gap-y-1 text-[11px] font-bold text-gray-600">
                      <span>Total <span className="text-gray-900">{fig(m.total)}</span></span>
                      <span>Paid <span className="text-emerald-600">{m.unrecorded ? 'not recorded' : fig(m.paid)}</span></span>
                      <span>Outstanding <span className="text-amber-600">{m.unrecorded ? 'unknown' : fig(m.balance)}</span></span>
                    </div>
                    <p className="text-[10px] text-gray-400 font-medium mt-2 leading-snug">
                      A starting point only — type whatever was actually received.
                    </p>
                  </div>
                );
              })()}

              <div>
                <div className="flex items-baseline justify-between mb-2 ml-2 mr-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                    {receiptWordsLabel}
                  </label>
                  {receiptWordsEdited && (
                    <button
                      type="button"
                      onClick={() => {
                        setReceiptWordsEdited(false);
                        setReceiptWords(amountFieldInWords(
                          receiptDocKind === 'statement' && !statementWordsUsePaid ? receiptBalance : receiptAmount,
                          printingReceiptInvoice.currency));
                      }}
                      className="text-[9px] font-black uppercase tracking-widest text-rose-400 hover:text-rose-600 transition-colors"
                    >
                      Rewrite from amount
                    </button>
                  )}
                </div>
                <input
                  required
                  name="sumInWords"
                  value={receiptWords}
                  onChange={(e) => { setReceiptWords(e.target.value); setReceiptWordsEdited(true); }}
                  placeholder={receiptDocKind === 'statement' ? 'Fills itself from the balance below' : 'Fills itself from the amount below'}
                  className="w-full bg-neutral-50 border-none rounded-2xl px-6 py-4 font-bold focus:ring-4 focus:ring-rose-100 transition-all placeholder:text-neutral-200"
                />
              </div>

              {/* The order's own value — a statement states it rather than
                  inferring it from the two figures beneath. */}
              {receiptDocKind === 'statement' && (
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-2 ml-2">Order Total</label>
                  <input
                    required
                    name="orderTotal"
                    type="text"
                    value={receiptTotal}
                    onChange={(e) => setReceiptTotal(e.target.value)}
                    className="w-full bg-neutral-50 border-none rounded-2xl px-6 py-4 font-bold focus:ring-4 focus:ring-rose-100 transition-all"
                  />
                </div>
              )}
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-2 ml-2">Transaction Reference (e.g. M-Pesa Code)</label>
                <input name="transactionRef" defaultValue={printingReceiptInvoice.paystackReference || ''} placeholder="Paste transaction code here..." className="w-full bg-neutral-50 border-none rounded-2xl px-6 py-4 font-bold focus:ring-4 focus:ring-rose-100 transition-all placeholder:text-neutral-200" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-2 ml-2">
                    {receiptDocKind === 'statement' ? 'Paid To Date' : 'Total Received'}
                    {receiptDocKind === 'receipt' && (
                      <span className="text-neutral-300 normal-case font-medium"> — on this order, all payments</span>
                    )}
                  </label>
                  <input
                    required
                    name="amountReceived"
                    type="text"
                    value={receiptAmount}
                    placeholder={receiptDocKind === 'receipt' ? 'Everything paid so far' : '0'}
                    onChange={(e) => {
                      const next = e.target.value;
                      setReceiptAmount(next);
                      if (receiptDocKind === 'statement') {
                        // Paid to date drives the words on a statement too —
                        // the sum that changed hands is what gets certified.
                        if (!receiptWordsEdited) {
                          const paidNow = parseFloat(next.replace(/,/g, '')) || 0;
                          setReceiptWords(amountFieldInWords(
                            paidNow > 0 ? next : receiptBalance, printingReceiptInvoice.currency));
                        }
                        return;
                      }
                      // On a receipt the words follow the sum received; on a
                      // statement they follow the balance, not this field.
                      if (!receiptWordsEdited) {
                        setReceiptWords(amountFieldInWords(next, printingReceiptInvoice.currency));
                      }
                      // The printed table reads Received + Balance = Total, so
                      // this figure is everything paid on the order, and what
                      // remains is the ORDER total minus it.
                      if (!receiptBalanceEdited) {
                        const orderTotal = moneyOf(printingReceiptInvoice).total;
                        const received = parseFloat(next.replace(/,/g, ''));
                        setReceiptBalance(Number.isFinite(received)
                          ? String(Math.max(orderTotal - received, 0))
                          : String(orderTotal));
                      }
                    }}
                    className="w-full bg-neutral-50 border-none rounded-2xl px-6 py-4 font-bold focus:ring-4 focus:ring-rose-100 transition-all placeholder:text-neutral-200 placeholder:font-medium"
                  />
                  {/* One-tap fill for the common case, and a warning ONLY for a
                      figure that cannot be right — paying part of an order or
                      settling it in full are both normal and get no comment. */}
                  {receiptDocKind === 'receipt' && (() => {
                    const m = moneyOf(printingReceiptInvoice);
                    if (m.total <= 0) return null;
                    const cur = printingReceiptInvoice.currency || 'KES';
                    const typed = parseFloat((receiptAmount || '').replace(/,/g, ''));

                    if (Number.isFinite(typed) && typed > m.total) return (
                      <p className="text-[10px] font-bold text-amber-600 mt-2 ml-2 leading-snug">
                        More than the {cur} {m.total.toLocaleString()} this order is for. Fine to print — if the
                        price went up, amend the invoice too so your books match.
                      </p>
                    );

                    if (Number.isFinite(typed) && Math.abs(typed - m.total) < 1) return (
                      <p className="text-[10px] font-bold text-emerald-600 mt-2 ml-2 leading-snug">
                        Settles the order in full.
                      </p>
                    );

                    return (
                      <button
                        type="button"
                        onClick={() => {
                          const full = String(m.total);
                          setReceiptAmount(full);
                          if (!receiptWordsEdited) setReceiptWords(amountFieldInWords(full, printingReceiptInvoice.currency));
                          if (!receiptBalanceEdited) setReceiptBalance('0');
                        }}
                        className="text-[10px] font-black uppercase tracking-widest text-[#3D8593] hover:text-[#0f1a1c] transition-colors mt-2 ml-2"
                      >
                        Paid in full · {cur} {m.total.toLocaleString()}
                      </button>
                    );
                  })()}
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-2 ml-2">
                    {receiptDocKind === 'statement' ? 'Balance Due' : 'Balance Still Owing'}
                  </label>
                  <input
                    required
                    name="balance"
                    type="text"
                    value={receiptBalance}
                    onChange={(e) => {
                      const next = e.target.value;
                      setReceiptBalance(next);
                      setReceiptBalanceEdited(true);
                      // Only when nothing has been paid does the balance take
                      // over the words line — there is no payment to certify.
                      if (!receiptWordsEdited && receiptDocKind === 'statement' && !statementWordsUsePaid) {
                        setReceiptWords(amountFieldInWords(next, printingReceiptInvoice.currency));
                      }
                    }}
                    className="w-full bg-neutral-50 border-none rounded-2xl px-6 py-4 font-bold focus:ring-4 focus:ring-rose-100 transition-all"
                  />
                </div>
              </div>

              <p className="text-[11px] font-medium text-gray-400 leading-relaxed text-center px-2">
                {receiptDocKind === 'statement'
                  ? 'A statement asks for money. It carries your pay link and says plainly that it is not a receipt.'
                  : 'A receipt confirms money already in hand. Only print it once the payment has actually arrived.'}
              </p>

              <button
                type="submit"
                className="w-full py-5 bg-rose-500 text-white rounded-3xl font-black uppercase tracking-widest text-xs hover:bg-black transition-all shadow-xl shadow-rose-100"
              >
                Generate {receiptDocKind === 'statement' ? 'Statement' : 'Receipt'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Ad Banner Editor Modal */}
      {editingAdBanner && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-md bg-[#0f1a1c]/60 animate-in fade-in duration-300">
          <div className="bg-white rounded-[3rem] w-full max-w-3xl max-h-[90vh] flex flex-col shadow-[0_50px_100px_-20px_rgba(0,0,0,0.2)] relative overflow-hidden animate-in slide-in-from-bottom-10 duration-500">
            <div className="h-2 bg-gradient-to-r from-[#3D8593] to-teal-200 shrink-0" />
            
            <header className="px-6 md:px-10 py-8 bg-neutral-50/50 border-b border-neutral-100 flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-2xl md:text-3xl font-black tracking-tight text-gray-900">
                  {editingAdBanner === 'new' ? 'New Campaign Asset' : 'Refine Campaign Asset'}
                </h3>
                <p className="text-[9px] md:text-[10px] font-black uppercase text-[#3D8593] tracking-[0.3em] mt-1">Growth & Marketing Suite</p>
              </div>
              <button onClick={() => setEditingAdBanner(null)} className="p-3 bg-white hover:bg-rose-50 hover:text-rose-500 rounded-2xl shadow-sm transition-all">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </header>

            <form onSubmit={handleSaveAdBanner} className="p-6 md:p-10 overflow-y-auto flex-1 space-y-8 no-scrollbar">
              <div className="grid md:grid-cols-2 gap-6 md:gap-8">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-3 ml-2 flex items-center gap-2">
                    <AlignLeft className="w-3.5 h-3.5" /> Primary Headline
                  </label>
                  <input required name="title1" defaultValue={editingAdBanner !== 'new' ? editingAdBanner.title1 : ''} placeholder="e.g. Your kid will drop it." className="w-full bg-neutral-50 border-none rounded-2xl md:rounded-3xl px-6 py-4 md:py-5 font-bold focus:ring-4 focus:ring-teal-100 transition-all text-sm md:text-base placeholder:text-neutral-300" />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-3 ml-2 flex items-center gap-2">
                    <AlignLeft className="w-3.5 h-3.5" /> Secondary Headline <span className="text-teal-400">(Italic)</span>
                  </label>
                  <input required name="title2" defaultValue={editingAdBanner !== 'new' ? editingAdBanner.title2 : ''} placeholder="e.g. Pay less." className="w-full bg-neutral-50 border-none rounded-2xl md:rounded-3xl px-6 py-4 md:py-5 font-bold focus:ring-4 focus:ring-teal-100 transition-all text-sm md:text-base placeholder:text-neutral-300 italic" />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-3 ml-2 flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5" /> Supporting Copy
                </label>
                <textarea required name="subtitle" defaultValue={editingAdBanner !== 'new' ? editingAdBanner.subtitle : ''} placeholder="Add context and details..." className="w-full bg-neutral-50 border-none rounded-2xl md:rounded-3xl px-6 py-5 font-bold min-h-[120px] resize-none focus:ring-4 focus:ring-teal-100 transition-all text-sm md:text-base placeholder:text-neutral-300 leading-relaxed"></textarea>
              </div>

              <div className="bg-neutral-50 p-6 md:p-8 rounded-[2.5rem] space-y-6 md:space-y-8">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-[#3D8593] block mb-3 ml-2 flex items-center gap-2">
                    <ImageIcon className="w-3.5 h-3.5" /> Transparent Asset URL (PNG Recommended)
                  </label>
                  <input required name="imageSrc" defaultValue={editingAdBanner !== 'new' ? editingAdBanner.imageSrc : ''} placeholder="https://res.cloudinary.com/..." className="w-full bg-white border-none rounded-2xl px-6 py-4 md:py-5 font-bold focus:ring-4 focus:ring-teal-100 transition-all text-sm placeholder:text-neutral-200 shadow-sm" />
                </div>
                
                <div className="grid grid-cols-2 gap-4 md:gap-8">
                  <div className="bg-white p-4 md:p-5 rounded-2xl shadow-sm">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-3 text-center">Backdrop Color</label>
                    <div className="relative overflow-hidden rounded-xl h-12 w-full">
                      <input type="color" name="backgroundColor" defaultValue={editingAdBanner !== 'new' ? editingAdBanner.backgroundColor : '#e2f07d'} className="absolute -top-4 -left-4 w-32 h-32 cursor-pointer" />
                    </div>
                  </div>
                  <div className="bg-white p-4 md:p-5 rounded-2xl shadow-sm">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-3 text-center">Typography Color</label>
                    <div className="relative overflow-hidden rounded-xl h-12 w-full">
                      <input type="color" name="textColor" defaultValue={editingAdBanner !== 'new' ? editingAdBanner.textColor : '#0f172a'} className="absolute -top-4 -left-4 w-32 h-32 cursor-pointer" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6 md:gap-8">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-3 ml-2 flex items-center gap-2">
                    <ChevronRight className="w-3.5 h-3.5" /> Call to Action Text
                  </label>
                  <input required name="buttonText" defaultValue={editingAdBanner !== 'new' ? editingAdBanner.buttonText : 'Save now'} className="w-full bg-neutral-50 border-none rounded-2xl md:rounded-3xl px-6 py-4 md:py-5 font-bold focus:ring-4 focus:ring-teal-100 transition-all text-sm md:text-base" />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-3 ml-2 flex items-center gap-2">
                    <ChevronRight className="w-3.5 h-3.5" /> Target Destination Path
                  </label>
                  <input required name="buttonLink" defaultValue={editingAdBanner !== 'new' ? editingAdBanner.buttonLink : '/shop'} className="w-full bg-neutral-50 border-none rounded-2xl md:rounded-3xl px-6 py-4 md:py-5 font-bold focus:ring-4 focus:ring-teal-100 transition-all text-sm md:text-base" />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6 md:gap-8 bg-neutral-50 p-6 rounded-[2rem] items-center">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-3 ml-2 flex items-center gap-2">
                    <List className="w-3.5 h-3.5" /> Display Priority (0 is first)
                  </label>
                  <input required type="number" name="sortOrder" defaultValue={editingAdBanner !== 'new' ? editingAdBanner.sortOrder : 0} className="w-full bg-white border-none rounded-2xl px-6 py-4 font-bold focus:ring-4 focus:ring-teal-100 transition-all shadow-sm" />
                </div>
                <div className="flex justify-center md:justify-end md:pt-6">
                  <label className="flex items-center gap-4 cursor-pointer bg-white px-6 py-4 rounded-2xl shadow-sm w-full md:w-auto">
                    <div className="relative flex items-center">
                      <input type="checkbox" name="isActive" value="true" defaultChecked={editingAdBanner !== 'new' ? editingAdBanner.isActive : true} className="w-6 h-6 rounded border-2 border-neutral-200 text-[#3D8593] focus:ring-[#3D8593] focus:ring-offset-2 transition-all" />
                    </div>
                    <div>
                      <span className="font-black text-sm text-gray-900 block">Campaign Active</span>
                      <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Visible on storefront</span>
                    </div>
                  </label>
                </div>
              </div>

              <div className="flex gap-4 pt-4 shrink-0 mt-8 mb-4">
                <button type="button" onClick={() => setEditingAdBanner(null)} className="hidden md:block px-10 py-5 bg-neutral-100 text-gray-400 rounded-3xl font-black uppercase tracking-widest text-[10px] hover:bg-neutral-200 transition-all">
                  Discard
                </button>
                <button type="submit" className="flex-1 py-5 md:py-6 bg-[#3D8593] text-white rounded-[2rem] font-black uppercase tracking-widest text-[11px] hover:bg-black transition-all shadow-xl shadow-teal-100 hover:shadow-2xl hover:-translate-y-1 transform flex items-center justify-center gap-3">
                  <Save className="w-4 h-4 md:w-5 md:h-5" /> {editingAdBanner === 'new' ? 'Deploy Campaign' : 'Sync Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* How much has actually been paid — asked whenever an order is marked
          part-paid, because the balance cannot be derived without it. */}
      {depositFor && (() => {
        const cur = depositFor.currency || 'KES';
        const total = depositFor.totalKES || 0;
        const entered = parseFloat(depositAmount.replace(/,/g, ''));
        // An order still priced TBD has no total to subtract from, so a balance
        // can't exist yet — the total has to be set first.
        const noTotal = total <= 0;
        const valid = !noTotal && Number.isFinite(entered) && entered > 0 && entered < total;
        const balance = valid ? total - entered : 0;

        return (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden">
              <div className="flex items-center justify-between px-6 py-5 border-b border-neutral-100">
                <div>
                  <h3 className="text-base font-black text-gray-900 tracking-tight leading-none">How much have they paid?</h3>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1.5">{depositFor.invoiceNumber} · {depositFor.clientName}</p>
                </div>
                <button onClick={() => setDepositFor(null)} className="p-2 rounded-lg hover:bg-neutral-100 transition-colors">
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              <div className="px-6 py-6 space-y-4">
                <div className="flex justify-between items-baseline text-sm">
                  <span className="text-gray-400 font-bold text-[10px] uppercase tracking-widest">Invoice total</span>
                  <span className="font-black text-gray-900">{noTotal ? 'TBD' : `${cur} ${total.toLocaleString()}`}</span>
                </div>

                {noTotal ? (
                  <div className="rounded-xl bg-rose-50 border border-rose-100 px-4 py-3">
                    <p className="text-[11px] font-bold text-rose-700 leading-relaxed">
                      This order has no total yet, so there's nothing to work a balance out from.
                      Amend the invoice and set its total first, then record the payment here.
                    </p>
                  </div>
                ) : (
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1.5">Amount received so far</label>
                    <input
                      autoFocus
                      type="number"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                      placeholder="e.g. 4100"
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 font-black text-lg text-gray-900 outline-none focus:border-[#3D8593] focus:bg-white transition-colors"
                    />
                  </div>
                )}

                {!noTotal && depositAmount && !valid && (
                  <p className="text-[11px] font-bold text-rose-500 leading-snug">
                    {entered >= total
                      ? `That clears the invoice — mark it Paid instead.`
                      : 'Enter an amount between zero and the invoice total.'}
                  </p>
                )}

                {valid && (
                  <div className="rounded-xl bg-amber-50 border border-amber-100 px-4 py-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-amber-500">Balance still due</p>
                    <p className="text-xl font-black text-amber-700 tracking-tight mt-0.5">{cur} {balance.toLocaleString()}</p>
                    <p className="text-[10px] font-medium text-amber-600/80 mt-1.5 leading-snug">
                      This is the figure the client's email, the WhatsApp draft and the Manager will all quote.
                    </p>
                  </div>
                )}
              </div>

              <div className="px-6 py-5 border-t border-neutral-100 flex gap-3">
                <button onClick={() => setDepositFor(null)}
                  className="px-5 py-3 rounded-xl border border-neutral-200 text-gray-500 font-black uppercase tracking-widest text-[10px] hover:bg-neutral-50 transition-colors">
                  Cancel
                </button>
                <button
                  disabled={!valid || depositSaving}
                  onClick={async () => {
                    setDepositSaving(true);
                    const inv = depositFor;
                    onUpdateInvoices(invoices.map(i => i.id === inv.id
                      ? { ...i, paymentStatus: PaymentStatus.PARTIALLY_PAID, isPaid: false, amountPaidKES: entered }
                      : i));
                    const res = await updateInvoicePaymentStatus(inv.id, PaymentStatus.PARTIALLY_PAID, entered);
                    setDepositSaving(false);
                    if (res.success) setDepositFor(null);
                    else alert('Failed to record the payment. Nothing was changed.');
                  }}
                  className="flex-1 py-3 bg-[#3D8593] text-white rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-black transition-colors disabled:opacity-30"
                >
                  {depositSaving ? 'Saving…' : 'Record payment'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Amend Invoice Modal */}
      {amendingInvoice && (() => {
        const inputCls = "w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2.5 font-semibold text-sm text-gray-900 outline-none focus:border-[#3D8593] focus:bg-white transition-colors placeholder:text-neutral-300 placeholder:font-medium";
        const labelCls = "text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1.5";
        const itemsTotal = amendItems.reduce((acc, i) => acc + (i.priceKES || 0) * (i.quantity || 1), 0);
        const patchItem = (idx: number, patch: Partial<InvoiceItem>) =>
          setAmendItems(prev => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));

        return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-300 relative max-h-[92vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-7 py-5 border-b border-neutral-100">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center"><Edit3 className="w-5 h-5" /></span>
                <div>
                  <h3 className="text-lg font-black text-gray-900 tracking-tight leading-none">Amend Invoice</h3>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">{amendingInvoice.invoiceNumber} · {amendingInvoice.clientName}</p>
                </div>
              </div>
              <button onClick={() => setAmendingInvoice(null)} className="p-2 rounded-lg hover:bg-neutral-100 transition-colors">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (amendSaving) return;
                setAmendSaving(true);
                setAmendError(null);

                const fd = new FormData(e.currentTarget);
                const num = (k: string) => parseFloat(fd.get(k) as string) || 0;
                const createdAtRaw = fd.get('createdAt') as string;

                // Blank total means "recalculate from the lines"; TBD keeps it at
                // zero, which is how this system already marks an unpriced order.
                const rawTotal = ((fd.get('totalKES') as string) || '').trim();
                const totalKES = !rawTotal
                  ? itemsTotal
                  : rawTotal.toUpperCase() === 'TBD' ? 0 : (parseFloat(rawTotal.replace(/,/g, '')) || 0);

                const cleanItems = amendItems
                  .filter(i => i.name.trim())
                  .map(i => ({ name: i.name.trim(), quantity: i.quantity || 1, priceKES: i.priceKES || 0 }));

                const paymentStatus = fd.get('paymentStatus') as PaymentStatus;
                const customTitle = ((fd.get('productName') as string) || '').trim();

                const result = await updateInvoiceDetails(amendingInvoice.id, {
                  clientName: (fd.get('clientName') as string).trim(),
                  clientWhatsapp: ((fd.get('clientWhatsapp') as string) || '').trim(),
                  clientEmail: ((fd.get('clientEmail') as string) || '').trim(),
                  productName: customTitle || cleanItems.map(i => `${i.quantity}x ${i.name}`).join(' + '),
                  items: cleanItems,
                  totalKES,
                  amountPaidKES: num('amountPaidKES'),
                  buyingPriceKES: num('buyingPriceKES'),
                  shippingFeeKES: num('shippingFeeKES'),
                  logisticsCostKES: num('logisticsCostKES'),
                  serviceFeeKES: num('serviceFeeKES'),
                  currency: amendCurrency,
                  paymentStatus,
                  isPaid: paymentStatus === PaymentStatus.PAID,
                  createdAt: createdAtRaw ? new Date(createdAtRaw).toISOString() : undefined,
                  paystackReference: ((fd.get('paystackReference') as string) || '').trim(),
                });

                setAmendSaving(false);
                if (result.success) {
                  setAmendingInvoice(null);
                  window.location.reload();
                } else {
                  setAmendError(
                    (result.error as any)?.message || 'Could not save the changes. Nothing on the invoice was altered.'
                  );
                }
              }}
              id="amendInvoiceForm"
              className="flex-1 overflow-y-auto px-7 py-6 space-y-5"
            >
              {amendError && (
                <div className="flex items-start gap-3 bg-rose-50 border border-rose-100 rounded-xl p-4">
                  <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <p className="text-sm font-medium text-rose-900">{amendError}</p>
                </div>
              )}

              {/* Client */}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className={labelCls}>Client Full Name</label>
                  <input required name="clientName" defaultValue={amendingInvoice.clientName} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>WhatsApp Number</label>
                  <input name="clientWhatsapp" defaultValue={amendingInvoice.clientWhatsapp || ''} className={inputCls} placeholder="254791873538" />
                </div>
                <div>
                  <label className={labelCls}>Currency</label>
                  <select value={amendCurrency} onChange={(e) => setAmendCurrency(e.target.value as 'KES' | 'USD')} className={inputCls}>
                    <option value="KES">KES</option>
                    <option value="USD">USD</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className={labelCls}>Client Email</label>
                  <input type="email" name="clientEmail" defaultValue={amendingInvoice.clientEmail || ''} className={inputCls} placeholder="client@example.com" />
                </div>
                <div className="col-span-2">
                  <label className={labelCls}>Invoice Title <span className="text-neutral-300 normal-case font-medium">— blank rebuilds it from the items</span></label>
                  <input name="productName" defaultValue={amendingInvoice.productName || ''} className={inputCls} />
                </div>
              </div>

              {/* Items — this is where a corrected price or an extra fee goes */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className={labelCls + " mb-0"}>Items &amp; Charges</label>
                  <button type="button" onClick={() => setAmendItems([...amendItems, { name: '', quantity: 1, priceKES: 0 }])} className="text-[10px] font-black uppercase tracking-widest text-[#3D8593] hover:text-[#2d626c] flex items-center gap-1">
                    <Plus className="w-3 h-3" /> Add line
                  </button>
                </div>
                <div className="space-y-3">
                  {amendItems.map((item, idx) => (
                    <div key={idx} className="bg-neutral-50/60 border border-neutral-100 rounded-xl p-2.5 space-y-2 relative">
                      <input
                        value={item.name}
                        onChange={(e) => patchItem(idx, { name: e.target.value })}
                        className={inputCls + " w-full bg-white"}
                        placeholder="Item or fee (e.g. Extra handling charge)"
                      />
                      <div className="flex gap-2">
                        <div className="w-20">
                          <span className="text-[8px] font-black uppercase tracking-widest text-neutral-300 block mb-0.5 ml-1">Qty</span>
                          <input type="number" min="1" value={item.quantity}
                            onChange={(e) => patchItem(idx, { quantity: parseInt(e.target.value, 10) || 1 })}
                            className={inputCls + " w-full text-center px-2 bg-white"} />
                        </div>
                        <div className="flex-1">
                          <span className="text-[8px] font-black uppercase tracking-widest text-neutral-300 block mb-0.5 ml-1">Unit Price ({amendCurrency})</span>
                          <input type="number" min="0" value={item.priceKES}
                            onChange={(e) => patchItem(idx, { priceKES: parseFloat(e.target.value) || 0 })}
                            className={inputCls + " w-full text-right px-3 bg-white"} />
                        </div>
                      </div>
                      {amendItems.length > 1 && (
                        <button type="button" onClick={() => setAmendItems(amendItems.filter((_, i) => i !== idx))} className="absolute -top-2 -right-2 w-6 h-6 bg-white border border-neutral-200 rounded-full flex items-center justify-center text-neutral-400 hover:text-rose-500 hover:border-rose-200 transition-colors shadow-sm">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-2 text-right">
                  Lines total · {amendCurrency} {itemsTotal.toLocaleString()}
                </p>
              </div>

              {/* Money */}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className={labelCls}>Total Amount <span className="text-neutral-300 normal-case font-medium">— blank = use the lines total</span></label>
                  <input type="text" name="totalKES" defaultValue={amendingInvoice.totalKES ? String(amendingInvoice.totalKES) : ''} className={inputCls} placeholder={`Auto: ${amendCurrency} ${itemsTotal.toLocaleString()}`} />
                </div>
                <div>
                  <label className={labelCls}>Amount Paid</label>
                  <input type="number" name="amountPaidKES" defaultValue={amendingInvoice.amountPaidKES || 0} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Payment Status</label>
                  <select name="paymentStatus" defaultValue={amendingInvoice.paymentStatus} className={inputCls}>
                    {Object.values(PaymentStatus).map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Order Date</label>
                  <input name="createdAt" type="date" className={inputCls + " text-gray-500"}
                    defaultValue={amendingInvoice.createdAt ? new Date(amendingInvoice.createdAt).toISOString().split('T')[0] : (amendingInvoice.date ? new Date(amendingInvoice.date).toISOString().split('T')[0] : '')} />
                </div>
                <div>
                  <label className={labelCls}>Receipt / M-Pesa Code</label>
                  <input name="paystackReference" type="text" defaultValue={amendingInvoice.paystackReference || ''} placeholder="e.g. QWX982M21" className={inputCls} />
                </div>
              </div>

              {/* Internal costs — never shown to the client */}
              <details className="group" open>
                <summary className="flex items-center gap-2 cursor-pointer text-[10px] font-black uppercase tracking-widest text-[#3D8593] list-none">
                  <ChevronRight className="w-3.5 h-3.5 group-open:rotate-90 transition-transform" /> Internal Cost Breakdown
                </summary>
                <div className="grid grid-cols-2 gap-3 mt-3 pl-1">
                  {([
                    { name: 'buyingPriceKES', label: 'Buying Price', value: amendingInvoice.buyingPriceKES },
                    { name: 'shippingFeeKES', label: 'Shipping Fee', value: amendingInvoice.shippingFeeKES },
                    { name: 'logisticsCostKES', label: 'Logistics / Riders', value: amendingInvoice.logisticsCostKES },
                    { name: 'serviceFeeKES', label: 'Service Fee', value: amendingInvoice.serviceFeeKES },
                  ]).map(f => (
                    <div key={f.name}>
                      <label className={labelCls}>{f.label}</label>
                      <input type="number" name={f.name} defaultValue={f.value || 0} className={inputCls} />
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-gray-400 font-medium mt-2 pl-1 leading-snug">
                  These drive your profit reporting only — the client never sees them.
                </p>
              </details>
            </form>

            <div className="px-7 py-5 border-t border-neutral-100 flex items-center gap-3">
              <button type="button" onClick={() => setAmendingInvoice(null)}
                className="px-5 py-3 rounded-xl border border-neutral-200 text-gray-500 font-black uppercase tracking-widest text-[10px] hover:bg-neutral-50 transition-colors">
                Cancel
              </button>
              <button
                type="submit"
                form="amendInvoiceForm"
                disabled={amendSaving}
                className="flex-1 py-3 bg-sky-500 text-white rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-black transition-colors disabled:opacity-40"
              >
                {amendSaving ? 'Saving…' : 'Save Amendments'}
              </button>
            </div>
          </div>
        </div>
        );
      })()}

    </div>
  );
};

export default AdminDashboard;

