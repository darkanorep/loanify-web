export default function Logo({ className = "" }) {
    return (
        <div className={`flex items-center gap-3 ${className}`}>
            <div className="flex h-14 w-14 shrink-0 items-end justify-center gap-[3px] rounded-2xl bg-primary p-3">
                <span className="h-4 w-[5px] rounded-sm bg-primary-foreground/90" />
                <span className="h-6 w-[5px] rounded-sm bg-primary-foreground/90" />
                <span className="h-8 w-[5px] rounded-sm bg-accent" />
            </div>
            <p className="text-3xl font-bold tracking-tight text-foreground">
                loan<span className="text-accent">ify</span>
            </p>
        </div>
    );
}