import React from "react";

export default function AuthLayout({ icon: Icon, title, subtitle, footer, children, compact = false }) {
  return (
    <div className={`min-h-screen flex flex-col items-center ${compact ? "justify-center py-6" : "justify-start pt-[8vh] sm:pt-[10vh]"} bg-brand-navy px-4`}>
      <div className="w-full max-w-md">
        <div className={`text-center ${compact ? "mb-3" : "mb-6"}`}>
          <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-brand-teal ${compact ? "mb-2" : "mb-4"}`}>
            <span className="text-2xl font-bold text-brand-navy">F</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white">FADS AI</h1>
          <p className="text-brand-teal/80 text-sm font-medium mt-1">Business Suite</p>
        </div>
        <div className={`bg-card rounded-2xl shadow-xl border border-border ${compact ? "p-6" : "p-8"}`}>
          {Icon && (
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-brand-mint mb-4">
              <Icon className="w-6 h-6 text-brand-teal" aria-hidden="true" />
            </div>
          )}
          <h2 className="text-2xl font-semibold text-brand-navy mb-1">{title}</h2>
          {subtitle && <p className={`text-muted-foreground text-sm ${compact ? "mb-4" : "mb-6"}`}>{subtitle}</p>}
          {children}
        </div>
        {footer && <p className={`text-center text-sm text-white/60 ${compact ? "mt-4" : "mt-6"}`}>{footer}</p>}
      </div>
    </div>
  );
}