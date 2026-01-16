'use client';

import React, { useState } from 'react';
import { useUIStore } from '@/store/uiStore';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/services/api';

export const SubscriptionModal = () => {
    const { subscriptionModalOpen, setSubscriptionModalOpen } = useUIStore();
    const { user, refreshUser } = useAuth();
    const [loading, setLoading] = useState(false);

    if (!subscriptionModalOpen) return null;

    const handleUpgrade = async () => {
        setLoading(true);
        try {
            // Create mock checkout session
            const response = await api.post<{ session_id: string; checkout_url: string }>('/payment/create-checkout-session', {
                price_id: 'price_premium_monthly'
            });

            const { session_id, checkout_url } = response;

            // For this mock, we simulate the user "paying" immediately by calling success
            // In real life, we'd redirect to checkout_url
            // window.location.href = checkout_url;

            // Simulate successful payment webhook
            await api.post(`/payment/mock-success?session_id=${session_id}`, {});

            // Refresh user to get new subscription status
            await refreshUser();

            setSubscriptionModalOpen(false);

            // Show success message (using alert for now, or could use a toast if available)
            alert("Successfully upgraded to Premium! You can now generate unlimited courses.");

        } catch (error) {
            console.error("Upgrade failed:", error);
            alert("Upgrade failed. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={() => setSubscriptionModalOpen(false)}
            />

            <div className="relative w-full max-w-4xl bg-[#0f1115] border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-fade-in-up">
                {/* Decorator */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" />

                <div className="grid grid-cols-1 md:grid-cols-2">
                    {/* Free Plan */}
                    <div className="p-8 border-r border-white/5 bg-white/5">
                        <h3 className="text-xl font-medium text-white/70 mb-2">Current Plan</h3>
                        <h2 className="text-3xl font-bold text-white mb-6">Free Access</h2>

                        <ul className="space-y-4 mb-8">
                            <li className="flex items-center text-white/70">
                                <span className="w-5 h-5 mr-3 text-red-400 flex items-center justify-center">✕</span>
                                Limited course generations (5 total)
                            </li>
                            <li className="flex items-center text-white/70">
                                <span className="w-5 h-5 mr-3 text-red-400 flex items-center justify-center">✕</span>
                                Basic AI capabilities
                            </li>
                            <li className="flex items-center text-white/70">
                                <span className="w-5 h-5 mr-3 text-red-400 flex items-center justify-center">✕</span>
                                Standard support
                            </li>
                            <li className="flex items-center text-white/70">
                                <span className="w-5 h-5 mr-3 text-red-400 flex items-center justify-center">✕</span>
                                No PDF export
                            </li>
                        </ul>

                        <div className="mt-auto">
                            <button
                                onClick={() => setSubscriptionModalOpen(false)}
                                className="w-full py-3 px-6 rounded-xl border border-white/10 text-white/70 hover:bg-white/5 transition-colors"
                            >
                                Maybe Later
                            </button>
                        </div>
                    </div>

                    {/* Premium Plan */}
                    <div className="p-8 relative overflow-hidden group">
                        {/* Background Glow */}
                        <div className="absolute -top-20 -right-20 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl group-hover:bg-purple-500/30 transition-all duration-500" />

                        <div className="relative z-10">
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-xl font-medium text-purple-400">Premium</h3>
                                <span className="px-3 py-1 text-xs font-bold text-white bg-gradient-to-r from-purple-500 to-pink-500 rounded-full">
                                    MOST POPULAR
                                </span>
                            </div>

                            <h2 className="text-3xl font-bold text-white mb-1">$19<span className="text-lg text-white/50 font-normal">/month</span></h2>
                            <p className="text-white/50 text-sm mb-6">Unleash the full potential of AI teaching.</p>

                            <ul className="space-y-4 mb-8">
                                <li className="flex items-center text-white">
                                    <span className="w-5 h-5 mr-3 text-green-400 flex items-center justify-center">✓</span>
                                    <strong>Unlimited</strong> course generations
                                </li>
                                <li className="flex items-center text-white">
                                    <span className="w-5 h-5 mr-3 text-green-400 flex items-center justify-center">✓</span>
                                    Advanced GPT-4 Models
                                </li>
                                <li className="flex items-center text-white">
                                    <span className="w-5 h-5 mr-3 text-green-400 flex items-center justify-center">✓</span>
                                    Priority 24/7 Support
                                </li>
                                <li className="flex items-center text-white">
                                    <span className="w-5 h-5 mr-3 text-green-400 flex items-center justify-center">✓</span>
                                    Export to PDF & LMS (Moodle)
                                </li>
                                <li className="flex items-center text-white">
                                    <span className="w-5 h-5 mr-3 text-green-400 flex items-center justify-center">✓</span>
                                    Private Community Access
                                </li>
                            </ul>

                            <button
                                onClick={handleUpgrade}
                                disabled={loading}
                                className="w-full py-3 px-6 rounded-xl bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white font-bold shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? 'Processing...' : 'Upgrade Now'}
                            </button>

                            <p className="mt-4 text-center text-xs text-white/30">
                                Secure payment via Stripe (Mock). Cancel anytime.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
