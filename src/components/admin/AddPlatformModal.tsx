import { useState, useEffect } from 'react';
import { X, Globe, Code } from 'lucide-react';
import { Button, Input, Select } from '@/components/ui';
import { supabase } from '@/services/supabase/client';

interface AffiliatePlatform {
    id: string;
    name: string;
    domains: string[];
    type: 'param_injection' | 'api_generation';
    config: any;
    is_active: boolean;
}

interface AddPlatformModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    initialData?: AffiliatePlatform | null; // For Edit Mode
}

export function AddPlatformModal({ isOpen, onClose, onSuccess, initialData }: AddPlatformModalProps) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        domains: '',
        type: 'param_injection',
        config: '{"params": {}}',
    });

    // Load initial data when editing
    useEffect(() => {
        if (isOpen && initialData) {
            setFormData({
                name: initialData.name,
                domains: initialData.domains.join(', '),
                type: initialData.type,
                config: JSON.stringify(initialData.config, null, 2),
            });
        } else if (isOpen && !initialData) {
            // Reset for Add Mode
            setFormData({
                name: '',
                domains: '',
                type: 'param_injection',
                config: '{"params": {}}',
            });
        }
    }, [isOpen, initialData]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Validate JSON
            let parsedConfig;
            try {
                parsedConfig = JSON.parse(formData.config);
            } catch (err) {
                alert('Invalid JSON format in Config');
                setLoading(false);
                return;
            }

            // Prepare payload
            const payload = {
                name: formData.name,
                domains: formData.domains.split(',').map(d => d.trim()).filter(Boolean),
                type: formData.type as 'param_injection' | 'api_generation',
                config: parsedConfig,
                // Only set default if new (don't overwrite is_active on edit)
                ...(initialData ? {} : { is_active: false })
            };

            let error;
            if (initialData) {
                // UPDATE
                const res = await supabase
                    .from('affiliate_platforms')
                    .update(payload)
                    .eq('id', initialData.id);
                error = res.error;
            } else {
                // INSERT
                const res = await supabase
                    .from('affiliate_platforms')
                    .insert(payload);
                error = res.error;
            }

            if (error) throw error;

            onSuccess();
            onClose();
            // Reset form
            setFormData({
                name: '',
                domains: '',
                type: 'param_injection',
                config: '{"params": {}}',
            });
        } catch (err) {
            console.error('Failed to add platform:', err);
            alert('Failed to add platform');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b">
                    <h3 className="text-lg font-bold text-gray-900">
                        {initialData ? '플랫폼 수정' : '제휴 플랫폼 추가'}
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <Input
                        label="플랫폼 이름"
                        placeholder="예: Coupang"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                    />

                    <Input
                        label="도메인 (쉼표로 구분)"
                        placeholder="예: coupang.com, coupang.kr"
                        leftIcon={<Globe className="w-4 h-4" />}
                        value={formData.domains}
                        onChange={(e) => setFormData({ ...formData, domains: e.target.value })}
                        required
                    />

                    <Select
                        label="연동 방식"
                        value={formData.type}
                        onChange={(val) => setFormData({ ...formData, type: val })}
                        options={[
                            { label: '파라미터 주입 (Parameter Injection)', value: 'param_injection' },
                            { label: 'API 생성 (API Generation)', value: 'api_generation' },
                        ]}
                    />

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                            설정 (JSON)
                        </label>
                        <div className="relative">
                            <Code className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                            <textarea
                                className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 outline-none transition-all font-mono"
                                rows={4}
                                value={formData.config}
                                onChange={(e) => setFormData({ ...formData, config: e.target.value })}
                            />
                        </div>
                        <p className="mt-1 text-xs text-gray-500">
                            예시: {"{\"params\": {\"tag\": \"your-tag\"}}"}
                        </p>
                    </div>

                    <div className="pt-2 flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-3 text-sm font-bold text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
                        >
                            취소
                        </button>
                        <Button
                            type="submit"
                            variant="primary"
                            className="flex-1"
                            disabled={loading}
                        >
                            {loading ? '저장 중...' : (initialData ? '수정사항 저장' : '플랫폼 추가')}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
