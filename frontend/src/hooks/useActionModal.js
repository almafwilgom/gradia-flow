import { useMemo, useState } from 'react';

/**
 * Hook for managing action modals state
 * Usage:
 * const { success, error, confirm, info } = useActionModal();
 * 
 * // Show success
 * success.show('Action completed!', 'Your data has been saved');
 * 
 * // Show error
 * error.show('Error', 'Something went wrong');
 * 
 * // Show confirmation
 * confirm.show('Delete item?', 'Are you sure?', 'This cannot be undone', () => {
 *   // Handle confirmation
 * });
 * 
 * // Show info
 * info.show('Information', 'Check your email for instructions');
 */
export function useActionModal() {
  const [successModal, setSuccessModal] = useState({ isOpen: false, title: 'Success!', message: '' });
  const [errorModal, setErrorModal] = useState({ isOpen: false, title: 'Error', message: '' });
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: 'Confirm',
    message: '',
    description: '',
    isDangerous: false,
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    isLoading: false,
    onConfirm: null,
    onCancel: null
  });
  const [infoModal, setInfoModal] = useState({ isOpen: false, title: '', message: '' });

  const success = useMemo(() => ({
    show: (title, message) => {
      if (typeof title === 'string' && message === undefined) {
        // Single argument - treat as message
        setSuccessModal({
          isOpen: true,
          title: 'Success!',
          message: title
        });
      } else {
        setSuccessModal({
          isOpen: true,
          title: title || 'Success!',
          message: message || ''
        });
      }
    },
    hide: () => setSuccessModal(prev => ({ ...prev, isOpen: false })),
    close: () => setSuccessModal(prev => ({ ...prev, isOpen: false })),
    setLoading: (loading) => setSuccessModal(prev => ({ ...prev, isLoading: loading }))
  }), []);

  const error = useMemo(() => ({
    show: (title, message) => {
      if (typeof title === 'string' && message === undefined) {
        // Single argument - treat as message
        setErrorModal({
          isOpen: true,
          title: 'Error',
          message: title
        });
      } else {
        setErrorModal({
          isOpen: true,
          title: title || 'Error',
          message: message || ''
        });
      }
    },
    hide: () => setErrorModal(prev => ({ ...prev, isOpen: false })),
    close: () => setErrorModal(prev => ({ ...prev, isOpen: false }))
  }), []);

  const confirm = useMemo(() => ({
    show: (title, message, description, onConfirmCallback, options = {}) => {
      setConfirmModal({
        isOpen: true,
        title: title || 'Confirm',
        message: message || '',
        description: description || '',
        isDangerous: options.isDangerous || false,
        confirmText: options.confirmText || 'Confirm',
        cancelText: options.cancelText || 'Cancel',
        isLoading: false,
        onConfirm: onConfirmCallback,
        onCancel: () => {
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      });
    },
    hide: () => setConfirmModal(prev => ({ ...prev, isOpen: false })),
    close: () => setConfirmModal(prev => ({ ...prev, isOpen: false })),
    setLoading: (loading) => setConfirmModal(prev => ({ ...prev, isLoading: loading }))
  }), []);

  const info = useMemo(() => ({
    show: (title, message) => {
      setInfoModal({
        isOpen: true,
        title: title || 'Information',
        message: message || ''
      });
    },
    hide: () => setInfoModal(prev => ({ ...prev, isOpen: false })),
    close: () => setInfoModal(prev => ({ ...prev, isOpen: false }))
  }), []);

  return {
    successModal,
    errorModal,
    confirmModal,
    infoModal,
    success,
    error,
    confirm,
    info
  };
}
