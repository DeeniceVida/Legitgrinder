import React, { useState, useEffect } from 'react';
import { Book, Lock, Unlock, ArrowRight, Download, BookOpen, Search, ShoppingBag } from 'lucide-react';
import { EBook, OrderStatus } from '../types';
import { fetchEBooks, fetchUserPurchasedBooks, createInvoice, verifyPaystackPayment, recordBookPurchase } from '../services/supabaseData';
import { supabase } from '../lib/supabase';
import { PaystackButton } from 'react-paystack';
import SafeImage from '../components/SafeImage';

const Books: React.FC = () => {
    const [books, setBooks] = useState<EBook[]>([]);
    const [purchasedBookIds, setPurchasedBookIds] = useState<string[]>([]);
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedBook, setSelectedBook] = useState<EBook | null>(null);
    const [readingBook, setReadingBook] = useState<EBook | null>(null);

    const PAYSTACK_PUBLIC_KEY = 'pk_live_b11692e8994766a02428b1176fc67f4b8b958974';

    useEffect(() => {
        const init = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            setUser(session?.user || null);

            const ebooks = await fetchEBooks();
            setBooks(ebooks);

            if (session?.user) {
                const purchases = await fetchUserPurchasedBooks(session.user.id);
                setPurchasedBookIds(purchases);
            }
            setLoading(false);
        };
        init();
    }, []);

    const handlePaystackSuccess = async (response: any, book: EBook) => {
        if (!user) return;

        try {
            // 1. Verify Payment
            const verification = await verifyPaystackPayment(response.reference);

            // 2. record purchase in DB
            await recordBookPurchase(user.id, book.id);

            // 3. Update local state
            setPurchasedBookIds([...purchasedBookIds, book.id]);

            // 4. Create Invoice for record keeping
            await createInvoice({
                userId: user.id,
                clientName: user.user_metadata?.full_name || user.email,
                productName: `eBook: ${book.title}`,
                quantity: 1,
                totalKES: book.discountPriceKES || book.priceKES,
                isPaid: true,
                status: OrderStatus.DELIVERED,
                paystackReference: response.reference
            });

            alert(`Success! "${book.title}" is now unlocked.`);
        } catch (error) {
            console.error('Error processing book purchase:', error);
        }
    };

    const filteredBooks = books.filter(b =>
        b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.author.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (readingBook) {
        return (
            <div className="bg-white min-h-screen pt-24 px-6 md:px-12 pb-32">
                <div className="max-w-4xl mx-auto">
                    <button
                        onClick={() => setReadingBook(null)}
                        className="mb-12 text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 hover:text-black flex items-center gap-2"
                    >
                        ← Back to Library
                    </button>

                    <div className="mb-16">
                        <h1 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tighter mb-4">{readingBook.title}</h1>
                        <p className="text-sm font-black text-[#3D8593] uppercase tracking-widest">by {readingBook.author}</p>
                    </div>

                    <div className="prose prose-lg max-w-none text-gray-700 leading-relaxed font-medium"
                        dangerouslySetInnerHTML={{ __html: readingBook.content }} />

                    <div className="mt-20 pt-10 border-t border-neutral-100 flex justify-between items-center">
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">You have reached the end of this digital copy.</p>
                        {readingBook.pdfUrl && (
                            <a href={readingBook.pdfUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-[#3D8593] hover:underline">
                                <Download className="w-4 h-4" /> Download PDF
                            </a>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-[#FBFBFA] min-h-screen pt-32 pb-32">
            <div className="max-w-7xl mx-auto px-6">
                <header className="mb-20">
                    <h1 className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-400 mb-4">The Knowledge Hub</h1>
                    <h2 className="text-5xl md:text-7xl font-bold text-gray-900 tracking-tighter leading-tight mb-8">Importation <span className="text-[#3D8593]">Masterclass</span>.</h2>

                    <div className="relative max-w-2xl group">
                        <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none">
                            <Search className="w-5 h-5 text-gray-400" />
                        </div>
                        <input
                            type="text"
                            placeholder="Search by title or author..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full h-16 bg-white border border-neutral-100 rounded-2xl pl-16 pr-6 text-sm font-medium focus:outline-none focus:ring-4 focus:ring-[#3D8593]/5 transition-all shadow-sm"
                        />
                    </div>
                </header>

                {loading ? (
                    <div className="grid md:grid-cols-3 gap-10">
                        {[1, 2, 3].map(i => <div key={i} className="aspect-[3/4] bg-neutral-100 animate-pulse rounded-[2.5rem]" />)}
                    </div>
                ) : (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-10">
                        {filteredBooks.map((book) => {
                            const isPurchased = purchasedBookIds.includes(book.id);
                            return (
                                <div key={book.id} className="bg-white rounded-[3rem] p-8 border border-neutral-100 shadow-sm hover:shadow-2xl transition-all group flex flex-col h-full">
                                    <div className="relative aspect-[3/4] rounded-[2rem] overflow-hidden mb-8 shadow-xl">
                                        <SafeImage src={book.coverImage} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" />
                                        <div className="absolute top-6 right-6">
                                            {isPurchased ? (
                                                <div className="w-10 h-10 bg-green-500 text-white rounded-full flex items-center justify-center shadow-lg"><Unlock className="w-4 h-4" /></div>
                                            ) : (
                                                <div className="w-10 h-10 bg-black/50 backdrop-blur-md text-white rounded-full flex items-center justify-center shadow-lg"><Lock className="w-4 h-4" /></div>
                                            )}
                                        </div>
                                    </div>

                                    <h3 className="text-2xl font-bold text-gray-900 tracking-tight mb-2 truncate">{book.title}</h3>
                                    <p className="text-[10px] font-black uppercase text-[#3D8593] tracking-widest mb-4">by {book.author}</p>
                                    <p className="text-sm text-gray-500 font-medium leading-relaxed mb-8 line-clamp-3">{book.description}</p>

                                    <div className="mt-auto pt-8 border-t border-neutral-50 flex items-center justify-between">
                                        {!isPurchased ? (
                                            <>
                                                <div>
                                                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">One-time Access</p>
                                                    <p className="text-xl font-black text-gray-900">KES {(book.discountPriceKES || book.priceKES).toLocaleString()}</p>
                                                </div>
                                                {user ? (
                                                    <PaystackButton
                                                        className="px-6 h-12 bg-black text-white rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-[#3D8593] transition-all"
                                                        publicKey={PAYSTACK_PUBLIC_KEY}
                                                        amount={Math.round((book.discountPriceKES || book.priceKES) * 100)}
                                                        currency="KES"
                                                        email={user.email}
                                                        text="Buy Book"
                                                        onSuccess={(ref: any) => handlePaystackSuccess(ref, book)}
                                                    />
                                                ) : (
                                                    <button onClick={() => alert('Please login to purchase books.')} className="px-6 h-12 bg-black text-white rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-neutral-800 transition-all flex items-center gap-2">
                                                        Login to Buy
                                                    </button>
                                                )}
                                            </>
                                        ) : (
                                            <button
                                                onClick={() => setReadingBook(book)}
                                                className="w-full h-14 bg-[#3D8593] text-white rounded-2xl font-black uppercase text-[11px] tracking-widest hover:bg-black transition-all flex items-center justify-center gap-3"
                                            >
                                                <BookOpen className="w-4 h-4" /> Read Online Now
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Books;
