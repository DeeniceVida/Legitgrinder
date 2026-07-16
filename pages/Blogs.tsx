import React, { useState } from 'react';
import { CaretDown, Clock, User, ArrowRight, MagnifyingGlass, ChatCircleDots, WhatsappLogo } from '@phosphor-icons/react';
import { BlogPost, FAQItem } from '../types';
import SafeImage from '../components/SafeImage';
import { Reveal } from '../components/Motion';
import { WHATSAPP_NUMBER } from '../constants';

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
    <div className="bg-brand-bg min-h-screen pt-36 pb-28 px-4 md:px-6">
      <div className="max-w-7xl mx-auto">
        {/* HEADER */}
        <Reveal>
          <div className="mb-14 max-w-3xl">
            <p className="eyebrow text-[#3D8593] mb-4">Sourcing Intelligence</p>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tighter mb-5 leading-[1.02]">
              Guides &amp; <span className="heading-accent italic font-light text-[#3D8593]">market insights.</span>
            </h1>
            <p className="text-gray-500 font-light text-lg leading-relaxed">
              Market updates, logistics guides and everything you need to know about importing to Kenya.
            </p>
          </div>
        </Reveal>

        {/* BLOG GRID */}
        {blogs.length > 0 && (
          <div className="grid md:grid-cols-2 gap-8 md:gap-10 mb-24">
            {blogs.map((blog, idx) => (
              <Reveal key={blog.id} delay={(idx % 2) * 130}>
                <article className="group cursor-pointer">
                  <div className="aspect-[16/9] rounded-[1.75rem] overflow-hidden mb-6 border border-gray-100 relative">
                    <SafeImage
                      src={blog.imageUrl}
                      className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
                      alt={blog.title}
                    />
                    <div className="absolute top-5 left-5 bg-white/90 backdrop-blur-md px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest text-[#3D8593]">
                      {blog.category}
                    </div>
                  </div>
                  <div className="px-1">
                    <div className="flex items-center gap-4 mb-3 text-[10px] font-black uppercase tracking-widest text-gray-400">
                      <span className="flex items-center gap-1.5"><Clock size={13} weight="bold" /> {blog.date}</span>
                      <span className="flex items-center gap-1.5"><User size={13} weight="bold" /> By {blog.author}</span>
                    </div>
                    <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3 group-hover:text-[#3D8593] transition-colors leading-tight tracking-tight">
                      {blog.title}
                    </h2>
                    <p className="text-gray-500 font-light leading-relaxed mb-5">
                      {blog.excerpt}
                    </p>
                    <span className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-[#3D8593] group-hover:gap-3 transition-all">
                      Read Full Article <ArrowRight size={15} weight="bold" />
                    </span>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        )}

        {/* FAQ */}
        <Reveal>
          <div className="rounded-[2rem] bg-white border border-gray-100 shadow-xl shadow-teal-900/5 p-8 md:p-14">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-16">
              <div>
                <p className="eyebrow text-[#3D8593] mb-4">Support</p>
                <h2 className="text-3xl md:text-5xl font-bold tracking-tighter mb-5 leading-[1.05]">
                  Common <span className="heading-accent italic font-light text-[#3D8593]">questions.</span>
                </h2>
                <p className="text-gray-500 font-light leading-relaxed mb-8">
                  Can't find what you're looking for? My AI assistant or I are always ready to help.
                </p>

                <div className="relative mb-8">
                  <MagnifyingGlass size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  <input
                    type="search"
                    placeholder="Search questions…"
                    className="w-full h-14 bg-brand-bg border border-gray-200 rounded-full pl-12 pr-6 text-sm font-medium focus:border-[#3D8593] outline-none transition-colors"
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    aria-label="Search FAQs"
                  />
                </div>

                <div className="relative overflow-hidden p-7 rounded-[1.5rem] bg-[#0f1a1c] text-white">
                  <ChatCircleDots size={36} weight="duotone" className="text-[#7fc2ce] mb-5" />
                  <h4 className="text-lg font-bold mb-2">Still need help?</h4>
                  <p className="text-white/55 text-sm font-light mb-7">Get a personal answer straight from me on WhatsApp.</p>
                  <a
                    href={`https://wa.me/${WHATSAPP_NUMBER}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2.5 w-full py-3.5 bg-white text-[#0f1a1c] rounded-full font-black uppercase text-[10px] tracking-widest hover:bg-[#25D366] hover:text-white transition-colors"
                  >
                    <WhatsappLogo size={16} weight="fill" /> Contact Support
                  </a>
                </div>
              </div>

              <div className="space-y-3">
                {filteredFaqs.map((faq) => {
                  const isOpen = activeFaq === faq.id;
                  return (
                    <div key={faq.id} className={`border rounded-[1.25rem] overflow-hidden transition-all ${isOpen ? 'border-[#3D8593]/30 shadow-lg shadow-teal-900/5' : 'border-gray-100 hover:border-[#3D8593]/20'}`}>
                      <button
                        onClick={() => setActiveFaq(isOpen ? null : faq.id)}
                        aria-expanded={isOpen}
                        className="w-full px-6 py-5 flex justify-between items-center gap-4 text-left hover:bg-brand-bg/60 transition-colors"
                      >
                        <span className="font-bold text-gray-900 leading-snug">{faq.question}</span>
                        <CaretDown size={18} weight="bold" className={`shrink-0 transition-all duration-300 ${isOpen ? 'rotate-180 text-[#3D8593]' : 'text-gray-300'}`} />
                      </button>
                      <div className={`grid transition-all duration-300 ease-out ${isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                        <div className="overflow-hidden">
                          <p className="px-6 pb-6 text-gray-500 font-light leading-relaxed">{faq.answer}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {filteredFaqs.length === 0 && (
                  <p className="text-gray-400 font-light py-8 text-center">No questions match "{filter}".</p>
                )}
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </div>
  );
};

export default Blogs;
