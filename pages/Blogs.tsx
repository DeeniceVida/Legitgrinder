
import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Clock, User, ArrowRight, Sparkles, Search, MessageCircle } from 'lucide-react';
import { BlogPost, FAQItem } from '../types';

interface BlogsProps {
  blogs: BlogPost[];
  faqs: FAQItem[];
}

const Blogs: React.FC<BlogsProps> = ({ blogs, faqs }) => {
  const [activeFaq, setActiveFaq] = useState<string | null>(null);
  const [filter, setFilter] = useState('');

  const filteredFaqs = faqs.filter(f => 
    f.question.toLowerCase().includes(filter.toLowerCase()) || 
    f.answer.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="bg-mesh min-h-screen pt-48 pb-32 px-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-32 animate-in fade-in slide-in-from-top-8 duration-1000">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-indigo-50 border border-indigo-100 rounded-full mb-8">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600">Sourcing Intelligence</span>
          </div>
          <h1 className="text-6xl md:text-8xl font-bold mb-8 tracking-tighter text-gray-900 leading-none">
            Elite <span className="text-[#3D8593] italic font-light heading-accent">Insights.</span>
          </h1>
          <p className="text-xl md:text-2xl max-w-2xl mx-auto text-gray-500 font-light leading-relaxed">
            Market updates, logistics guides, and everything you need to know about importing to Kenya.
          </p>
        </div>

        {/* Latest Blogs Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-2 gap-12 mb-40">
          {blogs.map((blog, idx) => (
            <div key={blog.id} className="group cursor-pointer animate-in fade-in slide-in-from-bottom-8" style={{ animationDelay: `${idx * 150}ms` }}>
              <div className="aspect-[16/9] rounded-[3.5rem] overflow-hidden mb-8 border border-white shadow-2xl relative">
                <img 
                  src={blog.imageUrl} 
                  className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" 
                  alt={blog.title} 
                />
                <div className="absolute top-8 left-8 bg-white/90 backdrop-blur-md px-5 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest text-[#3D8593]">
                  {blog.category}
                </div>
              </div>
              <div className="px-4">
                <div className="flex items-center gap-4 mb-4 text-[10px] font-black uppercase tracking-widest text-gray-400">
                  <span className="flex items-center gap-1.5"><Clock className="w-3 h-3" /> {blog.date}</span>
                  <span className="flex items-center gap-1.5"><User className="w-3 h-3" /> By {blog.author}</span>
                </div>
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 group-hover:text-[#3D8593] transition-colors leading-tight">
                  {blog.title}
                </h2>
                <p className="text-gray-500 font-light leading-relaxed mb-6 text-lg">
                  {blog.excerpt}
                </p>
                <button className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-[#3D8593] group-hover:gap-4 transition-all">
                  Read Full Article <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* FAQ Section */}
        <div className="bg-white rounded-[4.5rem] p-12 md:p-24 border border-neutral-100 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full blur-[100px] opacity-50"></div>
          
          <div className="grid lg:grid-cols-2 gap-24 relative z-10">
            <div>
              <h2 className="text-5xl md:text-7xl font-bold tracking-tight mb-8">Common <br/><span className="text-[#3D8593] italic font-light heading-accent">Questions.</span></h2>
              <p className="text-gray-500 text-lg font-light mb-12">
                Can't find what you're looking for? Our AI assistant or support team is always ready to help.
              </p>
              
              <div className="relative mb-8">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" />
                <input 
                  type="text" 
                  placeholder="Search questions..."
                  className="w-full bg-neutral-50 border-none rounded-3xl pl-16 pr-8 py-5 focus:ring-2 focus:ring-indigo-600/20 outline-none transition-all font-medium"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                />
              </div>

              <div className="p-8 bg-indigo-600 rounded-[2.5rem] text-white">
                 <MessageCircle className="w-10 h-10 mb-6" />
                 <h4 className="text-xl font-bold mb-2">Still need help?</h4>
                 <p className="text-indigo-100 text-sm mb-8 font-light">Get a personalized answer from our logistics experts.</p>
                 <button className="w-full py-4 bg-white text-indigo-600 rounded-2xl font-bold uppercase text-[10px] tracking-widest shadow-xl">Contact Support</button>
              </div>
            </div>

            <div className="space-y-4">
              {filteredFaqs.map((faq) => (
                <div key={faq.id} className="border border-neutral-100 rounded-[2rem] overflow-hidden transition-all hover:border-indigo-100 hover:shadow-lg">
                  <button 
                    onClick={() => setActiveFaq(activeFaq === faq.id ? null : faq.id)}
                    className="w-full px-8 py-6 flex justify-between items-center text-left hover:bg-neutral-50 transition-colors"
                  >
                    <span className="font-bold text-gray-900 text-lg leading-snug">{faq.question}</span>
                    {activeFaq === faq.id ? <ChevronUp className="w-5 h-5 text-indigo-600" /> : <ChevronDown className="w-5 h-5 text-gray-300" />}
                  </button>
                  {activeFaq === faq.id && (
                    <div className="px-8 pb-8 text-gray-500 font-light leading-relaxed animate-in slide-in-from-top-2">
                      {faq.answer}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Blogs;
