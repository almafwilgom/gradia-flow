import { useState } from 'react';
import { Eye, EyeOff, AlertCircle, CheckCircle, Mail } from 'lucide-react';

export default function RegistrationModal({ onSubmit, isLoading = false, error = null, onLoginClick }) {
  const [step, setStep] = useState('registration'); // 'registration' or 'email-confirmation'
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    userType: 'parent', // 'parent', 'teacher', 'admin'
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [registeredEmail, setRegisteredEmail] = useState('');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (formErrors[name]) {
      setFormErrors((prev) => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const validateForm = () => {
    const errors = {};
    
    if (!formData.fullName.trim()) {
      errors.fullName = 'Full name is required';
    } else if (formData.fullName.trim().length < 2) {
      errors.fullName = 'Name must be at least 2 characters';
    }

    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Please enter a valid email';
    }

    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      errors.password = 'Password must contain uppercase, lowercase, and numbers';
    }

    if (!formData.confirmPassword) {
      errors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      setRegisteredEmail(formData.email);
      setStep('email-confirmation');
      onSubmit(formData);
    }
  };

  const handleEmailConfirmed = () => {
    // Handle email confirmation logic
    setStep('registration');
    setFormData({
      fullName: '',
      email: '',
      password: '',
      confirmPassword: '',
      userType: 'parent',
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-md my-8 animate-in fade-in zoom-in duration-300">
        {step === 'registration' ? (
          // Registration Form
          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
            {/* Header Section */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-8 text-center">
              <h1 className="text-3xl font-bold text-white mb-2">GradiaFlow</h1>
              <p className="text-blue-100 text-sm font-medium">
                Welcome! Create Your Account
              </p>
            </div>

            {/* Form Section */}
            <div className="p-6 md:p-8">
              <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
                {/* Full Name Field */}
                <div>
                  <label htmlFor="fullName" className="block text-sm font-semibold text-gray-700 mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    id="fullName"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleInputChange}
                    placeholder="Enter your full name"
                    className={`w-full px-4 py-3 rounded-lg border-2 transition-colors focus:outline-none ${
                      formErrors.fullName
                        ? 'border-red-500 bg-red-50 focus:border-red-600'
                        : 'border-gray-300 bg-gray-50 focus:border-blue-500'
                    }`}
                    disabled={isLoading}
                  />
                  {formErrors.fullName && (
                    <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle size={16} />
                      {formErrors.fullName}
                    </p>
                  )}
                </div>

                {/* Email Field */}
                <div>
                  <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="Enter your email"
                    className={`w-full px-4 py-3 rounded-lg border-2 transition-colors focus:outline-none ${
                      formErrors.email
                        ? 'border-red-500 bg-red-50 focus:border-red-600'
                        : 'border-gray-300 bg-gray-50 focus:border-blue-500'
                    }`}
                    disabled={isLoading}
                  />
                  {formErrors.email && (
                    <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle size={16} />
                      {formErrors.email}
                    </p>
                  )}
                </div>

                {/* User Type Selector */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Account Type
                  </label>
                  <div className="grid grid-cols-3 gap-2 md:gap-3">
                    {['parent', 'teacher', 'admin'].map((type) => (
                      <label key={type} className="flex items-center cursor-pointer">
                        <input
                          type="radio"
                          name="userType"
                          value={type}
                          checked={formData.userType === type}
                          onChange={handleInputChange}
                          className="w-4 h-4 text-blue-600"
                        />
                        <span className="ml-2 text-xs md:text-sm text-gray-700 capitalize">{type}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Password Field */}
                <div>
                  <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      id="password"
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      placeholder="Min 8 chars, uppercase, lowercase, number"
                      className={`w-full px-4 py-3 rounded-lg border-2 transition-colors focus:outline-none pr-12 text-sm md:text-base ${
                        formErrors.password
                          ? 'border-red-500 bg-red-50 focus:border-red-600'
                          : 'border-gray-300 bg-gray-50 focus:border-blue-500'
                      }`}
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                      disabled={isLoading}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {formErrors.password && (
                    <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle size={16} />
                      {formErrors.password}
                    </p>
                  )}
                </div>

                {/* Confirm Password Field */}
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-700 mb-2">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      id="confirmPassword"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      placeholder="Re-enter your password"
                      className={`w-full px-4 py-3 rounded-lg border-2 transition-colors focus:outline-none pr-12 ${
                        formErrors.confirmPassword
                          ? 'border-red-500 bg-red-50 focus:border-red-600'
                          : 'border-gray-300 bg-gray-50 focus:border-blue-500'
                      }`}
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                      disabled={isLoading}
                    >
                      {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {formErrors.confirmPassword && (
                    <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle size={16} />
                      {formErrors.confirmPassword}
                    </p>
                  )}
                </div>

                {/* Server Error Message */}
                {error && (
                  <div className="p-4 rounded-lg bg-red-50 border border-red-200 flex gap-3">
                    <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-red-800 text-sm">Registration Error</p>
                      <p className="text-xs text-red-700 mt-1">{error}</p>
                    </div>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold text-sm md:text-base transition-all hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-md disabled:hover:translate-y-0"
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Creating Account...
                    </span>
                  ) : (
                    'Create Account'
                  )}
                </button>
              </form>

              {/* Divider */}
              <div className="relative mt-6 md:mt-8 mb-6 md:mb-8">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">or</span>
                </div>
              </div>

              {/* Login Link */}
              <div className="text-center">
                <p className="text-gray-700 text-sm">
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={onLoginClick}
                    className="text-blue-600 font-semibold hover:text-blue-700 hover:underline transition-colors"
                  >
                    Sign In
                  </button>
                </p>
              </div>
            </div>
          </div>
        ) : (
          // Email Confirmation Step
          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
            {/* Header Section */}
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-8 text-center">
              <div className="flex justify-center mb-4">
                <CheckCircle size={48} className="text-white" />
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">Account Created!</h1>
              <p className="text-green-100 text-sm font-medium">
                Welcome to GradiaFlow
              </p>
            </div>

            {/* Confirmation Section */}
            <div className="p-6 md:p-8">
              <div className="text-center mb-8">
                <div className="flex justify-center mb-4">
                  <Mail size={40} className="text-blue-600" />
                </div>
                <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">
                  Verify Your Email
                </h2>
                <p className="text-gray-600 text-sm md:text-base">
                  We've sent a confirmation link to:
                </p>
                <p className="text-blue-600 font-semibold mt-2 break-all text-sm md:text-base">
                  {registeredEmail}
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 md:p-6 mb-6">
                <div className="flex gap-3">
                  <AlertCircle size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-blue-900 text-sm">Check Your Email</p>
                    <p className="text-blue-800 text-xs md:text-sm mt-1">
                      Please click the confirmation link in your email to activate your account. Check your spam folder if you don't see it.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <button
                  type="button"
                  onClick={handleEmailConfirmed}
                  className="w-full py-3 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold text-sm md:text-base transition-all hover:shadow-lg hover:-translate-y-0.5"
                >
                  I've Confirmed My Email
                </button>
                <button
                  type="button"
                  onClick={onLoginClick}
                  className="w-full py-3 rounded-lg border-2 border-gray-300 text-gray-700 font-semibold text-sm md:text-base transition-all hover:bg-gray-50"
                >
                  Back to Login
                </button>
              </div>

              <div className="mt-6 pt-6 border-t border-gray-200">
                <p className="text-center text-xs md:text-sm text-gray-600">
                  Didn't receive the email?{' '}
                  <button
                    type="button"
                    className="text-blue-600 font-semibold hover:underline transition-colors"
                  >
                    Resend Link
                  </button>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Footer Note */}
        <p className="text-center text-gray-300 text-xs mt-6">
          Your data is protected by industry-standard encryption
        </p>
      </div>
    </div>
  );
}
