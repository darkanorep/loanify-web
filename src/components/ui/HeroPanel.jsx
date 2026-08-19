import { ShieldCheck, Zap, TrendingUp } from "lucide-react";

const defaultFeatures = [
    { icon: Zap, text: "Approvals in under 5 minutes" },
    { icon: ShieldCheck, text: "Bank-level 256-bit encryption" },
    { icon: TrendingUp, text: "Rates that improve as you repay" },
];

export default function HeroPanel({
                                      className = "",
                                      title = (
                                          <>
                                              Smarter loans, <span className="text-accent">start here.</span>
                                          </>
                                      ),
                                      subtitle = "Manage applications, track repayments, and see your full loan history in one place.",
                                      features = defaultFeatures,
                                      showStatCard = true,
                                  }) {
    return (
        <div
            className={`relative hidden flex-col overflow-hidden bg-primary md:flex ${className}`}
        >
            {/* Oversized, low-opacity brand mark watermark — quiet texture, not decoration */}
            <div className="pointer-events-none absolute -bottom-24 -right-24 flex h-[28rem] w-[28rem] items-end justify-center gap-3 opacity-[0.06]">
                <span className="h-40 w-14 rounded-2xl bg-primary-foreground" />
                <span className="h-64 w-14 rounded-2xl bg-primary-foreground" />
                <span className="h-96 w-14 rounded-2xl bg-accent" />
            </div>

            <div className="relative z-10 p-10 lg:p-14">
                <p
                    className="animate-page-enter text-3xl font-bold tracking-tight text-primary-foreground"
                    style={{ animationDelay: "0ms" }}
                >
                    loan<span className="text-accent">ify</span>
                </p>
            </div>

            <div className="relative z-10 flex flex-1 flex-col justify-center px-10 lg:px-14">
                <h1
                    className="animate-page-enter max-w-md text-4xl font-bold leading-tight text-primary-foreground lg:text-5xl"
                    style={{ animationDelay: "80ms" }}
                >
                    {title}
                </h1>
                <p
                    className="animate-page-enter mt-4 max-w-sm text-sm text-primary-foreground/70"
                    style={{ animationDelay: "180ms" }}
                >
                    {subtitle}
                </p>

                <ul className="mt-8 space-y-3">
                    {features.map(({ icon: Icon, text }, i) => (
                        <li
                            key={text}
                            className="animate-page-enter flex items-center gap-3 text-sm text-primary-foreground/85"
                            style={{ animationDelay: `${280 + i * 80}ms` }}
                        >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-foreground/10">
                <Icon className="h-4 w-4 text-accent" />
              </span>
                            {text}
                        </li>
                    ))}
                </ul>
            </div>

            {/* Floating stat card — echoes the logo's bar-chart mark */}
            {showStatCard && (
                <div
                    className="animate-page-enter relative z-10 mb-10 ml-10 mr-10 lg:mb-14 lg:ml-14"
                    style={{ animationDelay: `${280 + features.length * 80 + 100}ms` }}
                >
                    <div className="max-w-xs rounded-2xl border border-primary-foreground/10 bg-primary-foreground/[0.06] p-5 backdrop-blur-sm">
                        <p className="text-xs font-medium text-primary-foreground/60">
                            Total repaid this year
                        </p>
                        <p className="mt-1 text-2xl font-bold text-primary-foreground">
                            $12,480
                        </p>
                        <div className="mt-4 flex items-end gap-1.5">
                            {[40, 65, 50, 80, 60, 95, 70].map((h, i) => (
                                <span
                                    key={i}
                                    className="flex-1 rounded-sm bg-accent/80"
                                    style={{ height: `${h * 0.4}px` }}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}