import { useState } from 'react';
import LoginModal from '../components/LoginModal';
import RegistrationModal from '../components/RegistrationModal';
import { ModalContainer, useModal } from '../components/ModalContainer';

export default function ModalDemo() {
  const loginModal = useModal();
  const registrationModal = useModal();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleLoginSubmit = (formData) => {
    setIsLoading(true);
    console.log('Login data:', formData);
    setTimeout(() => {
      setIsLoading(false);
      alert('Login submitted! Check console for data.');
    }, 2000);
  };

  const handleRegisterSubmit = (formData) => {
    setIsLoading(true);
    console.log('Registration data:', formData);
    setTimeout(() => {
      setIsLoading(false);
      alert('Registration submitted! Check console for data.');
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Modal Components Demo</h1>
        <p className="text-gray-600 mb-8">Interactive showcase of all modal components</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Login Modal Demo */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Login Modal</h2>
            <p className="text-gray-600 mb-6">
              A clean login form with email/password fields, validation, and error handling.
            </p>
            <button
              onClick={loginModal.open}
              className="w-full py-3 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors"
            >
              Open Login Modal
            </button>
          </div>

          {/* Registration Modal Demo */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Registration Modal</h2>
            <p className="text-gray-600 mb-6">
              A comprehensive registration form with email verification and account type selection.
            </p>
            <button
              onClick={registrationModal.open}
              className="w-full py-3 rounded-lg bg-green-600 text-white font-semibold hover:bg-green-700 transition-colors"
            >
              Open Registration Modal
            </button>
          </div>
        </div>

        {/* Feature List */}
        <div className="mt-12 bg-white rounded-xl shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-bold text-gray-900 mb-2">✨ Modal Features</h3>
              <ul className="text-gray-600 space-y-2">
                <li>✓ Proper overlay with backdrop</li>
                <li>✓ Smooth animations</li>
                <li>✓ Form validation</li>
                <li>✓ Error handling</li>
                <li>✓ Loading states</li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-gray-900 mb-2">🎨 Design</h3>
              <ul className="text-gray-600 space-y-2">
                <li>✓ Responsive on all devices</li>
                <li>✓ Modern gradient styling</li>
                <li>✓ Accessibility support</li>
                <li>✓ Icon integration</li>
                <li>✓ Professional look</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Usage Instructions */}
        <div className="mt-8 bg-blue-50 rounded-xl p-8 border border-blue-200">
          <h2 className="text-xl font-bold text-blue-900 mb-4">How to Use</h2>
          <div className="space-y-4 text-blue-800">
            <p>
              <strong>1. Import the Modal:</strong>
              <code className="block bg-white p-2 rounded mt-2 overflow-x-auto">
                import LoginModal from '@/components/LoginModal';
              </code>
            </p>
            <p>
              <strong>2. Implement in Your Component:</strong>
              <code className="block bg-white p-2 rounded mt-2 overflow-x-auto text-sm">
                {`<LoginModal 
  onSubmit={handleSubmit}
  isLoading={isLoading}
  error={error}
  onRegisterClick={() => navigate('/register')}
/>`}
              </code>
            </p>
            <p>
              <strong>3. Handle Form Submission:</strong>
              <code className="block bg-white p-2 rounded mt-2 overflow-x-auto text-sm">
                {`const handleSubmit = async (formData) => {
  // formData contains: email, password, loginType
};`}
              </code>
            </p>
          </div>
        </div>
      </div>

      {/* Modal Instances */}
      <ModalContainer isOpen={loginModal.isOpen} onClose={loginModal.close}>
        <LoginModal
          onSubmit={handleLoginSubmit}
          isLoading={isLoading}
          error={error}
          onRegisterClick={() => {
            loginModal.close();
            registrationModal.open();
          }}
        />
      </ModalContainer>

      <ModalContainer isOpen={registrationModal.isOpen} onClose={registrationModal.close}>
        <RegistrationModal
          onSubmit={handleRegisterSubmit}
          isLoading={isLoading}
          error={error}
          onLoginClick={() => {
            registrationModal.close();
            loginModal.open();
          }}
        />
      </ModalContainer>
    </div>
  );
}
