import { useState, useEffect } from 'react';
import { DollarSign, FileText, CreditCard, ShieldCheck, Cpu, CheckCircle, XCircle, RefreshCw } from 'lucide-react';

interface Bill {
  _id: string;
  patientId: {
    _id: string;
    firstName: string;
    lastName: string;
    hospitalId: string;
  } | string;
  consultationId: string;
  totalAmount: number;
  paymentStatus: 'pending' | 'paid' | 'refunded';
  insuranceStatus: 'not_required' | 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

interface CompletedConsultation {
  _id: string;
  patientId: {
    _id: string;
    firstName: string;
    lastName: string;
    hospitalId: string;
  };
  doctorId: {
    firstName: string;
    lastName: string;
    specialization: string;
  };
  diagnosis: string;
  status: string;
  updatedAt: string;
}

interface BillingConsoleProps {
  token: string | null;
  addLog: (msg: string) => void;
}

export default function BillingConsole({ token: _token, addLog }: BillingConsoleProps) {
  const [bills, setBills] = useState<Bill[]>([]);
  const [completedConsultations, setCompletedConsultations] = useState<CompletedConsultation[]>([]);
  
  // Input fields
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [insuranceProvider, setInsuranceProvider] = useState('');
  const [policyNumber, setPolicyNumber] = useState('');
  
  // Explanation modal / box
  const [activeExplanation, setActiveExplanation] = useState<string | null>(null);
  const [explainingId, setExplainingId] = useState<string | null>(null);
  
  // Insurance result
  const [insuranceResult, setInsuranceResult] = useState<any>(null);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  
  // Receipt details
  const [activeReceipt, setActiveReceipt] = useState<any>(null);
  
  // Loading & error
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch all bills
      const billsRes = await fetch('http://localhost:5000/api/v1/bills');
      const billsData = await billsRes.json();
      if (billsRes.ok && billsData.success) {
        setBills(billsData.data);
      }

      // 2. Fetch completed consultations
      const consultationsRes = await fetch('http://localhost:5000/api/v1/consultations');
      const consultationsData = await consultationsRes.json();
      if (consultationsRes.ok && consultationsData.success) {
        // Filter consultations that are completed and do not have bills generated yet
        const completed = consultationsData.data.filter((c: any) => c.status === 'completed');
        const unbilled = completed.filter((c: any) => {
          return !billsData.data.some((b: any) => {
            const billConsultationId = typeof b.consultationId === 'object' ? b.consultationId._id : b.consultationId;
            return billConsultationId === c._id;
          });
        });
        setCompletedConsultations(unbilled);
      }
    } catch (err) {
      setError("Failed to fetch billing data from Express API.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleGenerateBill = async (consultationId: string) => {
    setError(null);
    setSuccess(null);
    setLoading(true);
    addLog(`Requesting bill generation for consultation ID: ${consultationId}...`);
    try {
      const res = await fetch('http://localhost:5000/api/v1/bills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ consultationId })
      });
      const result = await res.json();
      if (res.ok && result.success) {
        setSuccess(`Successfully generated bill for $${result.data.totalAmount}.`);
        addLog(`Bill generated successfully: ID ${result.data._id}`);
        fetchData();
      } else {
        setError(result.error?.message || "Failed to generate bill.");
      }
    } catch (err) {
      setError("Express API unreachable.");
    } finally {
      setLoading(false);
    }
  };

