import React, { useState, useEffect } from 'react';
import { supabase } from '../src/lib/supabase';
import { ArrowLeft, Calendar, User, Clock } from 'lucide-react';

interface BlogsProps {
    onNavigate: (page: string) => void;
}

const Blogs: React.FC<BlogsProps> = ({ onNavigate }) => {
    const [blogs, setBlogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchBlogs = async () => {
            setLoading(true);
            const { data } = await supabase.from('blogs').select('*').order('created_at', { ascending: false });
            if (data) setBlogs(data);
            setLoading(false);
        };
        fetchBlogs();
    }, []);

    return (
        <div className="min-h-screen bg-white pt-24 pb-12 px-6">
            <div className="max-w-4xl mx-auto">
                <button
                    onClick={() => onNavigate('home')}
                    className="flex items-center gap-2 text-neutral-400 hover:text-neutral-900 transition-colors mb-10 font-bold uppercase text-xs tracking-widest"
                >
                    <ArrowLeft className="w-4 h-4" /> Back to Home
                </button>

                <div className="text-center mb-16">
                    <h1 className="text-5xl font-bold tracking-tight mb-6">Market Insights</h1>
                    <p className="text-neutral-400 text-lg max-w-2xl mx-auto">Deep dives into global logistics, tech trends, and import strategies.</p>
                </div>

                <div className="space-y-12">
                    {loading ? (
                        <p className="text-center text-neutral-400 animate-pulse">Loading insights...</p>
                    ) : blogs.map((blog) => (
                        <div key={blog.id} className="bg-white rounded-[3rem] p-10 border border-neutral-100 shadow-sm hover:shadow-xl transition-all duration-500 group">
                            <div className="flex items-center gap-6 mb-8 text-xs font-bold uppercase tracking-widest text-neutral-400">
                                <span className="flex items-center gap-2 text-[#3B8392]"><Calendar className="w-4 h-4" /> {new Date(blog.created_at).toLocaleDateString()}</span>
                                {blog.author && <span className="flex items-center gap-2"><User className="w-4 h-4" /> {blog.author}</span>}
                                <span className="flex items-center gap-2"><Clock className="w-4 h-4" /> 5 min read</span>
                            </div>

                            <h2 className="text-3xl font-bold mb-6 group-hover:text-[#3B8392] transition-colors leading-tight">{blog.title}</h2>

                            <div className="prose prose-lg text-neutral-500 font-light leading-relaxed mb-8">
                                {blog.content ? (
                                    blog.content.split('\n').map((paragraph: string, i: number) => (
                                        <p key={i}>{paragraph}</p>
                                    ))
                                ) : (
                                    <p>{blog.excerpt}</p>
                                )}
                            </div>
                        </div>
                    ))}

                    {!loading && blogs.length === 0 && (
                        <div className="text-center py-20 bg-neutral-50 rounded-[3rem]">
                            <p className="text-neutral-400 font-bold">No articles published yet.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Blogs;
