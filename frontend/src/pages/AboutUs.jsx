export default function AboutUs() {
  return (
    <div className="pt-20">
      <section className="bg-white py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Our Mission</h2>
              <p className="mt-6 text-lg leading-8 text-slate-600">
                GradiaFlow was founded with a simple yet powerful mission: to digitize and transform the African educational landscape. We believe that technology should be an enabler, not a barrier, for schools across the continent.
              </p>
              <p className="mt-6 text-lg leading-8 text-slate-600">
                Our team consists of educators, engineers, and visionaries who understand the unique challenges faced by schools in Africa. We are committed to building tools that are robust, accessible, and truly impactful for international markets.
              </p>
              <div className="mt-10 pt-10 border-t border-slate-100">
                <h3 className="text-2xl font-bold tracking-tight text-slate-900 mb-4 flex items-center gap-2">
                  <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </div>
                  Our Vision
                </h3>
                <p className="text-lg leading-8 text-slate-600">
                  To become the leading digital backbone for every educational institution in Africa, fostering a future where quality education management is standard, transparent, and driven by data-powered insights.
                </p>
              </div>
              <div className="mt-10 flex gap-4">
                <div className="flex-1 bg-brand-50 p-6 rounded-2xl border border-brand-100">
                  <div className="text-3xl font-bold text-brand-600 mb-1">500+</div>
                  <div className="text-sm font-medium text-slate-600">Schools Empowered</div>
                </div>
                <div className="flex-1 bg-indigo-50 p-6 rounded-2xl border border-indigo-100">
                  <div className="text-3xl font-bold text-indigo-600 mb-1">50k+</div>
                  <div className="text-sm font-medium text-slate-600">Students Managed</div>
                </div>
              </div>
            </div>
            <div className="relative animate-fade-in-up">
              <img 
                src="/about-hero.png" 
                alt="African Secondary Students and Teacher" 
                className="rounded-3xl shadow-2xl border-4 border-white object-cover aspect-[4/3]"
              />
              <div className="absolute -bottom-6 -left-6 bg-white p-6 rounded-2xl shadow-xl border border-slate-100 max-w-xs hidden md:block animate-bounce-subtle">
                <p className="text-sm font-medium text-slate-900 italic">
                  "GradiaFlow has completely changed how we handle results. Our school in Jos is now 100% digital."
                </p>
                <div className="mt-3 text-xs font-semibold text-brand-600">— Principal, Jos Excellence Academy</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-slate-900 py-24 text-white overflow-hidden">
        <div className="mx-auto max-w-7xl px-6 lg:px-8 relative">
          <div className="mx-auto max-w-2xl text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Why Choose GradiaFlow?</h2>
            <p className="mt-4 text-slate-400">Built specifically for the African context, with features that matter.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-slate-800/50 p-8 rounded-3xl border border-slate-700/50 hover:bg-slate-800 transition-colors">
              <div className="w-12 h-12 bg-brand-500/20 rounded-xl flex items-center justify-center text-brand-400 mb-6">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3">Fast & Reliable</h3>
              <p className="text-slate-400 leading-relaxed">
                Optimized for low-bandwidth environments, ensuring you can access your data even with limited connectivity.
              </p>
            </div>

            <div className="bg-slate-800/50 p-8 rounded-3xl border border-slate-700/50 hover:bg-slate-800 transition-colors">
              <div className="w-12 h-12 bg-indigo-500/20 rounded-xl flex items-center justify-center text-indigo-400 mb-6">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3">Secure Data</h3>
              <p className="text-slate-400 leading-relaxed">
                Your school's data is encrypted and backed up daily on secure servers, protected by industry-standard protocols.
              </p>
            </div>

            <div className="bg-slate-800/50 p-8 rounded-3xl border border-slate-700/50 hover:bg-slate-800 transition-colors">
              <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-400 mb-6">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3">24/7 Support</h3>
              <p className="text-slate-400 leading-relaxed">
                Our local support team is always available to help you via phone, email, or WhatsApp.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
