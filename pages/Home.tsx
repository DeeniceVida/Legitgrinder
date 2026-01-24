import React, { useState, useEffect } from 'react';
import { ArrowRight, Globe, TrendingUp, ShieldCheck, Truck, Smartphone, Handshake, HelpCircle, BookOpen, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '../src/lib/supabase';

interface HomeProps {
  onNavigate: (page: string) => void;
}

const Home: React.FC<HomeProps> = ({ onNavigate }) => {
  const [blogs, setBlogs] = useState<any[]>([]);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  useEffect(() => {
    const fetchBlogs = async () => {
      const { data } = await supabase.from('blogs').select('*').limit(3).order('created_at', { ascending: false });
      if (data) setBlogs(data);
    };
    fetchBlogs();
  }, []);

  const faqs = [
    { q: "How long does shipping take from USA/China?", a: "Air shipping usually takes 7-14 days, while sea shipping takes 30-45 days depending on the origin." },
    { q: "What are your service fees?", a: "Our fees are transparent: 3.5% to 5% of the buying price, covering inspection and local logistics." },
    { q: "Do you offer doorstep delivery in Kenya?", a: "Yes! We deliver to your home or office across Kenya via our partner couriers." },
    { q: "How can I track my order?", a: "Use our Tracking tool with your Invoice ID to see real-time progress from origin to destination." }
  ];

  return (
    <div className="animate-in fade-in duration-1000">
      {/* Hero Section */}
      <section className="relative h-screen min-h-[700px] flex items-center overflow-hidden bg-white">
        <div className="absolute inset-0 z-0 opacity-5">
          <img
            src="https://res.cloudinary.com/dsthpp4oj/image/upload/v1766833528/pexels-hormel-media-1095814_jxyrhh.jpg"
            className="w-full h-full object-cover scale-110"
            alt="Logistics"
          />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-12 w-full">
          <div className="max-w-4xl">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#3B8392]/5 border border-[#3B8392]/10 rounded-full mb-8">
              <div className="w-1.5 h-1.5 bg-[#3B8392] rounded-full animate-pulse"></div>
              <span className="text-[10px] font-black uppercase tracking-widest text-[#3B8392]">Elite Logistics Mastery</span>
            </div>
            <h1 className="text-6xl md:text-8xl font-medium mb-10 tracking-tight-custom text-neutral-900 leading-[1.02]">
              Global logistics <br />
              <span className="text-neutral-300 italic font-light">Simplified.</span>
            </h1>
            <p className="text-xl md:text-2xl max-w-xl mb-12 text-neutral-500 font-light leading-relaxed">
              LegitGrinder is a premium gateway for Kenyans to source high-end tech, machinery, and general items from China and the USA.
            </p>
            <div className="flex flex-col sm:flex-row gap-6">
              <button
                onClick={() => onNavigate('shop')}
                className="bg-neutral-900 text-white px-12 py-5 rounded-[2rem] font-black text-[10px] uppercase tracking-widest shadow-2xl flex items-center justify-center group hover:bg-[#3B8392] transition-all"
              >
                Browse Shop <ArrowRight className="ml-3 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
              <button
                onClick={() => onNavigate('calculators')}
                className="bg-white border border-neutral-100 text-neutral-900 px-12 py-5 rounded-[2rem] font-black text-[10px] uppercase tracking-widest hover:border-[#3B8392] transition-all shadow-xl shadow-neutral-100"
              >
                Get a Quote
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats/Trust - Teal Accent */}
      <section className="py-32 border-y border-neutral-50 bg-[#f8fcfd]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-12 text-center">
            {[
              { label: 'Verified Partners', value: '200+' },
              { label: 'Happy Clients', value: '2k+' },
              { label: 'Kenya Delivery', value: 'Doorstep' },
              { label: 'Support', value: '24/7' }
            ].map((stat, i) => (
              <div key={i} className="group cursor-default">
                <p className="text-4xl font-black mb-3 text-neutral-900 group-hover:text-[#3B8392] transition-colors tracking-tighter">{stat.value}</p>
                <p className="text-[9px] uppercase font-black tracking-[0.2em] text-neutral-400 group-hover:text-neutral-500">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature Section - Teal Theme */}
      <section className="py-40 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-32 items-center">
            <div className="relative aspect-[4/5] rounded-[4rem] overflow-hidden shadow-2xl group">
              <img
                src="https://res.cloudinary.com/dsthpp4oj/image/upload/v1766833528/pexels-hormel-media-1095814_jxyrhh.jpg"
                className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
                alt="Productivity"
              />
              <div className="absolute inset-0 bg-neutral-900/5 group-hover:bg-transparent transition-all"></div>
            </div>
            <div className="space-y-12">
              <h2 className="text-5xl font-medium tracking-tight-custom leading-tight">Precision sourcing <br />for professional needs.</h2>
              <div className="space-y-10">
                {[
                  { title: 'Source Anywhere', desc: 'Direct access to Alibaba, eBay, Backmarket, and Amazon.', icon: <Globe className="w-6 h-6" /> },
                  { title: 'Vetted Quality', desc: 'We verify every supplier to ensure your investment is safe.', icon: <ShieldCheck className="w-6 h-6" /> },
                  { title: 'Real-time Updates', desc: 'Linked to Invoices for perfect tracking transparency.', icon: <Truck className="w-6 h-6" /> }
                ].map((f, i) => (
                  <div key={i} className="flex gap-8 group">
                    <div className="shrink-0 w-16 h-16 rounded-[1.5rem] bg-neutral-50 flex items-center justify-center text-neutral-400 group-hover:bg-[#3B8392] group-hover:text-white transition-all duration-500 shadow-sm">
                      {f.icon}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold mb-3 text-neutral-900">{f.title}</h3>
                      <p className="text-neutral-400 font-light leading-relaxed text-lg">{f.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Integrated FAQ & Blogs Section */}
      <section className="py-40 bg-neutral-50/50 border-y border-neutral-100">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row gap-20">
            {/* Blog Section */}
            <div className="flex-1">
              <div className="flex items-center gap-4 mb-12">
                <div className="p-3 bg-white rounded-2xl shadow-sm text-[#3B8392]"><BookOpen className="w-6 h-6" /></div>
                <h2 className="text-3xl font-bold tracking-tight">Market Insights</h2>
              </div>
              <div className="space-y-8">
                {blogs.map((b, i) => (
                  <div key={i} className="bg-white p-8 rounded-[2.5rem] border border-neutral-100 shadow-sm hover:shadow-xl transition-all group cursor-pointer" onClick={() => onNavigate('blogs')}>
                    <span className="text-[10px] font-black uppercase text-[#3B8392] tracking-widest">{new Date(b.created_at).toLocaleDateString()}</span>
                    <h3 className="text-xl font-bold mt-2 mb-4 group-hover:text-[#3B8392] transition-colors">{b.title}</h3>
                    <p className="text-neutral-400 font-light text-sm line-clamp-2 leading-relaxed">{b.excerpt}</p>
                  </div>
                ))}
                {blogs.length === 0 && <p className="text-neutral-400 italic">Insights coming soon...</p>}
              </div>
            </div>

            {/* FAQ Section */}
            <div className="flex-1">
              <div className="flex items-center gap-4 mb-12">
                <div className="p-3 bg-white rounded-2xl shadow-sm text-[#3B8392]"><HelpCircle className="w-6 h-6" /></div>
                <h2 className="text-3xl font-bold tracking-tight">Helpful FAQ</h2>
              </div>
              <div className="space-y-4">
                {faqs.map((faq, i) => (
                  <div key={i} className="bg-white rounded-[2rem] border border-neutral-100 overflow-hidden shadow-sm">
                    <button
                      onClick={() => setExpandedFaq(expandedFaq === i ? null : i)}
                      className="w-full px-8 py-6 text-left flex justify-between items-center group"
                    >
                      <span className="font-bold text-neutral-700 group-hover:text-[#3B8392] transition-colors">{faq.q}</span>
                      {expandedFaq === i ? <ChevronUp className="w-4 h-4 text-[#3B8392]" /> : <ChevronDown className="w-4 h-4 text-neutral-400" />}
                    </button>
                    {expandedFaq === i && (
                      <div className="px-8 pb-8 text-neutral-400 font-light leading-relaxed animate-in slide-in-from-top-4 duration-300">
                        {faq.a}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section - Teal Theme */}
      <section className="py-40 px-6">
        <div className="max-w-6xl mx-auto bg-neutral-900 rounded-[5rem] p-16 md:p-32 text-center text-white relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#3B8392]/20 rounded-full blur-[120px]"></div>
          <div className="relative z-10">
            <h2 className="text-5xl md:text-7xl font-medium mb-10 tracking-tight-custom leading-tight">Start your import <br />journey today.</h2>
            <p className="text-neutral-400 text-lg md:text-xl mb-16 max-w-2xl mx-auto font-light leading-relaxed tracking-wide">Join 2,000+ happy clients sourcing globally with LegitGrinder. Professional, transparent, and reliable.</p>
            <div className="flex flex-col sm:flex-row gap-8 justify-center items-center">
              <button onClick={() => onNavigate('shop')} className="w-full sm:w-auto bg-[#3B8392] text-white px-16 py-6 rounded-[2.5rem] font-black text-[10px] uppercase tracking-[0.2em] shadow-2xl shadow-[#3B8392]/30 hover:scale-105 transition-all">Get Started</button>
              <a href="https://wa.me/254791873538" target="_blank" className="font-black text-[10px] uppercase tracking-widest text-neutral-300 hover:text-white border-b-2 border-neutral-800 hover:border-[#3B8392] transition-all pb-2">Chat with us</a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
