
import React from 'react';
import { ArrowRight, Smartphone, Truck, Package, Sparkles, Zap, Globe, ShieldCheck, Search, Handshake, Box } from 'lucide-react';

interface HomeProps {
  onNavigate: (page: string) => void;
}

const Home: React.FC<HomeProps> = ({ onNavigate }) => {
  return (
    <div className="bg-mesh min-h-screen">
      {/* Hero Section */}
      <section className="pt-48 pb-32 px-6">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-20 items-center">
          <div className="animate-in fade-in slide-in-from-left-8 duration-1000">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-teal-50 border border-teal-100 rounded-full mb-8">
              <Sparkles className="w-3.5 h-3.5 text-[#3D8593]" />
              <span className="text-[10px] font-black uppercase tracking-widest text-[#3D8593]">Elite Concierge Sourcing</span>
            </div>
            <h1 className="text-6xl md:text-8xl font-bold mb-8 tracking-tighter text-gray-900 leading-[0.95] overflow-visible">
              Your Private <br />
              <span className="text-[#3D8593] italic font-light heading-accent">Sourcing Agent.</span>
            </h1>
            <p className="text-xl md:text-2xl max-w-lg mb-12 text-gray-500 font-light leading-relaxed">
              I bridge the gap between your vision and global suppliers. From negotiation to doorstep delivery in Kenya, I handle the complexity so you don't have to.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={() => onNavigate('shop')}
                className="btn-vibrant-orange px-12 py-5 rounded-full font-black uppercase text-[11px] tracking-widest flex items-center justify-center gap-3"
              >
                View Inventory <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => onNavigate('consultation')}
                className="bg-white border-2 border-teal-50 text-[#3D8593] px-12 py-5 rounded-full font-black uppercase text-[11px] tracking-widest hover:bg-teal-50 transition-all shadow-sm"
              >
                Book Strategy Session
              </button>
            </div>
          </div>

          <div className="relative animate-in fade-in zoom-in-95 duration-1000 delay-300">
            <div className="absolute inset-0 bg-gradient-to-tr from-[#FF9900]/20 to-[#3D8593]/20 rounded-[4.5rem] rotate-2 opacity-50 blur-2xl"></div>
            <img
              src="https://res.cloudinary.com/dsthpp4oj/image/upload/v1766833528/pexels-hormel-media-1095814_jxyrhh.jpg"
              className="relative z-10 w-full h-[650px] object-cover rounded-[3.5rem] shadow-2xl border-4 border-white"
              alt="Import Hub"
            />
          </div>
        </div>
      </section>

      {/* Sourcing Process Section */}
      <section className="py-32 px-6 bg-white">
        <div className="max-w-7xl mx-auto text-center mb-24">
          <h2 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">How I Work <span className="text-[#3D8593] italic heading-accent font-light">For You</span></h2>
          <p className="text-gray-500 text-lg font-light max-w-2xl mx-auto">A high-touch sourcing model designed for transparency and reliability.</p>
        </div>

        <div className="max-w-7xl mx-auto grid md:grid-cols-4 gap-8">
          {[
            { step: '01', title: 'Consult', desc: 'Tell me your needs—whether it\'s elite tech, industrial tools, or bulk supplies.', icon: <Search /> },
            { step: '02', title: 'Liaise', desc: 'I talk directly to verified suppliers in China and USA to secure best quality and rates.', icon: <Handshake /> },
            { step: '03', title: 'Ship', desc: 'I consolidate your items and manage the freight, customs, and global logistics.', icon: <Globe /> },
            { step: '04', title: 'Distribute', desc: 'Your items arrive in Nairobi for CBD pickup or doorstep courier delivery.', icon: <Box /> }
          ].map((item, i) => (
            <div key={i} className="group p-10 rounded-[3rem] bg-neutral-50 border border-transparent hover:border-teal-100 hover:bg-white transition-all duration-500">
              <span className="text-4xl font-black text-teal-100 group-hover:text-[#3D8593]/20 transition-colors block mb-6">{item.step}</span>
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-[#3D8593] shadow-sm mb-6 group-hover:scale-110 transition-transform">
                {React.cloneElement(item.icon as React.ReactElement, { size: 24 })}
              </div>
              <h3 className="text-xl font-bold mb-4">{item.title}</h3>
              <p className="text-gray-500 text-sm font-light leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Premium Trust Section */}
      <section className="py-40 px-6 relative overflow-hidden">
        {/* Decorative background for premium feel */}
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] border-[1px] border-neutral-100 rounded-full"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] border-[1px] border-neutral-100 rounded-full"></div>
        </div>

        <div className="max-w-5xl mx-auto text-center relative z-10">
          <div className="flex justify-center mb-12">
            <div className="flex -space-x-4">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="w-16 h-16 rounded-full border-4 border-white bg-neutral-100 overflow-hidden shadow-xl">
                  <img src={`https://i.pravatar.cc/150?u=${i + 10}`} alt="User" />
                </div>
              ))}
            </div>
          </div>

          <h2 className="text-5xl md:text-7xl font-bold tracking-tighter mb-10 leading-[1.1]">
            Trusted by <span className="text-[#3D8593] italic heading-accent font-light">2,000+ Importers</span> <br />
            Across East Africa.
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-16 mt-20">
            <div className="space-y-2">
              <p className="text-5xl font-black text-gray-900 tracking-tighter">98.4%</p>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#3D8593]">Successful Fulfillment</p>
            </div>
            <div className="space-y-2">
              <p className="text-5xl font-black text-gray-900 tracking-tighter">KES 40M+</p>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#3D8593]">Value Handled in 2025</p>
            </div>
            <div className="space-y-2">
              <p className="text-5xl font-black text-gray-900 tracking-tighter">14 Days</p>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#3D8593]">Avg Delivery Window</p>
            </div>
          </div>

          <div className="mt-24 grid md:grid-cols-2 lg:grid-cols-3 gap-8 text-left">
            {[
              {
                name: "Uniquebysherah Operations",
                initials: "US",
                text: "Legit grinder was incredible! From China to Kenya, everything was handled professionally and arrived right at my doorstep. Communication was fast, updates were clear, and delivery was so swift.",
                tag: "Business Importer"
              },
              {
                name: "MD",
                initials: "MD",
                text: "Imported my monitor, chair and lights from Dennis and the process was smooth plus the quality was way better than what's found locally in Nairobi.",
                tag: "Tech Enthusiast"
              },
              {
                name: "Abbywanjohi",
                initials: "AW",
                text: "It's unbelievable how my expectations were surpassed. The phone is clean practically new. Lovely customer care services. Literally Legit.",
                tag: "Phone Buyer"
              }
            ].map((review, i) => (
              <div key={i} className="glass p-10 rounded-[3rem] border-white/50 relative overflow-hidden shadow-xl hover:scale-[1.02] transition-transform">
                <div className="absolute top-6 right-8 opacity-5">
                  <ShieldCheck size={80} className="text-[#3D8593]" />
                </div>
                <div className="relative z-10">
                  <div className="flex gap-1 mb-6">
                    {[1, 2, 3, 4, 5].map(star => (
                      <Sparkles key={star} className="w-3 h-3 text-[#FF9900]" />
                    ))}
                  </div>
                  <p className="text-lg font-light text-gray-700 leading-relaxed mb-8 italic">
                    "{review.text}"
                  </p>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-teal-50 flex items-center justify-center font-bold text-[#3D8593] uppercase">
                      {review.initials}
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">{review.name}</p>
                      <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">{review.tag}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final Call to Action */}
      <section className="py-24 bg-[#3D8593] rounded-[4.5rem] mx-6 mb-32 relative overflow-hidden shadow-2xl shadow-teal-900/20">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
        <div className="max-w-7xl mx-auto px-12 text-center text-white relative z-10">
          <h2 className="text-5xl md:text-7xl font-bold mb-10 tracking-tight leading-none">Ready to Source?</h2>
          <p className="text-teal-50 text-xl font-light mb-16 max-w-2xl mx-auto">Skip the middleman and the guesswork. Let's get your products from the global warehouse to your hands.</p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <button
              onClick={() => onNavigate('calculators')}
              className="bg-white text-[#3D8593] px-16 py-6 rounded-full font-black uppercase text-[12px] tracking-widest hover:bg-teal-50 transition-all shadow-xl"
            >
              Get a Free Quote
            </button>
            <button
              onClick={() => onNavigate('collaboration')}
              className="border-2 border-white/30 text-white px-16 py-6 rounded-full font-black uppercase text-[12px] tracking-widest hover:bg-white/10 transition-all"
            >
              Collaborate
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
