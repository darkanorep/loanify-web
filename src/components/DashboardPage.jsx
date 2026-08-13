import Logo from "./Logo";

export default function DashboardPage() {
    return (
        <div className="flex min-h-dvh w-full flex-col items-center justify-center gap-4 bg-background px-4 text-center">
            <Logo />
            <h1 className="text-2xl font-bold text-foreground">You're logged in.</h1>
            <p className="max-w-sm text-sm text-muted-foreground">
                This is a placeholder — replace it with your actual authenticated
                dashboard once that's ready to build.
            </p>
        </div>
    );
}