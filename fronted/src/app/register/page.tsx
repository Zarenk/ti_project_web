import RegisterForm from './register-form';
import TemplateNavbar from '@/templates/TemplateNavbar';

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-blue-950">
      <TemplateNavbar />
      <div className="flex items-center justify-center p-4">
        <RegisterForm />
      </div>
    </div>
  );
}