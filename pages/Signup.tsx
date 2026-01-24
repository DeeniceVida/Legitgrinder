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
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: formData.email,
                password: formData.password,
            });

            if (authError) throw authError;

            if (authData.user) {
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
        <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-3xl p-10 shadow-2xl">
                <div className="text-center mb-8">
                    <img
                        src="https://res.cloudinary.com/dsthpp4oj/image/upload/v1766830586/legitGrinder_PNG_3x-100_oikrja.jpg"
                        alt="LegitGrinder"
                        className="h-12 w-auto mx-auto mb-4 rounded-lg"
                    />
                    <h1 className="text-3xl font-bold text-neutral-900 mb-2">Create your account</h1>
                    <p className="text-neutral-500 text-sm">Start importing with confidence</p>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                        <strong>Error:</strong> {error}
                    </div>
                )}

                <form onSubmit={handleSignup} className="space-y-4">
                    <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-[#FF9900] w-5 h-5" />
                        <input
                            type="text"
                            value={formData.fullName}
                            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                            required
                            className="w-full pl-12 pr-4 py-3 bg-neutral-50 border-2 border-transparent rounded-xl outline-none focus:border-[#FF9900] transition-all"
                            placeholder="Full name"
                        />
                    </div>

                    <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-[#FF9900] w-5 h-5" />
                        <input
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            required
                            className="w-full pl-12 pr-4 py-3 bg-neutral-50 border-2 border-transparent rounded-xl outline-none focus:border-[#FF9900] transition-all"
                            placeholder="Email"
                        />
                    </div>

                    <div className="relative">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-[#FF9900] w-5 h-5" />
                        <input
                            type="tel"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            required
                            className="w-full pl-12 pr-4 py-3 bg-neutral-50 border-2 border-transparent rounded-xl outline-none focus:border-[#FF9900] transition-all"
                            placeholder="Phone number"
                        />
                    </div>

                    <div className="relative">
                        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-[#FF9900] w-5 h-5" />
                        <input
                            type="text"
                            value={formData.location}
                            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                            required
                            className="w-full pl-12 pr-4 py-3 bg-neutral-50 border-2 border-transparent rounded-xl outline-none focus:border-[#FF9900] transition-all"
                            placeholder="Location (City, Country)"
                        />
                    </div>

                    <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-[#FF9900] w-5 h-5" />
                        <input
                            type={showPassword ? "text" : "password"}
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            required
                            className="w-full pl-12 pr-14 py-3 bg-neutral-50 border-2 border-transparent rounded-xl outline-none focus:border-green-600 transition-all"
                            placeholder="Password"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                        >
                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                    </div>

                    <div className="space-y-3 pt-2">
                        <p className="text-xs font-bold text-neutral-600">Import Interests (optional)</p>
                        <div className="grid grid-cols-2 gap-2">
                            {importOptions.map((option) => (
                                <button
                                    key={option}
                                    type="button"
                                    onClick={() => toggleImportNeed(option)}
                                    className={`p-3 rounded-xl text-xs font-medium transition-all ${formData.importNeeds.includes(option)
                                        ? 'bg-[#FF9900] text-white'
                                        : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                                        }`}
                                >
                                    {option}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex items-start gap-3 pt-2">
                        <input
                            type="checkbox"
                            id="terms"
                            required
                            className="mt-1 w-4 h-4 text-[#FF9900] border-neutral-300 rounded focus:ring-[#FF9900]"
                        />
                        <label htmlFor="terms" className="text-xs text-neutral-600">
                            I agree with the <a href="#" className="text-[#FF9900] font-bold hover:underline">Terms & Condition</a>
                        </label>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 bg-[#FF9900] text-white rounded-xl font-bold hover:bg-orange-600 transition-all disabled:opacity-70 flex justify-center items-center gap-3 mt-6"
                    >
                        {loading && <Loader2 className="w-5 h-5 animate-spin" />}
                        {loading ? 'Creating Account...' : 'Continue'}
                    </button>

                    <p className="text-center text-sm text-neutral-500 mt-6">
                        Already have an account?{' '}
                        <button
                            type="button"
                            onClick={() => window.location.href = '/login'}
                            className="text-[#FF9900] font-bold hover:underline"
                        >
                            Login
                        </button>
                    </p>
                </form>
            </div>
        </div>
    );
};

export default Signup;
