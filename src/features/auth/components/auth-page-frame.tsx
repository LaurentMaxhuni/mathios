import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AuthView } from "@neondatabase/auth-ui";
import { BrandMark } from "@/components/shared/brand-mark";

export function AuthPageFrame({
  path,
  eyebrow,
  title,
  description,
}: {
  path: string;
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="auth-page">
      <div className="auth-page-grid">
        <section className="auth-page-intro" aria-labelledby="auth-page-title">
          <Link href="/" className="auth-page-brand" aria-label="Mathios home">
            <BrandMark className="auth-page-brand-mark" priority />
            <span className="auth-page-brand-name">Mathios</span>
          </Link>
          <p className="auth-page-eyebrow">{eyebrow}</p>
          <h1 id="auth-page-title">{title}</h1>
          <p className="auth-page-description">{description}</p>
          <Link href="/" className="auth-page-back-link">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to Mathios
          </Link>
        </section>

        <section className="auth-page-form" aria-label="Account form">
          <AuthView path={path} />
        </section>
      </div>
    </div>
  );
}
