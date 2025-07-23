import RegisterForm from './register-form';
import Navbar from '@/components/navbar';

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-blue-950">
      <Navbar />
      <div className="flex items-center justify-center p-4">
        <RegisterForm />
      </div>
    </div>
  );
}