  const handleProcessPayment = async (bill: Bill) => {
    setError(null);
    setSuccess(null);
    setLoading(true);
    addLog(`Processing payment of $${bill.totalAmount} for bill ID: ${bill._id}...`);
    try {
      const res = await fetch(`http://localhost:5000/api/v1/bills/${bill._id}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentAmount: bill.totalAmount })
      });
      const result = await res.json();
      if (res.ok && result.success) {
        setSuccess(`Payment successful! Receipt generated.`);
        setActiveReceipt(result.data.receipt);
        addLog(`Processed payment of $${bill.totalAmount}. Receipt: ${result.data.receipt.receiptNumber}`);
        fetchData();
      } else {
        setError(result.error?.message || "Payment rejected.");
      }
    } catch (err) {
      setError("Express API unreachable.");
    } finally {
      setLoading(false);
    }
  };

  const handleExplainBill = async (bill: Bill) => {
    setActiveExplanation(null);
    setExplainingId(bill._id);
    addLog(`Consulting Billing Agent to explain charges for bill ID: ${bill._id}...`);
    try {
      const res = await fetch(`http://localhost:5000/api/v1/bills/${bill._id}/explain`, {
        method: 'POST'
      });
      const result = await res.json();
      if (res.ok && result.success) {
        setActiveExplanation(result.data.explanation);
        addLog(`Billing explanation loaded successfully.`);
      } else {
        setError(result.error?.message || "Failed to retrieve billing explanation.");
      }
    } catch (err) {
      setError("Express API unreachable.");
    } finally {
      setExplainingId(null);
    }
  };

  const handleVerifyInsurance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBill) return;

    setError(null);
    setInsuranceResult(null);
    setVerifyingId(selectedBill._id);
    addLog(`Consulting Billing Agent for insurance claim coordination on bill ID: ${selectedBill._id}...`);
    try {
      const res = await fetch(`http://localhost:5000/api/v1/bills/${selectedBill._id}/verify-insurance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ insuranceProvider, policyNumber })
      });
      const result = await res.json();
      if (res.ok && result.success) {
        setInsuranceResult(result.data);
        addLog(`Insurance claim result: ${result.data.isCovered ? 'APPROVED' : 'DENIED'}. Approved amount: $${result.data.approved_amount}`);
        fetchData();
      } else {
        setError(result.error?.message || "Insurance verification failed.");
      }
    } catch (err) {
      setError("Express API unreachable.");
    } finally {
      setVerifyingId(null);
    }
  };

  const getPatientName = (patient: any) => {
    if (typeof patient === 'object' && patient !== null) {
      return `${patient.firstName} ${patient.lastName}`;
    }
    return 'Unknown Patient';
  };

  const getPatientId = (patient: any) => {
    if (typeof patient === 'object' && patient !== null) {
      return patient.hospitalId;
    }
    return 'N/A';
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-emerald-400" />
            Billing & Invoicing Console
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            Manage patient bills, process payments, and verify insurance coverages using AI agent assistance.
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-1.5 py-1.5 px-3 rounded-lg bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300 hover:bg-slate-800 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh Console
        </button>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-450 text-xs flex items-center gap-2">
          <XCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-450 text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Completed Awaiting Billing */}
        <div className="lg:col-span-1 space-y-4">
          <div className="glow-card rounded-3xl bg-slate-950/60 border border-slate-900 p-5 space-y-4">
            <span className="text-[10px] text-slate-500 font-bold uppercase block border-b border-slate-900 pb-2">Awaiting Billing</span>
            
            {completedConsultations.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-6">No completed consultations awaiting billing.</p>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {completedConsultations.map((c) => (
                  <div key={c._id} className="p-3 bg-slate-900/30 border border-slate-900 rounded-xl space-y-2.5">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-xs font-bold text-slate-200">{getPatientName(c.patientId)}</h4>
                        <span className="text-[9px] text-slate-500 font-mono block">{getPatientId(c.patientId)}</span>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-[9px] font-bold text-emerald-400">Completed</span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      <span className="text-slate-600">Diagnosis:</span> {c.diagnosis}
                    </div>
                    <button
                      onClick={() => handleGenerateBill(c._id)}
                      disabled={loading}
                      className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 text-xs font-bold transition-all"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      Generate Bill
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Generated Invoices */}
        <div className="lg:col-span-2 space-y-4">
          <div className="glow-card rounded-3xl bg-slate-950/60 border border-slate-900 p-5 space-y-4">
            <span className="text-[10px] text-slate-500 font-bold uppercase block border-b border-slate-900 pb-2">Hospital Invoices / Bills</span>
            
            {bills.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-10">No bills generated yet.</p>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {bills.map((b) => (
                  <div key={b._id} className="p-4 bg-slate-900/20 border border-slate-900 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-200">{getPatientName(b.patientId)}</span>
                        <span className="text-[10px] text-slate-500 font-mono">({getPatientId(b.patientId)})</span>
                      </div>
                      <div className="flex flex-wrap gap-2 pt-1 text-[10px]">
                        <span className={`px-2 py-0.5 rounded-full font-bold ${
                          b.paymentStatus === 'paid' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400'
                        }`}>
                          Payment: {b.paymentStatus.toUpperCase()}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full font-bold ${
                          b.insuranceStatus === 'approved' ? 'bg-sky-500/15 text-sky-400' :
                          b.insuranceStatus === 'rejected' ? 'bg-rose-500/15 text-rose-450' : 'bg-slate-800 text-slate-400'
                        }`}>
                          Insurance: {b.insuranceStatus.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>
                      <span className="text-[9px] text-slate-600 block pt-1">
                        Invoice Date: {new Date(b.createdAt).toLocaleString()}
                      </span>
                    </div>

                    <div className="flex flex-row md:flex-col items-start md:items-end justify-between w-full md:w-auto border-t md:border-t-0 border-slate-900 pt-3 md:pt-0 gap-3">
                      <div className="text-slate-100 text-sm font-bold">
                        Total Amount: <span className="text-emerald-400">${b.totalAmount.toFixed(2)}</span>
                      </div>

                      <div className="flex gap-2 flex-wrap justify-end">
                        {/* Explain Bill Button */}
                        <button
                          onClick={() => handleExplainBill(b)}
                          disabled={explainingId !== null}
                          className="flex items-center gap-1.5 py-1.5 px-3 rounded-lg bg-slate-900 hover:bg-slate-850 border border-slate-800 text-[11px] font-semibold text-slate-300 transition-all"
                        >
                          {explainingId === b._id ? (
                            <RefreshCw className="w-3 h-3 animate-spin" />
                          ) : (
                            <Cpu className="w-3.5 h-3.5 text-indigo-400" />
                          )}
                          AI Explain
                        </button>

                        {/* Insurance Verification Action */}
                        {b.paymentStatus === 'pending' && b.insuranceStatus !== 'approved' && (
                          <button
                            onClick={() => {
                              setSelectedBill(b);
                              setInsuranceProvider('');
                              setPolicyNumber('');
                              setInsuranceResult(null);
                            }}
                            className="flex items-center gap-1 py-1.5 px-2.5 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/20 text-[11px] font-semibold transition-all"
                          >
                            <ShieldCheck className="w-3.5 h-3.5" />
                            Insurance Claim
                          </button>
                        )}

                        {/* Pay Invoice */}
                        {b.paymentStatus === 'pending' && (
                          <button
                            onClick={() => handleProcessPayment(b)}
                            disabled={loading}
                            className="flex items-center gap-1 py-1.5 px-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-[11px] font-bold transition-all shadow-md shadow-emerald-500/10"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                            Pay Bill
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* AI Explanation Result Box */}
      {activeExplanation && (
        <div className="glow-card rounded-3xl bg-slate-950/70 border border-indigo-500/20 p-5 space-y-3 relative overflow-hidden animate-in fade-in duration-200">
          <div className="absolute top-0 right-0 p-3">
            <button
              onClick={() => setActiveExplanation(null)}
              className="text-slate-500 hover:text-slate-350 text-xs"
            >
              Close
            </button>
          </div>
          <span className="text-[10px] text-indigo-400 font-bold uppercase block border-b border-slate-900 pb-2 flex items-center gap-1.5">
            <Cpu className="w-4 h-4 text-indigo-400" />
            AI Billing Advisor Explanation
          </span>
          <div className="text-xs text-slate-300 leading-relaxed max-h-[300px] overflow-y-auto whitespace-pre-wrap">
            {activeExplanation}
          </div>
        </div>
      )}

      {/* Insurance Claim Dialog / Form */}
      {selectedBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
          <div className="glow-card max-w-md w-full rounded-3xl bg-slate-950 border border-slate-800 p-6 space-y-4">
            <div className="flex justify-between items-start border-b border-slate-900 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-200">Verify Insurance Coverage</h3>
                <p className="text-[10px] text-slate-500 mt-0.5">Submit patient policy details to coordinate claim authorization.</p>
              </div>
              <button
                onClick={() => setSelectedBill(null)}
                className="text-slate-500 hover:text-slate-350 text-xs"
              >
                Close
              </button>
            </div>

            {!insuranceResult ? (
              <form onSubmit={handleVerifyInsurance} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Insurance Provider</label>
                  <input
                    type="text"
                    required
                    value={insuranceProvider}
                    onChange={(e) => setInsuranceProvider(e.target.value)}
                    placeholder="e.g. Aetna, BlueCross, Cigna"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Policy Number</label>
                  <input
                    type="text"
                    required
                    value={policyNumber}
                    onChange={(e) => setPolicyNumber(e.target.value)}
                    placeholder="e.g. POL-98765432"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={verifyingId !== null}
                    className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-sky-500 text-slate-950 text-xs font-bold transition-all"
                  >
                    {verifyingId ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Cpu className="w-3.5 h-3.5" />
                    )}
                    Run AI Verification
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div className={`p-4 rounded-xl border flex flex-col items-center justify-center gap-2 text-center ${
                  insuranceResult.isCovered ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-455'
                }`}>
                  {insuranceResult.isCovered ? (
                    <>
                      <CheckCircle className="w-8 h-8 text-emerald-400" />
                      <span className="text-xs font-bold">CLAIM PRE-AUTHORIZED</span>
                      <p className="text-[10px] text-slate-400">Approved Coverage Amount: ${insuranceResult.approved_amount.toFixed(2)}</p>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-8 h-8 text-rose-450" />
                      <span className="text-xs font-bold">CLAIM REJECTED</span>
                      <p className="text-[10px] text-slate-400">Policy coverage verification rejected.</p>
                    </>
                  )}
                </div>

                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block border-b border-slate-900 pb-1">AI Explanation Details</span>
                  <p className="text-[11px] text-slate-400 leading-relaxed font-sans">{insuranceResult.explanation}</p>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => setSelectedBill(null)}
                    className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold rounded-xl transition-all"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Payment Receipt Dialog */}
      {activeReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
          <div className="glow-card max-w-sm w-full rounded-3xl bg-slate-950 border border-emerald-500/20 p-6 space-y-4">
            <div className="text-center space-y-1">
              <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto" />
              <h3 className="text-sm font-bold text-slate-200">Transaction Receipt</h3>
              <p className="text-[10px] text-slate-500 font-mono">{activeReceipt.receiptNumber}</p>
            </div>

            <div className="border-t border-b border-slate-900 py-3 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Bill Ref ID:</span>
                <span className="text-slate-300 font-mono">{activeReceipt.billId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Total Paid:</span>
                <span className="text-emerald-400 font-bold">${activeReceipt.totalAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Payment Status:</span>
                <span className="text-emerald-400 font-semibold">{activeReceipt.paymentStatus.toUpperCase()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Processed At:</span>
                <span className="text-slate-400 font-mono text-[10px]">{new Date(activeReceipt.paidAt).toLocaleString()}</span>
              </div>
            </div>

            <button
              onClick={() => setActiveReceipt(null)}
              className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl transition-all shadow-md shadow-emerald-500/10"
            >
              Dismiss Receipt
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
