import Image from 'next/image';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-[100dvh] lg:grid-cols-2">
      <div className="flex flex-col justify-center px-6 py-12 sm:px-12">
        <div className="mx-auto w-full max-w-[400px]">{children}</div>
      </div>
      {/* Decoration, not content: dropped entirely below lg. */}
      <div className="relative hidden lg:block">
        <Image
          src="/auth-kitchen.jpg"
          alt=""
          aria-hidden
          fill
          priority
          sizes="50vw"
          className="object-cover"
        />
      </div>
    </div>
  );
}
