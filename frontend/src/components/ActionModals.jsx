import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, AlertTriangle, X, AlertCircle } from 'lucide-react';

/**
 * Success Modal - Shows success message with auto-close
 */
export function SuccessActionModal({ isOpen, title = 'Success!', message, onClose, duration = 3000 }) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 18, stiffness: 300 }}
            className="relative bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center overflow-hidden"
          >
            {/* Top gradient accent */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-400 via-teal-500 to-blue-500" />

            {/* Animated icon */}
            <div className="relative mb-6">
              <div className="absolute inset-0 bg-emerald-400/20 blur-2xl rounded-full scale-150" />
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', damping: 12, stiffness: 200, delay: 0.1 }}
                className="relative w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(16,185,129,0.4)]"
              >
                <CheckCircle2 className="text-white" size={40} />
              </motion.div>
            </div>

            <motion.h3
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-2xl font-bold text-slate-900 mb-2"
            >
              {title}
            </motion.h3>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="text-slate-500 font-medium mb-6 leading-relaxed"
            >
              {message}
            </motion.p>

            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              onClick={onClose}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-all active:scale-[0.98]"
            >
              Done
            </motion.button>

            {/* Auto-close progress bar */}
            <motion.div
              initial={{ scaleX: 1 }}
              animate={{ scaleX: 0 }}
              transition={{ duration: duration / 1000, ease: 'linear' }}
              style={{ transformOrigin: 'left' }}
              className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-400"
              onAnimationComplete={onClose}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Error Modal - Shows error message
 */
export function ErrorActionModal({ isOpen, title = 'Error', message, onClose }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 18, stiffness: 300 }}
            className="relative bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center overflow-hidden"
          >
            {/* Top gradient accent */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-red-400 via-rose-500 to-pink-600" />

            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-1 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X size={20} />
            </button>

            {/* Animated icon */}
            <div className="relative mb-6">
              <div className="absolute inset-0 bg-red-400/20 blur-2xl rounded-full scale-150" />
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', damping: 12, stiffness: 200, delay: 0.1 }}
                className="relative w-20 h-20 bg-red-500 rounded-full flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(239,68,68,0.4)]"
              >
                <AlertCircle className="text-white" size={40} />
              </motion.div>
            </div>

            <motion.h3
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-2xl font-bold text-slate-900 mb-2"
            >
              {title}
            </motion.h3>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="text-slate-500 font-medium mb-6 leading-relaxed"
            >
              {message}
            </motion.p>

            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              onClick={onClose}
              className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-all active:scale-[0.98]"
            >
              Dismiss
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Confirm Modal - Shows confirmation for dangerous actions
 */
export function ConfirmActionModal({
  isOpen,
  title = 'Confirm Action',
  message,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDangerous = false,
  isLoading = false,
  onConfirm,
  onCancel
}) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 20 }}
            className="relative bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full overflow-hidden"
          >
            {/* Top accent */}
            <div
              className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${
                isDangerous
                  ? 'from-red-400 to-rose-600'
                  : 'from-blue-400 to-indigo-600'
              }`}
            />

            <button
              onClick={onCancel}
              disabled={isLoading}
              className="absolute top-4 right-4 p-1 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-50"
            >
              <X size={20} />
            </button>

            {/* Icon */}
            <div className="flex items-center justify-center w-16 h-16 rounded-2xl mx-auto mb-6"
              style={{
                backgroundColor: isDangerous ? '#fee2e2' : '#dbeafe'
              }}>
              {isDangerous ? (
                <AlertTriangle className={isDangerous ? 'text-red-500' : 'text-blue-500'} size={32} />
              ) : (
                <AlertCircle className={isDangerous ? 'text-red-500' : 'text-blue-500'} size={32} />
              )}
            </div>

            <h3 className="text-xl font-bold text-slate-900 text-center mb-2">{title}</h3>
            <p className="text-slate-500 text-center text-sm leading-relaxed mb-2">{message}</p>

            {description && (
              <div
                className={`rounded-xl p-3 mb-6 flex gap-2 items-start ${
                  isDangerous
                    ? 'bg-red-50 border border-red-100'
                    : 'bg-blue-50 border border-blue-100'
                }`}
              >
                <AlertTriangle
                  className={isDangerous ? 'text-red-500' : 'text-blue-500'}
                  size={16}
                  style={{ marginTop: '2px' }}
                />
                <p
                  className={`text-xs font-medium ${
                    isDangerous ? 'text-red-700' : 'text-blue-700'
                  }`}
                >
                  {description}
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={onCancel}
                disabled={isLoading}
                className="flex-1 py-3 border-2 border-slate-200 text-slate-700 font-semibold rounded-xl hover:bg-slate-50 transition-all disabled:opacity-50"
              >
                {cancelText}
              </button>
              <button
                onClick={onConfirm}
                disabled={isLoading}
                className={`flex-1 py-3 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 active:scale-[0.98] ${
                  isDangerous
                    ? 'bg-red-600 hover:bg-red-700 disabled:bg-red-300'
                    : 'bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300'
                }`}
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : null}
                {confirmText}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Info Modal - Shows informational message
 */
export function InfoActionModal({ isOpen, title, message, onClose }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 18, stiffness: 300 }}
            className="relative bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center overflow-hidden"
          >
            {/* Top gradient accent */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-400 via-indigo-500 to-purple-600" />

            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-1 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X size={20} />
            </button>

            <motion.h3
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-2xl font-bold text-slate-900 mb-4"
            >
              {title}
            </motion.h3>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="text-slate-500 font-medium mb-8 leading-relaxed whitespace-pre-wrap"
            >
              {message}
            </motion.p>

            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              onClick={onClose}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all active:scale-[0.98]"
            >
              OK
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function ActionModalRenderer({ modals }) {
  return (
    <>
      <SuccessActionModal
        isOpen={modals.successModal.isOpen}
        title={modals.successModal.title}
        message={modals.successModal.message}
        onClose={modals.success.close}
      />
      <ErrorActionModal
        isOpen={modals.errorModal.isOpen}
        title={modals.errorModal.title}
        message={modals.errorModal.message}
        onClose={modals.error.close}
      />
      <ConfirmActionModal
        isOpen={modals.confirmModal.isOpen}
        title={modals.confirmModal.title}
        message={modals.confirmModal.message}
        description={modals.confirmModal.description}
        confirmText={modals.confirmModal.confirmText}
        cancelText={modals.confirmModal.cancelText}
        isDangerous={modals.confirmModal.isDangerous}
        isLoading={modals.confirmModal.isLoading}
        onConfirm={modals.confirmModal.onConfirm}
        onCancel={modals.confirmModal.onCancel || modals.confirm.close}
      />
      <InfoActionModal
        isOpen={modals.infoModal.isOpen}
        title={modals.infoModal.title}
        message={modals.infoModal.message}
        onClose={modals.info.close}
      />
    </>
  );
}
