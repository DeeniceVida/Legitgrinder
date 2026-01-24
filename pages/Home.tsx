
import React from 'react';
import { ArrowRight, Globe, TrendingUp, ShieldCheck, Truck, Smartphone, Handshake } from 'lucide-react';

interface HomeProps {
  onNavigate: (page: string) => void;
}

const Home: React.FC<HomeProps> = ({ onNavigate }) => {
  return (
    <div className="animate-in fade-in duration-1000">
      {/* Hero Section */}
      <section className="relative h-screen min-h-[700px] flex items-center overflow-hidden bg-neutral-50">
        <div className="absolute inset-0 z-0 opacity-10">
          <img 
            src="https://res.cloudinary.com/dsthpp4oj/image/upload/v1766833528/pexels-hormel-media-1095814_jxyrhh.jpg" 
            className="w-full h-full object-cover grayscale"
            alt="Logistics"
          />
        </div>
        
        <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-12 w-full">
          <div className="max-w-4xl">
            <h1 className="text-6xl md:text-8xl font-medium mb-8 tracking-tight-custom text-neutral-900 leading-[1.05]">
              Global logistics <br/>
              <span className="text-neutral-400 italic font-light heading-accent">Simplified.</span>
            </h1>
            <p className="text-xl md:text-2xl max-w-xl mb-12 text-neutral-500 font-light leading-relaxed">
              LegitGrinder is a premium gateway for Kenyans to source high-end tech and machinery directly from China and the USA.
            </p>
            <div className="flex flex-col sm:flex-row gap-6">
              <button 
                onClick={() => onNavigate('shop')}
                className="btn-brand bg-neutral-900 text-white px-10 py-5 rounded-full font-medium shadow-xl shadow-neutral-200 flex items-center justify-center group"
              >
                Browse Deals <ArrowRight className="ml-3 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
              <button 
                onClick={() => onNavigate('calculators')}
                className="btn-secondary bg-white border border-neutral-200 text-neutral-900 px-10 py-5 rounded-full font-medium transition-all"
              >
                Calculate Quote
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats/Trust */}
      <section className="py-24 border-y border-neutral-100 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-12 text-center">
            {[
              { label: 'Verified Partners', value: '200+' },
              { label: 'Happy Clients', value: '2k+' },
              { label: 'Kenya Delivery', value: 'Doorstep' },
              { label: 'Support', value: '24/7' }
            ].map((stat, i) => (
              <div key={i}>
                <p className="text-3xl font-medium mb-2 text-neutral-900 group-hover:text-[#FF9900] transition-colors">{stat.value}</p>
                <p className="text-[10px] uppercase font-bold tracking-widest text-neutral-400">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature Section */}
      <section className="py-32 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-24 items-center">
            <div>
              <h2 className="text-4xl md:text-5xl font-medium mb-8 tracking-tight-custom leading-tight">Precision logistics <br/>for growing businesses.</h2>
              <div className="space-y-12">
                {[
                  { title: 'Source Anywhere', desc: 'Direct access to Alibaba, eBay, Backmarket, and Amazon.', icon: <Globe className="w-6 h-6" /> },
                  { title: 'Vetted Quality', desc: 'We verify every supplier to ensure your investment is safe.', icon: <ShieldCheck className="w-6 h-6" /> },
                  { title: 'Real-time Updates', desc: 'From origin agents to Nairobi hub, track every milestone.', icon: <Truck className="w-6 h-6" /> }
                ].map((f, i) => (
                  <div key={i} className="flex gap-6 group">
                    <div className="shrink-0 w-12 h-12 rounded-2xl bg-neutral-50 flex items-center justify-center text-neutral-900 group-hover:bg-[#FF9900] group-hover:text-white transition-all duration-500">
                      {f.icon}
                    </div>
                    <div>
                      <h3 className="text-xl font-medium mb-2 text-neutral-900 group-hover:text-[#FF9900] transition-colors">{f.title}</h3>
                      <p className="text-neutral-500 font-light leading-relaxed">{f.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative aspect-square rounded-[3rem] overflow-hidden group">
              <img 
                src="https://res.cloudinary.com/dsthpp4oj/image/upload/v1766833528/pexels-hormel-media-1095814_jxyrhh.jpg" 
                className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-1000"
                alt="Productivity"
              />
              <div className="absolute inset-0 bg-neutral-900/10 group-hover:bg-transparent transition-all duration-500"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Collaboration Promo */}
      <section className="py-32 bg-neutral-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="bg-white rounded-[3.5rem] p-12 md:p-20 border border-neutral-100 flex flex-col md:flex-row items-center gap-16 group hover:border-[#FF9900]/30 transition-all duration-700">
            <div className="shrink-0 w-24 h-24 rounded-3xl bg-neutral-900 flex items-center justify-center text-white shadow-2xl group-hover:bg-[#FF9900] transition-colors duration-500">
              <Handshake className="w-10 h-10" />
            </div>
            <div className="flex-1">
              <h2 className="text-3xl md:text-4xl font-medium mb-4 tracking-tight-custom group-hover:text-[#FF9900] transition-colors">Partner with LegitGrinder.</h2>
              <p className="text-neutral-500 font-light text-lg max-w-xl">
                Are you an influencer or a local business? We offer exclusive sourcing solutions and partnership opportunities to help you grow.
              </p>
            </div>
            <button 
              onClick={() => onNavigate('collaboration')}
              className="btn-brand bg-neutral-900 text-white px-10 py-5 rounded-full font-bold text-xs uppercase tracking-widest flex items-center gap-3"
            >
              Learn More <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-32 px-6">
        <div className="max-w-6xl mx-auto bg-[#0a0a0a] rounded-[4rem] p-12 md:p-24 text-center text-white relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-[#FF9900]/5 to-transparent pointer-events-none"></div>
          <h2 className="text-4xl md:text-6xl font-medium mb-8 tracking-tight-custom leading-tight relative z-10">Start your import <br/>journey today.</h2>
          <p className="text-neutral-400 text-lg md:text-xl mb-12 max-w-2xl mx-auto font-light leading-relaxed relative z-10">Join 2,000+ happy clients sourcing globally with LegitGrinder. Professional, transparent, and reliable.</p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center relative z-10">
            <button className="btn-brand bg-white text-black px-12 py-5 rounded-full font-medium">Get Started</button>
            <a href="https://wa.me/254791873538" target="_blank" className="text-white font-medium border-b border-neutral-700 hover:border-[#FF9900] hover:text-[#FF9900] transition-all pb-1 px-4">Chat with us</a>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
