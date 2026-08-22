import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4">
      <div className="max-w-3xl text-center space-y-8">
        <div className="flex justify-center mb-4">
          <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
            <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
          </div>
        </div>
        <h1 className="text-5xl font-extrabold text-slate-900 tracking-tight">
          Modern Healthcare, <span className="text-blue-600">Simplified.</span>
        </h1>
        <p className="text-xl text-slate-500 max-w-2xl mx-auto">
          HealthClinic is an intelligent appointment management system powered by AI. 
          Book appointments, view your health summaries, and stay connected with your care providers.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
          <Link 
            href="/register" 
            className="inline-flex h-12 items-center justify-center rounded-lg bg-blue-600 px-8 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors"
          >
            Get Started as Patient
          </Link>
          <Link 
            href="/login" 
            className="inline-flex h-12 items-center justify-center rounded-lg bg-white px-8 text-sm font-semibold text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50 transition-colors"
          >
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
