
import React from 'react';
import { Instagram, Music2, Mail, ArrowUpRight, Handshake, Users, Briefcase, Sparkles } from 'lucide-react';

const Collaboration: React.FC = () => {
  return (
    <div className="animate-in fade-in duration-1000">
      {/* Hero */}
      <section className="py-24 md:py-32 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-neutral-50 rounded-full border border-neutral-100 mb-8">
            <Sparkles className="w-4 h-4 text-neutral-400" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Partner with the best</span>
          </div>
          <h1 className="text-6xl md:text-8xl font-medium mb-8 tracking-tight-custom text-neutral-900 leading-[1.05]">
            Let's scale <br/>
            <span className="text-neutral-400 italic font-light heading-accent">Together.</span>
          </h1>
          <p className="text-xl md:text-2xl max-w-2xl mx-auto mb-16 text-neutral-500 font-light leading-relaxed">
            Whether you are a content creator looking to showcase global tech or a business looking for a reliable sourcing partner.
          </p>
        </div>
      </section>

      {/* Social Cards */}
      <section className="pb-32 px-6">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-10">
          <a 
            href="https://instagram.com/legitgrinder.imports" 
            target="_blank" 
            rel="noopener noreferrer"
            className="group relative bg-neutral-50 rounded-[3.5rem] p-12 overflow-hidden transition-all hover:bg-white hover:shadow-2xl hover:shadow-neutral-200"
          >
            <div className="relative z-10">
              <div className="bg-white w-16 h-16 rounded-2xl flex items-center justify-center mb-8 shadow-sm group-hover:scale-110 transition-transform">
                <Instagram className="w-8 h-8 text-neutral-900" />
              </div>
              <h3 className="text-3xl font-medium mb-4 tracking-tight-custom">Instagram</h3>
              <p className="text-neutral-500 font-light mb-8 max-w-xs leading-relaxed">Join 200k+ followers for daily drops and sourcing insights.</p>
              <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-neutral-900 border-b-2 border-neutral-900 pb-1">
                @legitgrinder.imports <ArrowUpRight className="w-3 h-3" />
              </span>
            </div>
            <div className="absolute top-10 right-10 opacity-5 group-hover:opacity-10 transition-opacity">
              <Instagram className="w-48 h-48" />
            </div>
          </a>

          <a 
            href="https://tiktok.com/@legitgrinderimports" 
            target="_blank" 
            rel="noopener noreferrer"
            className="group relative bg-neutral-50 rounded-[3.5rem] p-12 overflow-hidden transition-all hover:bg-white hover:shadow-2xl hover:shadow-neutral-200"
          >
            <div className="relative z-10">
              <div className="bg-white w-16 h-16 rounded-2xl flex items-center justify-center mb-8 shadow-sm group-hover:scale-110 transition-transform">
                <Music2 className="w-8 h-8 text-neutral-900" />
              </div>
              <h3 className="text-3xl font-medium mb-4 tracking-tight-custom">TikTok</h3>
              <p className="text-neutral-500 font-light mb-8 max-w-xs leading-relaxed">Watch our unboxing and sourcing process live in action.</p>
              <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-neutral-900 border-b-2 border-neutral-900 pb-1">
                @legitgrinderimports <ArrowUpRight className="w-3 h-3" />
              </span>
            </div>
            <div className="absolute top-10 right-10 opacity-5 group-hover:opacity-10 transition-opacity">
              <Music2 className="w-48 h-48" />
            </div>
          </a>
        </div>
      </section>

      {/* Collaboration Types */}
      <section className="py-32 bg-neutral-900 text-white rounded-[4rem] mx-6 mb-32 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-neutral-800/20 to-transparent"></div>
        <div className="max-w-7xl mx-auto px-12 relative z-10">
          <div className="grid lg:grid-cols-2 gap-24">
            <div>
              <h2 className="text-4xl md:text-5xl font-medium mb-12 tracking-tight-custom">How we work.</h2>
              <div className="space-y-16">
                <div className="flex gap-8">
                  <div className="shrink-0 w-14 h-14 rounded-2xl bg-neutral-800 flex items-center justify-center">
                    <Users className="w-6 h-6 text-neutral-400" />
                  </div>
                  <div>
                    <h4 className="text-xl font-medium mb-3">Influencers & Creators</h4>
                    <p className="text-neutral-400 font-light leading-relaxed">
                      Showcase our premium imports to your audience. We offer competitive affiliate commissions and provide exclusive products for content creation.
                    </p>
                  </div>
                </div>
                <div className="flex gap-8">
                  <div className="shrink-0 w-14 h-14 rounded-2xl bg-neutral-800 flex items-center justify-center">
                    <Briefcase className="w-6 h-6 text-neutral-400" />
                  </div>
                  <div>
                    <h4 className="text-xl font-medium mb-3">Business & Wholesale</h4>
                    <p className="text-neutral-400 font-light leading-relaxed">
                      Scale your local business with direct global sourcing. We handle the heavy lifting - from agent warehouse to Nairobi collection point.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col justify-center">
              <div className="bg-white/5 border border-white/10 p-12 rounded-[3rem] backdrop-blur-xl">
                <div className="mb-10">
                  <Mail className="w-12 h-12 text-neutral-500 mb-6" />
                  <h3 className="text-3xl font-medium mb-4 tracking-tight-custom">Direct Inquiries</h3>
                  <p className="text-neutral-400 font-light">Send us your proposal or bulk request and our team will get back to you within 24 hours.</p>
                </div>
                <a 
                  href="mailto:mungaimports@gamil.com" 
                  className="inline-block bg-white text-black px-10 py-5 rounded-full font-bold text-xs uppercase tracking-widest hover:bg-neutral-200 transition-all shadow-xl shadow-black/50"
                >
                  mungaimports@gamil.com
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Collaboration;
