'use client';

import { useToast } from '@/components/ui/Toast';
import ProfileForm from '@/components/portal/ProfileForm';

export default function ProfilePage() {
  const { toast } = useToast();

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">Profile Settings</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Update your profile information visible to other members.</p>
      </div>

      <ProfileForm
        onSuccess={() => {}}
        onToast={(message, type) => toast(message, type)}
      />
    </div>
  );
}
