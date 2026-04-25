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
      <div className="p-4">
        <Header title="Payments" showBack />
        <div className="mt-4">Loading payments...</div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto pb-32 md:pb-6">
      <Header title="Payments" showBack />

      {/* Payment Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 mb-6">
        <Card className="border-l-4 border-green-600">
          <p className="text-sm text-slate-600">Total Paid</p>
          <p className="text-2xl font-bold text-green-600">₦{Number(totalPaid).toLocaleString()}</p>
        </Card>
        <Card className="border-l-4 border-orange-600">
          <p className="text-sm text-slate-600">Outstanding</p>
          <p className="text-2xl font-bold text-orange-600">₦{Number(outstanding).toLocaleString()}</p>
        </Card>
        <Card className="border-l-4 border-blue-600">
          <p className="text-sm text-slate-600">Total Required</p>
          <p className="text-2xl font-bold text-blue-600">₦{Number(totalRequired).toLocaleString()}</p>
        </Card>
      </div>

      {/* Payment Status */}
      <Card className="mb-6">
        <h2 className="text-lg font-bold text-slate-900 mb-4">Payment Status</h2>
        <div className="bg-gradient-to-r from-slate-50 to-slate-100 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-slate-600">Progress</p>
            <p className="text-sm font-medium text-slate-900">
              {totalRequired > 0 ? ((totalPaid / totalRequired) * 100).toFixed(0) : 0}%
            </p>
          </div>
          <div className="w-full bg-slate-300 rounded-full h-2">
            <div
              className="bg-green-600 h-2 rounded-full transition-all"
              style={{ width: `${totalRequired > 0 ? Math.min((totalPaid / totalRequired) * 100, 100) : 0}%` }}
            ></div>
          </div>
        </div>
      </Card>

      {/* Recent Payments */}
      <Card className="mb-6">
        <h2 className="text-lg font-bold text-slate-900 mb-4">Payment History</h2>
        {payments.length === 0 ? (
          <p className="text-slate-600 text-center py-6">No payment history</p>
        ) : (
          <div className="space-y-3 max-h-48 overflow-y-auto">
            {payments.map((payment) => (
              <div key={payment.id} className="flex items-center justify-between p-3 border-b border-slate-200">
                <div>
                  <p className="font-medium text-slate-900">₦{Number(payment.amount).toLocaleString()}</p>
                  <p className="text-xs text-slate-600">{new Date(payment.created_at).toLocaleDateString()}</p>
                </div>
                <StatusBadge status={payment.status} />
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Fee Breakdown */}
      {feeStructure.length > 0 && (
        <Card className="mb-6">
          <h2 className="text-lg font-bold text-slate-900 mb-4">Fee Breakdown</h2>
          <div className="space-y-2">
            {feeStructure.map((fee) => (
              <div key={fee.id} className="flex justify-between items-center p-2 bg-slate-50 rounded">
                <p className="font-medium text-slate-900">{fee.name}</p>
                <p className="font-semibold text-slate-900">₦{Number(fee.amount).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Upload Proof Modal */}
      {showUploadProof && (
        <Card className="mb-6 border-2 border-blue-600">
          <h3 className="font-bold text-slate-900 mb-3">Upload Payment Proof</h3>
          <input
            type="file"
            accept="image/*,.pdf"
            className="w-full mb-3 p-2 border border-slate-300 rounded-lg"
          />
          <div className="flex gap-2">
            <Button variant="primary" size="sm" className="flex-1">
              Upload
            </Button>
            <Button variant="secondary" size="sm" className="flex-1" onClick={() => setShowUploadProof(false)}>
              Cancel
            </Button>
          </div>
        </Card>
      )}

      {/* Bottom Action Bar */}
      <BottomActionBar>
        {outstanding > 0 ? (
          <>
            <Button variant="secondary" className="flex-1" onClick={() => setShowUploadProof(!showUploadProof)}>
              Upload Proof
            </Button>
            <Button variant="primary" className="flex-1" onClick={handlePayNow}>
              Pay Now
            </Button>
          </>
        ) : (
          <Button variant="success" className="w-full" disabled>
            ✓ All Fees Paid
          </Button>
        )}
      </BottomActionBar>
    </div>
  );
}
