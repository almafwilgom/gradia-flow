import { Link, Outlet } from 'react-router-dom';
import { useState, useEffect } from 'react';

export default function PublicLayout() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Header */}
      <header 
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          isScrolled 
            ? 'bg-sidebar/95 backdrop-blur-md shadow-2xl py-3 border-b border-white/10' 
            : 'bg-sidebar py-6 border-b border-white/5'
        }`}
      >
        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-brand-400 via-indigo-500 to-emerald-500 opacity-70"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white rounded-xl flex items-center justify-center shadow-xl group-hover:scale-110 transition-all overflow-hidden border-2 border-brand-500 animate-pulse-subtle">
              <img src="/logo.png" alt="Logo" className="w-full h-full object-cover" />
            </div>
            <span className="text-xl sm:text-2xl font-black tracking-tight text-white">
              Gradia<span className="text-brand-400">Flow</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8">
            <Link to="/" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">Home</Link>
            <Link to="/about" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">About Us</Link>
            <Link to="/services" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">Services</Link>
            <Link to="/contact" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">Contact</Link>
          </nav>

          <div className="flex items-center gap-2 sm:gap-4">
            <div className="hidden sm:flex items-center gap-4">
              <Link to="/login" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">Login</Link>
              <Link to="/register" className="bg-brand-500 text-white px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-brand-600 transition-all shadow-lg shadow-brand-500/30 border border-brand-400/50">
                Get Started
              </Link>
            </div>

            {/* Mobile Menu Toggle */}
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2 text-slate-300 hover:text-white transition-colors"
            >
              {isMenuOpen ? (
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu Content */}
        <div className={`md:hidden fixed inset-x-0 top-[70px] bg-white shadow-2xl border-t border-slate-100 transition-all duration-300 transform ${isMenuOpen ? 'translate-y-0 opacity-100' : '-translate-y-10 opacity-0 pointer-events-none'}`}>
          <nav className="flex flex-col p-6 gap-4">
            <Link to="/" onClick={() => setIsMenuOpen(false)} className="text-lg font-semibold text-slate-800 hover:text-brand-600 p-2 rounded-lg hover:bg-slate-50 transition-all">Home</Link>
            <Link to="/about" onClick={() => setIsMenuOpen(false)} className="text-lg font-semibold text-slate-800 hover:text-brand-600 p-2 rounded-lg hover:bg-slate-50 transition-all">About Us</Link>
            <Link to="/services" onClick={() => setIsMenuOpen(false)} className="text-lg font-semibold text-slate-800 hover:text-brand-600 p-2 rounded-lg hover:bg-slate-50 transition-all">Services</Link>
            <Link to="/contact" onClick={() => setIsMenuOpen(false)} className="text-lg font-semibold text-slate-800 hover:text-brand-600 p-2 rounded-lg hover:bg-slate-50 transition-all">Contact</Link>
            <div className="h-px bg-slate-100 my-2"></div>
            <Link to="/login" onClick={() => setIsMenuOpen(false)} className="text-lg font-semibold text-slate-800 hover:text-brand-600 p-2">Login</Link>
            <Link to="/register" onClick={() => setIsMenuOpen(false)} className="bg-brand-600 text-white text-center py-4 rounded-xl font-bold shadow-lg shadow-brand-200 mt-2">
              Get Started Free
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-300 py-12 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
            <div className="col-span-1 md:col-span-2">
              <Link to="/" className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-lg overflow-hidden">
                  <img src="/logo.png" alt="Logo" className="w-full h-full object-cover" />
                </div>
                <span className="text-2xl font-black text-white tracking-tight">
                  Gradia<span className="text-brand-500">Flow</span>
                </span>
              </Link>
              <p className="text-slate-400 max-w-md leading-relaxed mb-6">
                Empowering African schools with state-of-the-art management tools. 
                From student records to digital results and AI-powered insights, 
                we help you focus on what matters most: education.
              </p>
              <div className="flex items-start gap-3 text-slate-400 text-sm">
                <svg className="w-5 h-5 text-brand-500 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>Jos, Plateau State, Africa</span>
              </div>
            </div>
            
            <div>
              <h4 className="text-white font-semibold mb-6">Quick Links</h4>
              <ul className="space-y-4 text-sm">
                <li><Link to="/" className="hover:text-white transition-colors">Home</Link></li>
                <li><Link to="/about" className="hover:text-white transition-colors">About Us</Link></li>
                <li><Link to="/services" className="hover:text-white transition-colors">Services</Link></li>
                <li><Link to="/contact" className="hover:text-white transition-colors">Contact Us</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-6">Legal</h4>
              <ul className="space-y-4 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Help Center</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-slate-800 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm">© {new Date().getFullYear()} GradiaFlow. All rights reserved.</p>
            <p className="text-sm text-slate-500 italic">Built for the future of African education.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
