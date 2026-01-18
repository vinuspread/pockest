
import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/store/useAuthStore';

export default function AdminGuard() {
    const { user, status } = useAuthStore();
    const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

    useEffect(() => {
        if (status === 'loading') return;

        if (!user) {
            setIsAuthorized(false);
            return;
        }

        // Check if user is admin
        // 1. Check against environment variable list (comma separated)
        const adminEmails = import.meta.env.VITE_ADMIN_EMAILS?.split(',') || [];

        // 2. Or checks specific metadata if you implemented it
        // const isAdmin = user.user_metadata?.role === 'admin';

        // For now, simple email check
        const isAllowed = adminEmails.map((e: string) => e.trim()).includes(user.email);

        // 🚨 DEV MODE OVERRIDE (Optional: Remove in production)
        // if (import.meta.env.DEV) setIsAuthorized(true); else

        setIsAuthorized(isAllowed);

        if (!isAllowed) {
            console.warn(`[AdminGuard] Access denied for user: ${user.email}`);
        }

    }, [user, status]);

    if (status === 'loading' || isAuthorized === null) {
        return <div className="flex h-screen items-center justify-center">Loading...</div>;
    }

    if (!isAuthorized) {
        return <Navigate to="/dashboard" replace />;
    }

    return <Outlet />;
}
