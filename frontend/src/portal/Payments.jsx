import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../hooks/useAuth';
import Card from '../components/Card';
import Button from '../components/Button';
import Header from '../components/Header';
import StatusBadge from '../components/StatusBadge';
import BottomActionBar from '../components/BottomActionBar';

export default function PortalPayments() {
  const { profile } = useAuth();
  const [payments, setPayments] = useState([]);
  const [feeStructure, setFeeStructure] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUploadProof, setShowUploadProof] = useState(false);

  useEffect(() => {
    if (profile?.student_id) {
      fetchPaymentData();
    }
  }, [profile]);

  const fetchPaymentData = async () => {
    try {
      setLoading(true);

      // Fetch payments
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select('*')
        .eq('student_id', profile?.student_id)
        .order('created_at', { ascending: false });

      if (paymentsError) throw paymentsError;
      setPayments(paymentsData || []);

      // Fetch fee structure for student's class
      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .select('class_id')
        .eq('id', profile?.student_id)
        .single();

      if (studentError) throw studentError;

      if (studentData?.class_id) {
        const { data: feesData, error: feesError } = await supabase
          .from('fee_structures')
          .select('*')
          .eq('class_id', studentData.class_id);

        if (feesError) throw feesError;
        setFeeStructure(feesData || []);
      }
    } catch (error) {
      console.error('Error fetching payment data:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalRequired = feeStructure.reduce((sum, fee) => sum + Number(fee.amount || 0), 0);
  const totalPaid = payments
    .filter(p => p.status === 'approved')
    .reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const outstanding = totalRequired - totalPaid;

  const handlePayNow = () => {
    setShowUploadProof(true);
  };

  if (loading) {
    return (
      <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
        <div className="h-10 bg-slate-200 rounded-lg animate-skeleton w-48"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="h-32 bg-white rounded-2xl border border-slate-100 animate-skeleton"></div>
          <div className="h-32 bg-white rounded-2xl border border-slate-100 animate-skeleton"></div>
          <div className="h-32 bg-white rounded-2xl border border-slate-100 animate-skeleton"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto pb-32 md:pb-6">
      <div className="hidden md:block">
        <Header title="Payments" showBack />
      </div>

      {/* Payment Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 mb-6">
        <Card className="border-l-4 border-green-600 shadow-soft">
          <p className="text-sm text-slate-500 font-medium">Total Paid</p>
          <p className="text-2xl font-black text-green-600 mt-1">₦{Number(totalPaid).toLocaleString()}</p>
        </Card>
        <Card className="border-l-4 border-orange-600 shadow-soft">
          <p className="text-sm text-slate-500 font-medium">Outstanding</p>
          <p className="text-2xl font-black text-orange-600 mt-1">₦{Number(outstanding).toLocaleString()}</p>
        </Card>
        <Card className="border-l-4 border-blue-600 shadow-soft">
          <p className="text-sm text-slate-500 font-medium">Total Required</p>
          <p className="text-2xl font-black text-blue-600 mt-1">₦{Number(totalRequired).toLocaleString()}</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          {/* Payment Status */}
          <Card className="shadow-soft">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Payment Status</h2>
            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-slate-600">Completion</p>
                <p className="text-sm font-black text-slate-900">
                  {totalRequired > 0 ? ((totalPaid / totalRequired) * 100).toFixed(0) : 0}%
                </p>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-3">
                <div
                  className="bg-green-500 h-3 rounded-full transition-all duration-1000 shadow-sm"
                  style={{ width: `${totalRequired > 0 ? Math.min((totalPaid / totalRequired) * 100, 100) : 0}%` }}
                ></div>
              </div>
            </div>
          </Card>

          {/* Fee Breakdown */}
          {feeStructure.length > 0 && (
            <Card className="shadow-soft">
              <h2 className="text-lg font-bold text-slate-900 mb-4">Fee Breakdown</h2>
              <div className="space-y-3">
                {feeStructure.map((fee) => (
                  <div key={fee.id} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="font-semibold text-slate-700">{fee.name}</p>
                    <p className="font-black text-slate-900">₦{Number(fee.amount).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          {/* Recent Payments */}
          <Card className="shadow-soft">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Payment History</h2>
            {payments.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <svg className="w-12 h-12 mx-auto mb-2 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p>No payment history found</p>
              </div>
            ) : (
              <div className="space-y-3">
                {payments.map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between p-4 border border-slate-100 rounded-2xl hover:bg-slate-50 transition-all">
                    <div>
                      <p className="font-black text-slate-900">₦{Number(payment.amount).toLocaleString()}</p>
                      <p className="text-xs font-medium text-slate-400 mt-1">{new Date(payment.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                    </div>
                    <StatusBadge status={payment.status} />
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Upload Proof Form (Inline instead of Modal for better UX) */}
          {showUploadProof && (
            <Card className="border-2 border-blue-500 shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-300">
              <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Upload Payment Proof
              </h3>
              <div className="space-y-4">
                <div className="border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center hover:border-blue-300 transition-colors cursor-pointer group">
                  <input type="file" className="hidden" id="proof-upload" accept="image/*,.pdf" />
                  <label htmlFor="proof-upload" className="cursor-pointer">
                    <p className="text-sm text-slate-500 group-hover:text-blue-500 font-medium">Click to select file or drag and drop</p>
                    <p className="text-[10px] text-slate-400 mt-1">Images or PDF (max 5MB)</p>
                  </label>
                </div>
                <div className="flex gap-3">
                  <Button variant="primary" className="flex-1 rounded-xl py-3">Submit Proof</Button>
                  <Button variant="secondary" className="flex-1 rounded-xl py-3" onClick={() => setShowUploadProof(false)}>Cancel</Button>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Bottom Action Bar */}
      <BottomActionBar>
        {outstanding > 0 ? (
          <>
            <Button variant="secondary" className="flex-1 rounded-xl font-bold py-4" onClick={() => setShowUploadProof(!showUploadProof)}>
              Upload Proof
            </Button>
            <Button variant="primary" className="flex-1 rounded-xl font-bold py-4 shadow-lg shadow-blue-200" onClick={handlePayNow}>
              Pay Now
            </Button>
          </>
        ) : (
          <div className="w-full bg-emerald-500 text-white text-center py-4 rounded-xl font-bold flex items-center justify-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
            All Fees Paid
          </div>
        )}
      </BottomActionBar>
    </div>
  );
}
