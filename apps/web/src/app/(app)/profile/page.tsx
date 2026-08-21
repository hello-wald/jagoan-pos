import type { Metadata } from 'next';
import { ProfileContent } from '@/components/owner/profile/profile-content';

export const metadata: Metadata = {
  title: 'Profil Merchant | POS Jagoan',
  description: 'Informasi akun merchant dan data pemilik toko POS Jagoan.',
};

export default function ProfilePage() {
  return <ProfileContent />;
}
