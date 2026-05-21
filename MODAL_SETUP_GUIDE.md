# Modal Components - Complete Setup Guide

## Overview
GradiaFlow now includes three fully-featured modal components:
- **LoginModal** - Clean login form with email/password
- **RegistrationModal** - Complete registration with email confirmation
- **ModalContainer** - Reusable modal wrapper with animations

## Components Created

### 1. LoginModal Component
**Path:** `src/components/LoginModal.jsx`

A professional login form modal with:
- Email and password fields
- Login type selector (Email/Phone)
- Form validation
- Error handling and display
- Loading states with spinner
- Register link navigation
- Proper modal overlay with backdrop blur

**Props:**
```javascript
<LoginModal
  onSubmit={(formData) => {}} // {loginType, email, password}
  isLoading={false}           // Show loading spinner
  error={null}                // Error message to display
  onRegisterClick={() => {}}  // Navigate to registration
/>
```

### 2. RegistrationModal Component
**Path:** `src/components/RegistrationModal.jsx`

A comprehensive registration form with two-step flow:

**Step 1: Registration Form**
- Full name input
- Email input
- Account type selector (Parent/Teacher/Admin)
- Password with strength requirements (8+ chars, uppercase, lowercase, numbers)
- Password confirmation
- Form validation
- Error handling

**Step 2: Email Confirmation**
- Success message
- Email verification instructions
- Resend email option
- Back to login option

**Props:**
```javascript
<RegistrationModal
  onSubmit={(formData) => {}} // {fullName, email, password, userType}
  isLoading={false}           // Show loading spinner
  error={null}                // Error message to display
  onLoginClick={() => {}}     // Navigate to login
/>
```

### 3. ModalContainer Component
**Path:** `src/components/ModalContainer.jsx`

A reusable modal wrapper with animations and backdrop management.

**Usage:**
```javascript
import { ModalContainer, useModal } from '@/components/ModalContainer';

export default function MyComponent() {
  const modal = useModal();
  
  return (
    <>
      <button onClick={modal.open}>Open Modal</button>
      
      <ModalContainer isOpen={modal.isOpen} onClose={modal.close}>
        <YourModalContent />
      </ModalContainer>
    </>
  );
}
```

## Integration Examples

### Option 1: Simple Auth Page (Recommended)
Use the pre-built AuthModal page that handles login/registration switching:

```javascript
import AuthModal from '@/pages/AuthModal';

// In your router
<Route path="/auth" element={<AuthModal />} />
```

### Option 2: With ModalContainer in Your Page
```javascript
import { useState } from 'react';
import { ModalContainer, useModal } from '@/components/ModalContainer';
import LoginModal from '@/components/LoginModal';

export default function Dashboard() {
  const loginModal = useModal();

  return (
    <>
      <button onClick={loginModal.open}>
        Open Login
      </button>

      <ModalContainer 
        isOpen={loginModal.isOpen} 
        onClose={loginModal.close}
        closeOnBackdropClick={true}
      >
        <LoginModal
          onSubmit={(data) => {
            console.log('Login:', data);
            loginModal.close();
          }}
          onRegisterClick={loginModal.close}
        />
      </ModalContainer>
    </>
  );
}
```

### Option 3: Full-Screen Auth Experience
```javascript
import AuthModal from '@/pages/AuthModal';

// Render directly as a full-page auth experience
function App() {
  return <AuthModal />;
}
```

## Modal Features

### Styling
- ✅ Proper fixed overlay with `fixed inset-0` positioning
- ✅ Backdrop blur effect with 50% opacity
- ✅ Smooth animations (fade in/zoom)
- ✅ Z-index properly set (z-50)
- ✅ Responsive on all screen sizes (mobile to desktop)
- ✅ Modern gradient color scheme (blue-600 to indigo-600)

### Functionality
- ✅ Form validation with real-time error display
- ✅ Loading states with spinner
- ✅ Error message handling
- ✅ Icon integration (Eye, AlertCircle, etc.)
- ✅ Toggle password visibility
- ✅ Smooth transitions and animations
- ✅ Click-outside to close (optional)

### Accessibility
- ✅ Proper form labels and IDs
- ✅ ARIA attributes for screen readers
- ✅ Keyboard navigation support
- ✅ Focus management
- ✅ High contrast colors
- ✅ Readable font sizes

## API Integration Example

```javascript
const handleLogin = async (formData) => {
  setLoading(true);
  try {
    const { error } = await supabase.auth.signInWithPassword({
      email: formData.email,
      password: formData.password,
    });
    
    if (error) {
      setError(error.message);
      return;
    }
    
    // Navigate to dashboard
    navigate('/dashboard');
  } catch (err) {
    setError(err.message);
  } finally {
    setLoading(false);
  }
};
```

## Testing the Modals

Visit `/modal-demo` to see all modals in action:
```javascript
// In your router
import ModalDemo from '@/pages/ModalDemo';
<Route path="/modal-demo" element={<ModalDemo />} />
```

## Customization

### Change Colors
Edit the tailwind classes in the modal components:
- `from-blue-600 to-indigo-600` → Your gradient colors
- `border-blue-300` → Your border colors
- `text-blue-100` → Your text colors

### Change Animation Speed
Update the animation duration in ModalContainer.jsx:
```javascript
transition={{ duration: 0.2 }} // Change to desired speed
```

### Disable Backdrop Click Close
```javascript
<ModalContainer 
  isOpen={modal.isOpen} 
  onClose={modal.close}
  closeOnBackdropClick={false}
>
```

## File Structure
```
src/
├── components/
│   ├── LoginModal.jsx          # Login form modal
│   ├── RegistrationModal.jsx   # Registration modal
│   └── ModalContainer.jsx      # Reusable modal wrapper
├── pages/
│   ├── AuthModal.jsx           # Integrated auth page
│   └── ModalDemo.jsx           # Demo showcase
```

## Troubleshooting

**Modal not showing?**
- Ensure Z-index hierarchy is correct (z-50 for modal, z-40 for backdrop)
- Check if modal is being rendered in your component
- Verify the state is being managed correctly

**Animations not working?**
- Make sure `framer-motion` is installed
- Check if PageWrapper has `overflow: hidden` conflicting
- Verify Tailwind classes are being applied

**Form validation not working?**
- Check form data structure matches expected shape
- Verify validateForm() is being called before submit
- Check formErrors state is being updated

**Styling issues?**
- Ensure Tailwind CSS is properly configured
- Check if custom Tailwind config has conflicting rules
- Use browser DevTools to inspect applied classes

## Support

For issues or questions:
1. Check the ModalDemo page for working examples
2. Review the component props in this guide
3. Check browser console for error messages
4. Verify all imports are correct

---

**Created:** May 2026  
**Updated:** May 21, 2026  
**Version:** 1.0.0
