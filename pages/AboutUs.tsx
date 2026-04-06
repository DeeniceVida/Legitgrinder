import React from 'react';

const AboutUs: React.FC = () => {
  return (
    <div className="pt-32 pb-24 px-6 max-w-4xl mx-auto bg-white min-h-screen">
      <div className="text-center mb-16">
        <h1 className="text-4xl md:text-5xl font-black text-gray-900 mb-6 tracking-tight">
          About Legit Grinder Imports
        </h1>
        <p className="text-xl md:text-2xl font-light text-[#3D8593]">
          Reliable Sourcing. Seamless Delivery. Trusted by Thousands.
        </p>
      </div>

      <div className="prose prose-lg max-w-none text-gray-600 space-y-8">
        <p className="text-lg leading-relaxed">
          Founded in 2021, <strong className="text-gray-900">Legit Grinder Imports</strong> was born out of a simple necessity: making international shopping accessible, honest, and stress-free for Kenyans. We began as a small agency with a big vision, and today, we are proud to have grown into a community of over 30,000 followers across our platforms, backed by over 100+ five-star Google reviews.
        </p>

        <p className="text-lg leading-relaxed">
          We specialize in bridging the gap between global markets and your doorstep. Whether you are an individual looking for the latest gadget from the US or a company sourcing bulk inventory from China and Dubai, we handle the complexities of international logistics so you don't have to.
        </p>

        <div className="bg-teal-50 rounded-3xl p-8 my-12 border border-teal-100">
          <h3 className="text-2xl font-bold text-gray-900 mb-4">Our Goal</h3>
          <p className="text-lg leading-relaxed mb-8">
            To provide you with a smooth, "hands-off" experience. We believe that ordering from abroad should be as easy as buying from a local shop. Our team manages the sourcing, shipping, and clearing, ensuring your items arrive safely while you focus on what matters most.
          </p>

          <h3 className="text-2xl font-bold text-gray-900 mb-4">Our Mission</h3>
          <p className="text-lg leading-relaxed">
            To empower Kenyan consumers and businesses by providing transparent, honest, and dependable importing solutions that eliminate the risks of international trade.
          </p>
        </div>

        <h3 className="text-3xl font-bold text-gray-900 mb-6">Why Work With Us?</h3>
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
            <h4 className="font-bold text-xl text-[#3D8593] mb-2">Proven Track Record</h4>
            <p>With years of experience and hundreds of successful deliveries, our reputation is built on the satisfaction of our clients.</p>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
            <h4 className="font-bold text-xl text-[#3D8593] mb-2">Honesty First</h4>
            <p>We believe in clear communication and transparent pricing. No hidden fees, no surprises.</p>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
            <h4 className="font-bold text-xl text-[#3D8593] mb-2">Global Reach</h4>
            <p>We have established solid networks in China, the US, and Dubai to ensure you get the best quality products at the best prices.</p>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
            <h4 className="font-bold text-xl text-[#3D8593] mb-2">Dependability</h4>
            <p>From the moment you place your order until it's in your hands, we treat your package with the utmost priority.</p>
          </div>
        </div>

        <div className="bg-gray-900 text-white rounded-3xl p-8 md:p-12 text-center mt-16">
          <h3 className="text-3xl font-black mb-6">Connect With Us</h3>
          <p className="text-gray-300 mb-8 max-w-2xl mx-auto">
            Stay updated with our latest arrivals, client testimonials, and importing tips by following us on our socials:
          </p>
          
          <div className="flex flex-wrap justify-center gap-4 mb-10">
            <a href="https://www.tiktok.com/@legitgrinderimports" target="_blank" rel="noopener noreferrer" className="bg-white/10 hover:bg-[#3D8593] transition-colors px-6 py-3 rounded-full font-bold">TikTok</a>
            <a href="https://www.instagram.com/legitgrinder.imports" target="_blank" rel="noopener noreferrer" className="bg-white/10 hover:bg-[#3D8593] transition-colors px-6 py-3 rounded-full font-bold">Instagram</a>
            <a href="https://share.google/DDnPWrlwWvOIsYdHZ" target="_blank" rel="noopener noreferrer" className="bg-white/10 hover:bg-[#3D8593] transition-colors px-6 py-3 rounded-full font-bold">Google Reviews</a>
            <a href="https://legitgrinder.site/" target="_blank" rel="noopener noreferrer" className="bg-white/10 hover:bg-[#3D8593] transition-colors px-6 py-3 rounded-full font-bold">Website</a>
          </div>

          <div className="pt-8 border-t border-white/20">
            <h4 className="text-xl font-bold mb-2">Ready to start your importing journey?</h4>
            <p className="text-gray-300">Call/WhatsApp us today: <a href="https://wa.me/254791873538" className="text-[#FF9900] font-black text-2xl ml-2 hover:underline">0791873538</a></p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AboutUs;
