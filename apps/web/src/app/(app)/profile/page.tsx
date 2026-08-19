import type { Metadata } from 'next';
import { ProfileContent } from '@/components/owner/profile/profile-content';

export const metadata: Metadata = {
  title: 'Profil Merchant | Jagoan POS',
  description: 'Informasi akun merchant dan data pemilik toko Jagoan POS.',
};

export default function ProfilePage() {
  return <ProfileContent />;
}
