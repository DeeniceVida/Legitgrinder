import React, { useState } from 'react';
import { Mail, Lock, User, Phone, MapPin, Eye, EyeOff, CheckCircle2, Loader2 } from 'lucide-react';
import { supabase } from '../src/lib/supabase';

interface SignupProps {
    onSignupSuccess: () => void;
}

const Signup: React.FC<SignupProps> = ({ onSignupSuccess }) => {
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        password: '',
        phone: '',
        location: '',
        importNeeds: [] as string[]
    });
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const importOptions = [
        'General Products',
        'Home Products',
        'Business Suppliers',
        'Electronics & Gadgets'
    ];

    const toggleImportNeed = (need: string) => {
        setFormData(prev => ({
            ...prev,
            importNeeds: prev.importNeeds.includes(need)
                ? prev.importNeeds.filter(n => n !== need)
                : [...prev.importNeeds, need]
        }));
    };

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            // 1. Create auth user
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: formData.email,
                password: formData.password,
            });

            if (authError) throw authError;

            if (authData.user) {
                // 2. Create profile with preferences
                const { error: profileError } = await supabase
                    .from('profiles')
                    .insert({
                        id: authData.user.id,
                        email: formData.email,
                        full_name: formData.fullName,
                        phone: formData.phone,
                        location: formData.location,
                        import_needs: formData.importNeeds,
                        role: 'user'
                    });

                if (profileError) throw profileError;

                onSignupSuccess();
            }
        } catch (err: any) {
            console.error('Signup error:', err);
            setError(err.message || 'Failed to create account');
        } finally {
            setLoading(false);
        }
    };

    return (
        type = "text"
                                value = { formData.fullName }
    onChange = {(e) => setFormData({ ...formData, fullName: e.target.value })}
required
className = "w-full pl-16 pr-6 py-4 bg-neutral-50 border border-transparent rounded-[1.5rem] outline-none focus:bg-white focus:border-neutral-200 focus:shadow-lg transition-all"
placeholder = "John Doe"
    />
                        </div >
                    </div >

    {/* Email & Phone */ }
    < div className = "grid grid-cols-1 md:grid-cols-2 gap-4" >
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-neutral-400 tracking-widest pl-4">Email</label>
                            <div className="relative">
                                <Mail className="absolute left-6 top-1/2 -translate-y-1/2 text-neutral-300 w-5 h-5" />
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    required
                                    className="w-full pl-16 pr-6 py-4 bg-neutral-50 border border-transparent rounded-[1.5rem] outline-none focus:bg-white focus:border-neutral-200 focus:shadow-lg transition-all"
                                    placeholder="you@example.com"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-neutral-400 tracking-widest pl-4">Phone</label>
                            <div className="relative">
                                <Phone className="absolute left-6 top-1/2 -translate-y-1/2 text-neutral-300 w-5 h-5" />
                                <input
                                    type="tel"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    required
                                    className="w-full pl-16 pr-6 py-4 bg-neutral-50 border border-transparent rounded-[1.5rem] outline-none focus:bg-white focus:border-neutral-200 focus:shadow-lg transition-all"
                                    placeholder="+254 700 000 000"
                                />
                            </div>
                        </div>
                    </div >

    {/* Location */ }
    < div className = "space-y-2" >
                        <label className="text-[10px] font-black uppercase text-neutral-400 tracking-widest pl-4">Location</label>
                        <div className="relative">
                            <MapPin className="absolute left-6 top-1/2 -translate-y-1/2 text-neutral-300 w-5 h-5" />
                            <input
                                type="text"
                                value={formData.location}
                                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                required
                                className="w-full pl-16 pr-6 py-4 bg-neutral-50 border border-transparent rounded-[1.5rem] outline-none focus:bg-white focus:border-neutral-200 focus:shadow-lg transition-all"
                                placeholder="Nairobi, Kenya"
                            />
                        </div>
                    </div >

    {/* Password */ }
    < div className = "space-y-2" >
                        <label className="text-[10px] font-black uppercase text-neutral-400 tracking-widest pl-4">Password</label>
                        <div className="relative">
                            <Lock className="absolute left-6 top-1/2 -translate-y-1/2 text-neutral-300 w-5 h-5" />
                            <input
                                type={showPassword ? "text" : "password"}
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                required
                                className="w-full pl-16 pr-16 py-4 bg-neutral-50 border border-transparent rounded-[1.5rem] outline-none focus:bg-white focus:border-neutral-200 focus:shadow-lg transition-all"
                                placeholder="••••••••"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-6 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition-colors"
                            >
                                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>
                    </div >

    {/* Import Needs */ }
    < div className = "space-y-3" >
                        <label className="text-[10px] font-black uppercase text-neutral-400 tracking-widest pl-4">Import Interests</label>
                        <div className="grid grid-cols-2 gap-3">
                            {importOptions.map((option) => (
                                <button
                                    key={option}
                                    type="button"
                                    onClick={() => toggleImportNeed(option)}
                                    className={`p-4 rounded-2xl border-2 text-sm font-medium transition-all ${formData.importNeeds.includes(option)
                                            ? 'border-[#FF9900] bg-[#FF9900]/10 text-[#FF9900]'
                                            : 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300'
                                        }`}
                                >
                                    <div className="flex items-center gap-2">
                                        {formData.importNeeds.includes(option) && <CheckCircle2 className="w-4 h-4" />}
                                        <span>{option}</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div >

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-5 bg-[#FF9900] text-white rounded-[1.5rem] font-bold uppercase tracking-widest hover:bg-orange-600 transition-colors shadow-xl shadow-[#FF9900]/20 disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center gap-3 mt-8"
                    >
                        {loading && <Loader2 className="w-5 h-5 animate-spin" />}
                        {loading ? 'Creating Account...' : 'Create Account'}
                    </button>

                    <p className="text-center text-sm text-neutral-500 mt-6">
                        Already have an account?{' '}
                        <button
                            type="button"
                            onClick={() => window.location.href = '/login'}
                            className="text-[#FF9900] font-bold hover:underline"
                        >
                            Sign In
                        </button>
                    </p>
                </form >
            </div >
        </div >
    );
};

export default Signup;
