import { createServerAuthService } from '@orqestr/database';
import { redirect } from 'next/navigation';

export async function POST() {
  const authService = await createServerAuthService();
  await authService.signOut();
  redirect('/login');
}
