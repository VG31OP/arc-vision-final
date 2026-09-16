import { UserAuthForm } from "@/components/auth/AuthForm";
import Logo from "@/components/Logo";
import { ThemeProvider } from "@/context/theme-provider";
import "@/utils/i18n";
import { LanguageProvider } from "@/context/language-provider";

function LoginPage() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="frigate-ui-theme">
      <LanguageProvider>
        <div className="size-full overflow-hidden">
          <div className="p-8">
            <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
              <div className="flex flex-col items-center space-y-2 text-center">
                <Logo className="mb-2 h-10 w-10 text-sky-500" />
                <h1 className="text-2xl font-bold tracking-tight text-foreground font-mono">ARC VISION</h1>
                <p className="text-xs text-sky-400 font-semibold uppercase tracking-wider">Intelligent Surveillance Platform</p>
                <p className="text-[11px] text-muted-foreground italic">See More. Know Faster. Act Smarter.</p>
              </div>
              <UserAuthForm />
            </div>
          </div>
        </div>
      </LanguageProvider>
    </ThemeProvider>
  );
}

export default LoginPage;
