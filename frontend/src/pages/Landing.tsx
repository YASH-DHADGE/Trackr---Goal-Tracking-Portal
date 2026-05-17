import { Link, useNavigate } from 'react-router-dom';
import { Shield, Users, ArrowRight, Zap, BarChart3, Sparkles, Bell, Clock } from 'lucide-react';

const Landing = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');

  const handleCTA = () => {
    if (token && role) {
      if (role === 'admin') navigate('/admin/dashboard');
      else if (role === 'manager') navigate('/manager/dashboard');
      else navigate('/employee/dashboard');
    } else {
      navigate('/login');
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 selection:bg-brand-500/30">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 glass dark:border-slate-800/50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
              <img src="/logo.png" alt="Trackr" className="w-8 h-8 object-contain" />
            </div>
            <span className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Trackr</span>
          </div>
          
          <div className="hidden md:flex items-center gap-8 text-sm font-bold text-slate-600 dark:text-slate-400">
            <a href="#features" className="hover:text-brand-600 transition-colors">Features</a>
            <a href="#solutions" className="hover:text-brand-600 transition-colors">Solutions</a>
            <a href="#about" className="hover:text-brand-600 transition-colors">About</a>
          </div>

          <div className="flex items-center gap-4">
            <Link to="/login" className="text-sm font-bold text-slate-700 dark:text-slate-200 hover:text-brand-600 px-4 py-2 transition-colors">
              Sign In
            </Link>
            <button 
              onClick={handleCTA}
              className="px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold rounded-xl shadow-xl shadow-brand-600/20 transition-all transform hover:-translate-y-0.5"
            >
              {token ? 'Go to Dashboard' : 'Get Started'}
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-40 pb-24 px-6 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full pointer-events-none">
          <div className="absolute top-20 left-0 w-96 h-96 bg-brand-500/10 rounded-full blur-[120px] animate-pulse"></div>
          <div className="absolute top-40 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-[120px] animate-pulse [animation-delay:1s]"></div>
        </div>

        <div className="max-w-5xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-50 dark:bg-brand-900/20 border border-brand-100 dark:border-brand-500/20 mb-8 animate-fade-in">
            <Zap className="w-4 h-4 text-brand-600" />
            <span className="text-xs font-bold text-brand-700 dark:text-brand-400 uppercase tracking-widest">Modern Goal Management</span>
          </div>
          
          <h1 className="text-6xl md:text-8xl font-black tracking-tighter text-slate-900 dark:text-white mb-8 leading-[0.9] animate-fade-in [animation-delay:0.1s]">
            Elevate Your Team's <br />
            <span className="bg-gradient-to-r from-brand-600 to-indigo-600 bg-clip-text text-transparent">Performance.</span>
          </h1>
          
          <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 mb-10 max-w-2xl mx-auto font-medium leading-relaxed animate-fade-in [animation-delay:0.2s]">
            The all-in-one goal tracking portal designed for high-performing teams. Align objectives, track progress, and drive results with precision.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in [animation-delay:0.3s]">
            <button 
              onClick={handleCTA}
              className="w-full sm:w-auto px-8 py-4 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-2xl shadow-2xl shadow-brand-600/30 transition-all flex items-center justify-center gap-2 text-lg"
            >
              Get Started for Free <ArrowRight className="w-5 h-5" />
            </button>
            <button className="w-full sm:w-auto px-8 py-4 bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold rounded-2xl transition-all border border-slate-200 dark:border-slate-800 text-lg">
              Book a Demo
            </button>
          </div>

          <div className="mt-20 relative animate-fade-in [animation-delay:0.4s]">
            <div className="absolute inset-0 bg-gradient-to-t from-white dark:from-slate-950 to-transparent z-10 h-40 bottom-0"></div>
            <img 
              src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=2426&auto=format&fit=crop" 
              alt="Dashboard Preview" 
              className="rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 grayscale hover:grayscale-0 transition-all duration-700"
            />
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-24 px-6 bg-slate-50 dark:bg-slate-900/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 dark:text-white mb-4">Precision Engineering for Growth</h2>
            <p className="text-slate-500 dark:text-slate-400 font-medium">Tools built to help you focus on what actually matters.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { 
                icon: <Sparkles className="w-8 h-8 text-brand-600" />, 
                title: 'Trackr AI Companion', 
                desc: 'An intelligent dual-engine chat assistant (Mistral Large + offline NLP) providing instant, contextual insights into your goals, progress, and review rules.' 
              },
              { 
                icon: <BarChart3 className="w-8 h-8 text-indigo-600" />, 
                title: 'Performance Insights', 
                desc: 'Visual analytics dashboards showing departmental check-in completion heatmaps, goal distributions by thrust area, and L1 manager review effectiveness.' 
              },
              { 
                icon: <Clock className="w-8 h-8 text-emerald-600" />, 
                title: 'Smart Escalations', 
                desc: 'Nightly cron-scheduled batches monitor delays and automatically trigger multi-stage L1/L2/L3 alerts to keep goal completion on track.' 
              },
              { 
                icon: <Bell className="w-8 h-8 text-purple-600" />, 
                title: 'Action Alerts', 
                desc: 'A sleek in-app notification center dropdown paired with transactional SMTP emails keeps employees and managers alerted on all workflow states.' 
              },
              { 
                icon: <Users className="w-8 h-8 text-amber-600" />, 
                title: 'Shared KPI Propagation', 
                desc: 'Assign departmental KPIs to multiple employee sheets seamlessly with read-only target validation and real-time primary-owner progress synchronization.' 
              },
              { 
                icon: <Shield className="w-8 h-8 text-teal-600" />, 
                title: 'Governance & Audit Trails', 
                desc: 'Role-based access controls, admin exception-handling unlocking, and full before-after database audit logs for complete accountability.' 
              }
            ].map((f, i) => (
              <div key={i} className="group p-8 bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-200 dark:border-slate-700 hover:border-brand-500 dark:hover:border-brand-500 transition-all duration-300">
                <div className="mb-6 p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl w-fit group-hover:scale-110 transition-transform">
                  {f.icon}
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">{f.title}</h3>
                <p className="text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-24 px-6 overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 opacity-40 grayscale hover:grayscale-0 transition-all">
            <div className="flex items-center justify-center font-black text-2xl text-slate-900 dark:text-white">TECHCORE</div>
            <div className="flex items-center justify-center font-black text-2xl text-slate-900 dark:text-white">VELOCITY</div>
            <div className="flex items-center justify-center font-black text-2xl text-slate-900 dark:text-white">NEXUS</div>
            <div className="flex items-center justify-center font-black text-2xl text-slate-900 dark:text-white">QUANTUM</div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto px-12 py-20 rounded-[3rem] bg-brand-600 relative overflow-hidden text-center">
          <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
            <div className="absolute -top-20 -left-20 w-80 h-80 bg-white rounded-full blur-[100px]"></div>
            <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-white rounded-full blur-[100px]"></div>
          </div>
          
          <h2 className="text-4xl md:text-6xl font-black text-white mb-8 tracking-tight">Ready to track <br /> your success?</h2>
          <p className="text-brand-100 text-lg mb-10 max-w-xl mx-auto font-medium">
            Join 500+ teams who are already achieving their quarterly targets with Trackr.
          </p>
          
          <button 
            onClick={handleCTA}
            className="px-10 py-5 bg-white text-brand-600 font-black rounded-2xl shadow-2xl hover:scale-105 transition-transform text-xl"
          >
            Start Your Journey Now
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-20 px-6 border-t border-slate-100 dark:border-slate-900">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center p-1">
              <img src="/logo.png" alt="Trackr" className="w-full h-full object-contain" />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Trackr</span>
          </div>
          
          <div className="flex gap-8 text-sm font-bold text-slate-500 uppercase tracking-widest">
            <a href="#" className="hover:text-brand-600 transition-colors">Privacy</a>
            <a href="#" className="hover:text-brand-600 transition-colors">Terms</a>
            <a href="#" className="hover:text-brand-600 transition-colors">Support</a>
          </div>

          <p className="text-slate-400 text-sm font-medium">
            © {new Date().getFullYear()} Trackr Goal Portal. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
