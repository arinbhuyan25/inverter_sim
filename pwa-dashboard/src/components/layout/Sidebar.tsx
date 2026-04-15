import Link from 'next/link';
import { LayoutDashboard, Activity, Bell, Zap } from 'lucide-react';

export const Sidebar = () => {
    const navItems = [
        { icon: <LayoutDashboard size={20} />, label: 'Overview', href: '/' },
        { icon: <Activity size={20} />, label: 'Diagnosis', href: '/diagnosis' },
        { icon: <Bell size={20} />, label: 'Alerts', href: '/alerts' },
    ];

    return (
        <aside className="fixed left-0 top-0 h-full w-20 md:w-64 glass border-r border-white/5 z-50 transition-all duration-300">
            {/* Subtle glow behind logo */}
            <div className="absolute top-0 left-0 w-full h-32 bg-primary/10 blur-3xl -z-10 pointer-events-none" />

            <div className="flex h-20 items-center gap-3 px-6 border-b border-white/5">
                <div className="bg-primary/20 p-2.5 rounded-xl shadow-[0_0_15px_rgba(14,165,233,0.3)]">
                    <Zap size={24} className="text-primary glow-text" />
                </div>
                <span className="font-bold text-xl hidden md:block tracking-[0.2em] text-white glow-text">A.R.M.S</span>
            </div>

            <nav className="mt-8 px-4 space-y-3">
                {navItems.map((item) => (
                    <Link
                        key={item.href}
                        href={item.href}
                        className="flex items-center gap-4 px-4 py-3.5 rounded-2xl hover:bg-white/5 hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] transition-all duration-300 text-muted-foreground hover:text-white group relative overflow-hidden"
                    >
                        {/* Hover glow effect background */}
                        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        
                        <div className="group-hover:text-primary transition-colors z-10">
                            {item.icon}
                        </div>
                        <span className="font-medium hidden md:block tracking-wide z-10">{item.label}</span>
                    </Link>
                ))}
            </nav>
        </aside>
    );
};
